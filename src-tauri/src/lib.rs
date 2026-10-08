mod csm;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(csm::EventsState::default())
        .invoke_handler(tauri::generate_handler![
            csm::csm_request,
            csm::csm_info,
            csm::csm_start_service,
            csm::csm_stop_service,
            csm::csm_subscribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running CSM Desktop");
}
