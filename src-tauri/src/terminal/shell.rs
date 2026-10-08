//! Shell discovery and shell integration. Integration adds a small rc hook so the shell reports its working directory and
//! prompt boundaries to the terminal (OSC 7 and OSC 133); the user's own rc files still run first.
use portable_pty::CommandBuilder;
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ShellInfo {
    pub path: String,
    pub name: String,
    pub is_default: bool,
}

pub fn default_shell() -> String {
    if let Ok(s) = std::env::var("SHELL") {
        if !s.is_empty() && Path::new(&s).exists() {
            return s;
        }
    }
    for candidate in ["/bin/zsh", "/bin/bash", "/usr/bin/fish", "/bin/sh"] {
        if Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }
    "/bin/sh".to_string()
}

pub fn available_shells() -> Vec<ShellInfo> {
    let default = default_shell();
    let mut paths: Vec<String> = Vec::new();
    if let Ok(text) = std::fs::read_to_string("/etc/shells") {
        for line in text.lines() {
            let line = line.trim();
            if !line.is_empty() && !line.starts_with('#') && Path::new(line).exists() {
                paths.push(line.to_string());
            }
        }
    }
    for extra in ["/opt/homebrew/bin/fish", "/usr/local/bin/fish", "/opt/homebrew/bin/zsh", "/opt/homebrew/bin/bash", "/usr/local/bin/bash", "/opt/homebrew/bin/nu"] {
        if Path::new(extra).exists() && !paths.iter().any(|p| p == extra) {
            paths.push(extra.to_string());
        }
    }
    if !paths.iter().any(|p| *p == default) {
        paths.insert(0, default.clone());
    }
    paths
        .into_iter()
        .map(|path| ShellInfo { name: Path::new(&path).file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| path.clone()), is_default: path == default, path })
        .collect()
}

pub fn is_interactive_login_shell(path: &str) -> bool {
    matches!(shell_kind(path), Kind::Zsh | Kind::Bash | Kind::Fish)
}

#[derive(PartialEq)]
enum Kind {
    Zsh,
    Bash,
    Fish,
    Other,
}

fn shell_kind(path: &str) -> Kind {
    match Path::new(path).file_name().and_then(|s| s.to_str()).unwrap_or("") {
        "zsh" => Kind::Zsh,
        "bash" => Kind::Bash,
        "fish" => Kind::Fish,
        _ => Kind::Other,
    }
}

pub const ZSH_INTEGRATION: &str = r#"# CSM shell integration for zsh: report the working directory and prompt boundaries to the terminal.
if [ -n "$CSM_ORIGINAL_ZDOTDIR" ]; then ZDOTDIR="$CSM_ORIGINAL_ZDOTDIR"; else unset ZDOTDIR; fi
[ -f "${ZDOTDIR:-$HOME}/.zshenv" ] && [ "${ZDOTDIR:-$HOME}/.zshenv" != "$CSM_ZDOTDIR/.zshenv" ] && source "${ZDOTDIR:-$HOME}/.zshenv"
[ -f "${ZDOTDIR:-$HOME}/.zprofile" ] && source "${ZDOTDIR:-$HOME}/.zprofile"
[ -f "${ZDOTDIR:-$HOME}/.zshrc" ] && source "${ZDOTDIR:-$HOME}/.zshrc"
[ -f "${ZDOTDIR:-$HOME}/.zlogin" ] && source "${ZDOTDIR:-$HOME}/.zlogin"
__csm_report_cwd() { printf '\e]7;file://%s%s\a' "$HOST" "$PWD"; }
__csm_precmd() { printf '\e]133;D;%s\a' "$?"; __csm_report_cwd; printf '\e]133;A\a'; printf '\e]2;%s\a' "${PWD/#$HOME/~}"; }
__csm_preexec() { printf '\e]133;C\a'; printf '\e]2;%s\a' "${1%% *}"; }
autoload -Uz add-zsh-hook
add-zsh-hook precmd __csm_precmd
add-zsh-hook preexec __csm_preexec
__csm_report_cwd
"#;

pub const BASH_INTEGRATION: &str = r#"# CSM shell integration for bash: report the working directory and prompt boundaries to the terminal.
[ -f /etc/profile ] && source /etc/profile
for f in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do [ -f "$f" ] && { source "$f"; break; }; done
[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"
__csm_report_cwd() { printf '\e]7;file://%s%s\a' "$HOSTNAME" "$PWD"; }
__csm_prompt() { local code=$?; printf '\e]133;D;%s\a' "$code"; __csm_report_cwd; printf '\e]133;A\a'; printf '\e]2;%s\a' "${PWD/#$HOME/\~}"; }
PROMPT_COMMAND="__csm_prompt${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
__csm_report_cwd
"#;

pub const FISH_INTEGRATION: &str = r#"# CSM shell integration for fish
function __csm_report_cwd --on-variable PWD; printf '\e]7;file://%s%s\a' (hostname) "$PWD"; end
function __csm_prompt --on-event fish_prompt; printf '\e]133;A\a'; printf '\e]2;%s\a' (prompt_pwd); end
function __csm_preexec --on-event fish_preexec; printf '\e]133;C\a'; end
__csm_report_cwd
"#;

/// Writes the integration files once and returns their directory.
pub fn write_integration(dir: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    std::fs::write(dir.join(".zshrc"), ZSH_INTEGRATION)?;
    std::fs::write(dir.join("bashrc"), BASH_INTEGRATION)?;
    std::fs::create_dir_all(dir.join("fish").join("conf.d"))?;
    std::fs::write(dir.join("fish").join("conf.d").join("csm.fish"), FISH_INTEGRATION)?;
    Ok(())
}

pub fn configure(cmd: &mut CommandBuilder, shell_path: &str, integration_dir: Option<&Path>) {
    let Some(dir) = integration_dir else { return };
    match shell_kind(shell_path) {
        Kind::Zsh => {
            if let Ok(original) = std::env::var("ZDOTDIR") {
                cmd.env("CSM_ORIGINAL_ZDOTDIR", original);
            }
            cmd.env("CSM_ZDOTDIR", dir);
            cmd.env("ZDOTDIR", dir);
        }
        Kind::Bash => {
            cmd.arg("--rcfile");
            cmd.arg(dir.join("bashrc"));
        }
        Kind::Fish => {
            let existing = std::env::var("XDG_DATA_DIRS").unwrap_or_default();
            cmd.env("XDG_DATA_DIRS", format!("{}{}{}", dir.display(), if existing.is_empty() { "" } else { ":" }, existing));
        }
        Kind::Other => {}
    }
}

pub fn integration_dir(app_data: &Path) -> PathBuf {
    app_data.join("shell-integration")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_shells_and_marks_the_default() {
        let shells = available_shells();
        assert!(shells.iter().any(|s| s.is_default));
        assert!(shells.iter().all(|s| Path::new(&s.path).exists()));
    }

    #[test]
    fn integration_files_are_written() {
        let dir = std::env::temp_dir().join(format!("csm-int-{}", std::process::id()));
        write_integration(&dir).unwrap();
        assert!(dir.join(".zshrc").exists() && dir.join("bashrc").exists());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
