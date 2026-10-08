use super::{Foreground, PtyManager, SessionInfo, SpawnOptions};
use super::shell::{self, ShellInfo};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn pty_spawn(app: AppHandle, state: State<'_, PtyManager>, shell: Option<String>, cwd: Option<String>, cols: Option<u16>, rows: Option<u16>) -> Result<SessionInfo, String> {
    let integration = app.path().app_data_dir().ok().map(|d| shell::integration_dir(&d));
    if let Some(dir) = &integration {
        shell::write_integration(dir).map_err(|e| format!("shell integration: {e}"))?;
    }
    state.spawn(Some(app.clone()), SpawnOptions { shell, cwd, cols: cols.unwrap_or(100), rows: rows.unwrap_or(30), integration_dir: integration })
}

#[tauri::command]
pub fn pty_write(state: State<'_, PtyManager>, id: String, data: String) -> Result<(), String> {
    let bytes = B64.decode(data).map_err(|e| e.to_string())?;
    state.write(&id, &bytes)
}

#[tauri::command]
pub fn pty_resize(state: State<'_, PtyManager>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    state.resize(&id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(state: State<'_, PtyManager>, id: String) -> Result<(), String> {
    state.kill(&id)
}

#[tauri::command]
pub fn pty_list(state: State<'_, PtyManager>) -> Vec<SessionInfo> {
    state.list()
}

#[tauri::command]
pub fn pty_foreground(state: State<'_, PtyManager>, id: String) -> Result<Foreground, String> {
    state.foreground(&id)
}

#[tauri::command]
pub fn pty_shells() -> Vec<ShellInfo> {
    shell::available_shells()
}

#[tauri::command]
pub fn pty_default_cwd() -> String {
    dirs::home_dir().map(|p| p.display().to_string()).unwrap_or_else(|| "/".into())
}
