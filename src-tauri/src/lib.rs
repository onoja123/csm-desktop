mod csm;
mod monitor;
mod prefs;
mod terminal;
mod tray;

use tauri::{Manager, WindowEvent};

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .macos_launcher(tauri_plugin_autostart::MacosLauncher::LaunchAgent)
                .build(),
        )
        .manage(csm::EventsState::default())
        .manage(terminal::PtyManager::default())
        .manage(prefs::PrefsState::default())
        .manage(monitor::MonitorState::default())
        .invoke_handler(tauri::generate_handler![
            csm::csm_request,
            csm::csm_info,
            csm::csm_start_service,
            csm::csm_stop_service,
            csm::csm_subscribe,
            terminal::commands::pty_spawn,
            terminal::commands::pty_attach,
            terminal::commands::pty_write,
            terminal::commands::pty_resize,
            terminal::commands::pty_kill,
            terminal::commands::pty_list,
            terminal::commands::pty_foreground,
            terminal::commands::pty_shells,
            terminal::commands::pty_default_cwd,
            terminal::git::git_branch,
            tray::show_main_window,
            tray::hide_panel,
            tray::quit_app,
            monitor::menubar_state,
            monitor::menubar_take_target,
            prefs::menubar_prefs,
            prefs::set_menubar_prefs,
            prefs::login_item,
            prefs::set_login_item
        ])
        .setup(|app| {
            let loaded = prefs::load(app.handle());
            prefs::apply_dock(app.handle(), &loaded);

            if let Ok(mut current) = app.state::<prefs::PrefsState>().0.lock() {
                *current = loaded;
            }

            tray::install(app.handle())?;
            monitor::install(app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            // Agents keep running in the csm service; closing the window leaves CSM in the menu bar.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building CSM Desktop");

    app.run(|_app, _event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = _event {
            tray::show_main(_app, None);
        }
    });
}
