use std::path::Path;
use std::process::Command;

/// The current branch of the repository containing `cwd`, or an empty string when there is none to report.
#[tauri::command]
pub fn git_branch(cwd: String) -> String {
    if !Path::new(&cwd).is_dir() {
        return String::new();
    }
    let out = Command::new("git").args(["-C", &cwd, "branch", "--show-current"]).output();
    match out {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => String::new(),
    }
}
