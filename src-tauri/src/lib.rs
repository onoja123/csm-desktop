mod csm;
mod terminal;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(csm::EventsState::default())
        .manage(terminal::PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            csm::csm_request,
            csm::csm_info,
            csm::csm_start_service,
            csm::csm_stop_service,
            csm::csm_subscribe,
            terminal::commands::pty_spawn,
            terminal::commands::pty_write,
            terminal::commands::pty_resize,
            terminal::commands::pty_kill,
            terminal::commands::pty_list,
            terminal::commands::pty_foreground,
            terminal::commands::pty_shells,
            terminal::commands::pty_default_cwd,
            terminal::git::git_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running CSM Desktop");
}
