//! Local terminals: a real pseudo-terminal per pane, running the user's shell. Nothing here is reachable from the
//! network; the only way in is Tauri IPC from the app's own window.
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub mod commands;
pub mod git;
pub mod shell;

#[derive(Serialize, Clone)]
pub struct SessionInfo {
    pub id: String,
    pub pid: u32,
    pub shell: String,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Serialize, Clone)]
pub struct ExitEvent {
    pub id: String,
    pub code: Option<i32>,
}

#[derive(Serialize, Clone)]
pub struct OutputEvent {
    pub id: String,
    pub data: String,
}

#[derive(Serialize, Clone)]
pub struct Foreground {
    pub pid: u32,
    pub name: String,
    pub is_shell: bool,
}

struct Session {
    info: SessionInfo,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
    shell_pid: u32,
    output: Arc<Mutex<Pending>>,
}

#[derive(Default)]
struct Pending {
    attached: bool,
    held: Vec<u8>,
}

#[derive(Default)]
pub struct PtyManager {
    sessions: Mutex<HashMap<String, Session>>,
}

pub struct SpawnOptions {
    pub shell: Option<String>,
    pub cwd: Option<String>,
    pub cols: u16,
    pub rows: u16,
    pub integration_dir: Option<PathBuf>,
}

impl PtyManager {
    pub fn spawn(&self, app: Option<AppHandle>, opts: SpawnOptions) -> Result<SessionInfo, String> {
        let shell_path = match opts.shell {
            Some(s) if !s.trim().is_empty() => s,
            _ => shell::default_shell(),
        };
        let cwd = resolve_cwd(opts.cwd.as_deref());
        let size = PtySize { rows: opts.rows.max(2), cols: opts.cols.max(10), pixel_width: 0, pixel_height: 0 };
        let pair = native_pty_system().openpty(size).map_err(|e| format!("open pty: {e}"))?;
        let mut cmd = CommandBuilder::new(&shell_path);
        cmd.cwd(&cwd);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("TERM_PROGRAM", "CSM");
        cmd.env("CSM_TERMINAL", "1");
        for key in ["CLAUDECODE", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_SSE_PORT"] {
            cmd.env_remove(key);
        }
        shell::configure(&mut cmd, &shell_path, opts.integration_dir.as_deref());
        if shell::is_interactive_login_shell(&shell_path) {
            cmd.arg("-l");
        }

        let child = pair.slave.spawn_command(cmd).map_err(|e| format!("start {}: {e}", shell_path))?;
        drop(pair.slave);
        let pid = child.process_id().unwrap_or(0);
        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
        let id = uuid::Uuid::new_v4().to_string();
        let info = SessionInfo { id: id.clone(), pid, shell: shell_path.clone(), cwd: cwd.display().to_string(), cols: size.cols, rows: size.rows };

        let output = Arc::new(Mutex::new(Pending::default()));
        self.sessions.lock().unwrap().insert(id.clone(), Session { info: info.clone(), master: pair.master, writer, child, shell_pid: pid, output: output.clone() });

        // Without an app handle (tests), the caller reads the master itself.
        let Some(app) = app else {
            return Ok(info);
        };
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        std::thread::spawn(move || {
            let mut buf = [0u8; 16384];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 || tx.send(buf[..n].to_vec()).is_err() {
                    break;
                }
            }
        });
        // Output is batched for a few milliseconds so a build log does not become one IPC message per byte, and the
        // batch is flushed on a timer so the last chunk (usually the prompt) is not held until more output arrives.
        let reader_id = id.clone();
        std::thread::spawn(move || {
            let mut pending: Vec<u8> = Vec::new();
            let mut deadline: Option<Instant> = None;
            let flush = |pending: &mut Vec<u8>| {
                if pending.is_empty() {
                    return;
                }
                let mut out = output.lock().unwrap();
                if out.attached {
                    let _ = app.emit(&format!("pty://out/{reader_id}"), OutputEvent { id: reader_id.clone(), data: B64.encode(&*pending) });
                } else {
                    out.held.extend_from_slice(pending);
                }
                pending.clear();
            };
            loop {
                let wait = deadline.map(|d| d.saturating_duration_since(Instant::now())).unwrap_or(Duration::from_secs(3600));
                match rx.recv_timeout(wait) {
                    Ok(chunk) => {
                        pending.extend_from_slice(&chunk);
                        deadline.get_or_insert_with(|| Instant::now() + Duration::from_millis(8));
                        if pending.len() >= 65536 {
                            flush(&mut pending);
                            deadline = None;
                        }
                    }
                    Err(RecvTimeoutError::Timeout) => {
                        flush(&mut pending);
                        deadline = None;
                    }
                    Err(RecvTimeoutError::Disconnected) => break,
                }
            }
            flush(&mut pending);
            let _ = app.emit("pty://exit", ExitEvent { id: reader_id.clone(), code: None });
        });

        Ok(info)
    }

    /// Marks the window as listening and hands back whatever the shell printed before it was.
    pub fn attach(&self, id: &str) -> Result<Vec<u8>, String> {
        let sessions = self.sessions.lock().unwrap();
        let s = sessions.get(id).ok_or("no such terminal")?;
        let mut out = s.output.lock().unwrap();
        out.attached = true;
        Ok(std::mem::take(&mut out.held))
    }

    pub fn write(&self, id: &str, bytes: &[u8]) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let s = sessions.get_mut(id).ok_or("no such terminal")?;
        s.writer.write_all(bytes).map_err(|e| e.to_string())?;
        s.writer.flush().map_err(|e| e.to_string())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let s = sessions.get_mut(id).ok_or("no such terminal")?;
        s.master.resize(PtySize { rows: rows.max(2), cols: cols.max(10), pixel_width: 0, pixel_height: 0 }).map_err(|e| e.to_string())?;
        s.info.cols = cols;
        s.info.rows = rows;
        Ok(())
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let mut s = sessions.remove(id).ok_or("no such terminal")?;
        #[cfg(unix)]
        if s.shell_pid > 0 {
            unsafe {
                libc::killpg(s.shell_pid as i32, libc::SIGHUP);
            }
        }
        let _ = s.child.kill();
        Ok(())
    }

    pub fn list(&self) -> Vec<SessionInfo> {
        self.sessions.lock().unwrap().values().map(|s| s.info.clone()).collect()
    }

    pub fn exit_status(&self, id: &str) -> Option<Option<i32>> {
        let mut sessions = self.sessions.lock().unwrap();
        let s = sessions.get_mut(id)?;
        match s.child.try_wait() {
            Ok(Some(status)) => Some(Some(status.exit_code() as i32)),
            Ok(None) => None,
            Err(_) => Some(None),
        }
    }

    /// Reports which process group currently owns the terminal, so the app can tell a quiet shell from a running program.
    pub fn foreground(&self, id: &str) -> Result<Foreground, String> {
        let sessions = self.sessions.lock().unwrap();
        let s = sessions.get(id).ok_or("no such terminal")?;
        #[cfg(unix)]
        {
            use std::os::unix::io::AsRawFd;
            let fd = s.master.as_raw_fd().ok_or("terminal has no file descriptor")?;
            let pgid = unsafe { libc::tcgetpgrp(fd.as_raw_fd()) };
            if pgid <= 0 {
                return Ok(Foreground { pid: s.shell_pid, name: shell_name(&s.info.shell), is_shell: true });
            }
            let pid = pgid as u32;
            let name = process_name(pid).unwrap_or_else(|| shell_name(&s.info.shell));
            Ok(Foreground { pid, name, is_shell: pid == s.shell_pid })
        }
        #[cfg(not(unix))]
        {
            Ok(Foreground { pid: s.shell_pid, name: shell_name(&s.info.shell), is_shell: true })
        }
    }
}

fn shell_name(path: &str) -> String {
    Path::new(path).file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| path.to_string())
}

#[cfg(unix)]
fn process_name(pid: u32) -> Option<String> {
    let out = std::process::Command::new("ps").args(["-o", "comm=", "-p", &pid.to_string()]).output().ok()?;
    let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if name.is_empty() {
        None
    } else {
        Some(Path::new(&name).file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or(name))
    }
}

fn resolve_cwd(requested: Option<&str>) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    let candidate = match requested {
        Some(p) if !p.trim().is_empty() => {
            let p = p.trim();
            if let Some(rest) = p.strip_prefix("~/") {
                home.join(rest)
            } else if p == "~" {
                home.clone()
            } else {
                PathBuf::from(p)
            }
        }
        _ => home.clone(),
    };
    if candidate.is_dir() {
        candidate
    } else {
        home
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::sync::mpsc;

    // Output is pumped on a thread into a channel so a test can wait with a deadline instead of blocking in read().
    struct Output(mpsc::Receiver<Vec<u8>>);

    impl Output {
        fn until(&self, needle: &str, timeout: Duration) -> String {
            let deadline = Instant::now() + timeout;
            let mut out = String::new();
            loop {
                if out.contains(needle) {
                    return out;
                }
                let left = deadline.saturating_duration_since(Instant::now());
                if left.is_zero() {
                    return out;
                }
                match self.0.recv_timeout(left) {
                    Ok(chunk) => out.push_str(&String::from_utf8_lossy(&chunk)),
                    Err(_) => return out,
                }
            }
        }
    }

    fn spawn_sh(mgr: &PtyManager) -> (SessionInfo, Output) {
        let info = mgr.spawn(None, SpawnOptions { shell: Some("/bin/sh".into()), cwd: Some("/tmp".into()), cols: 80, rows: 24, integration_dir: None }).unwrap();
        let mut reader = { mgr.sessions.lock().unwrap().get(&info.id).unwrap().master.try_clone_reader().unwrap() };
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 || tx.send(buf[..n].to_vec()).is_err() {
                    break;
                }
            }
        });
        (info, Output(rx))
    }

    #[test]
    fn runs_a_real_shell_and_echoes_output() {
        let mgr = PtyManager::default();
        let (info, out) = spawn_sh(&mgr);
        assert!(info.pid > 0);
        mgr.write(&info.id, b"echo csm-$((20+22))\n").unwrap();
        let out = out.until("csm-42", Duration::from_secs(5));
        assert!(out.contains("csm-42"), "got: {out}");
        mgr.kill(&info.id).unwrap();
    }

    #[test]
    fn resize_reaches_the_program() {
        let mgr = PtyManager::default();
        let (info, out) = spawn_sh(&mgr);
        mgr.resize(&info.id, 132, 40).unwrap();
        mgr.write(&info.id, b"stty size\n").unwrap();
        let out = out.until("40 132", Duration::from_secs(5));
        assert!(out.contains("40 132"), "got: {out}");
        mgr.kill(&info.id).unwrap();
    }

    #[test]
    fn ctrl_c_interrupts_and_ctrl_d_ends_the_shell() {
        let mgr = PtyManager::default();
        let (info, out) = spawn_sh(&mgr);
        mgr.write(&info.id, b"sleep 30; echo not-interrupted\n").unwrap();
        std::thread::sleep(Duration::from_millis(300));
        let fg = mgr.foreground(&info.id).unwrap();
        assert!(!fg.is_shell, "sleep should own the terminal: {:?}", fg.name);
        mgr.write(&info.id, b"\x03").unwrap();
        std::thread::sleep(Duration::from_millis(200));
        mgr.write(&info.id, b"echo after-$((1+1))\n").unwrap();
        let out = out.until("after-2", Duration::from_secs(5));
        assert!(out.contains("after-2") && !out.contains("not-interrupted\r\nnot"), "got: {out:?}");
        mgr.write(&info.id, b"\x04").unwrap();
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(5) {
            if let Some(_) = mgr.exit_status(&info.id) {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        panic!("shell did not exit on ctrl-d");
    }

    #[test]
    fn alternate_screen_program_runs_and_restores() {
        let mgr = PtyManager::default();
        let (info, output) = spawn_sh(&mgr);
        mgr.write(&info.id, b"printf 'a\\nb\\n' | less\n").unwrap();
        let out = output.until("\x1b[?1049h", Duration::from_secs(5));
        assert!(out.contains("\x1b[?1049h"), "less should enter the alternate screen: {out:?}");
        mgr.write(&info.id, b"q").unwrap();
        let out = output.until("\x1b[?1049l", Duration::from_secs(5));
        assert!(out.contains("\x1b[?1049l"), "less should leave the alternate screen: {out:?}");
        mgr.kill(&info.id).unwrap();
    }

    #[test]
    fn unicode_and_colors_pass_through() {
        let mgr = PtyManager::default();
        let (info, out) = spawn_sh(&mgr);
        mgr.write(&info.id, "printf '\\033[38;2;255;0;0mrouge\\033[0m — ünïcödé ✓\\n'; echo 'DO''NE'\n".as_bytes()).unwrap();
        let out = out.until("DONE", Duration::from_secs(5));
        assert!(out.contains("\x1b[38;2;255;0;0mrouge") && out.contains("ünïcödé ✓"), "got: {out:?}");
        mgr.kill(&info.id).unwrap();
    }

    #[test]
    fn large_output_is_not_lost() {
        let mgr = PtyManager::default();
        let (info, out) = spawn_sh(&mgr);
        mgr.write(&info.id, b"i=0; while [ $i -lt 2000 ]; do echo line-$i; i=$((i+1)); done; echo 'EN''D-MARK'\n").unwrap();
        let out = out.until("END-MARK", Duration::from_secs(20));
        assert!(out.contains("line-1999"), "last line missing");
        mgr.kill(&info.id).unwrap();
    }

    #[test]
    fn killing_removes_the_session() {
        let mgr = PtyManager::default();
        let (info, _out) = spawn_sh(&mgr);
        assert_eq!(mgr.list().len(), 1);
        mgr.kill(&info.id).unwrap();
        assert!(mgr.list().is_empty());
        assert!(mgr.write(&info.id, b"x").is_err());
    }

    #[test]
    fn cwd_falls_back_to_home_for_missing_paths() {
        assert_eq!(resolve_cwd(Some("/definitely/not/here")), dirs::home_dir().unwrap());
        assert_eq!(resolve_cwd(Some("~")), dirs::home_dir().unwrap());
    }
}
