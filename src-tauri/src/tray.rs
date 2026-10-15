use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::Color;
use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Rect, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};

use crate::monitor;

pub const TRAY_ID: &str = "csm";
pub const PANEL: &str = "menubar";
const PANEL_WIDTH: f64 = 400.0;
const PANEL_HEIGHT: f64 = 600.0;
const MIN_PANEL_HEIGHT: f64 = 360.0;

static PANEL_HIDDEN_AT: Mutex<Option<Instant>> = Mutex::new(None);

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open CSM", true, None::<&str>)?;
    let mission = MenuItem::with_id(app, "mission", "Mission Control", true, None::<&str>)?;
    let accounts = MenuItem::with_id(app, "accounts", "Accounts", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit CSM", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &mission, &accounts, &separator, &quit])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(tauri::include_image!("icons/tray.png"))
        .icon_as_template(true)
        .tooltip("CSM")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app, None),
            "mission" => show_main(app, Some("/mission".into())),
            "accounts" => show_main(app, Some("/accounts".into())),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_panel(tray.app_handle(), rect);
            }
        })
        .build(app)?;

    Ok(())
}

pub fn set_status(app: &AppHandle, title: Option<&str>, tooltip: &str) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_title(title);
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

pub fn show_main(app: &AppHandle, route: Option<String>) {
    if let Some(panel) = app.get_webview_window(PANEL) {
        let _ = panel.hide();
    }

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();

        if let Some(route) = route {
            let _ = app.emit_to("main", "csm:navigate", route);
        }
    }
}

pub fn open_panel(app: &AppHandle) {
    let anchor = app
        .tray_by_id(TRAY_ID)
        .and_then(|tray| tray.rect().ok().flatten());

    let Ok(panel) = panel_window(app) else {
        return;
    };

    if let Some(anchor) = anchor {
        place_below(&panel, anchor);
    }

    let _ = panel.show();
    let _ = panel.set_focus();
}

#[tauri::command]
pub fn show_main_window(app: AppHandle, route: Option<String>, action: Option<String>) {
    show_main(&app, route);

    if let Some(action) = action {
        let _ = app.emit_to("main", "csm:action", action);
    }
}

#[tauri::command]
pub fn hide_panel(app: AppHandle) {
    if let Some(panel) = app.get_webview_window(PANEL) {
        let _ = panel.hide();
    }
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn toggle_panel(app: &AppHandle, anchor: Rect) {
    let Ok(panel) = panel_window(app) else {
        return;
    };

    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
        return;
    }

    // Clicking the icon while the panel is open first blurs (and hides) the panel; that click must not reopen it.
    let just_hidden = PANEL_HIDDEN_AT
        .lock()
        .ok()
        .and_then(|at| *at)
        .is_some_and(|at| at.elapsed() < Duration::from_millis(400));

    if just_hidden {
        return;
    }

    place_below(&panel, anchor);
    let _ = panel.show();
    let _ = panel.set_focus();
    monitor::poke();
}

fn panel_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    if let Some(panel) = app.get_webview_window(PANEL) {
        return Ok(panel);
    }

    let panel = WebviewWindowBuilder::new(app, PANEL, WebviewUrl::App("index.html".into()))
        .title("CSM")
        .inner_size(PANEL_WIDTH, PANEL_HEIGHT)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible_on_all_workspaces(true)
        .visible(false)
        .background_color(Color(10, 10, 10, 255))
        .build()?;

    let handle = panel.clone();
    panel.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            let _ = handle.hide();

            if let Ok(mut at) = PANEL_HIDDEN_AT.lock() {
                *at = Some(Instant::now());
            }
        }
    });

    Ok(panel)
}

fn place_below(panel: &WebviewWindow, anchor: Rect) {
    let scale = panel.scale_factor().unwrap_or(1.0);
    let icon = anchor.position.to_physical::<f64>(scale);
    let size = anchor.size.to_physical::<f64>(scale);
    let width = PANEL_WIDTH * scale;
    let gap = 6.0 * scale;

    let mut x = icon.x + size.width / 2.0 - width / 2.0;
    let y = icon.y + size.height + gap;

    if let Ok(Some(monitor)) = panel.monitor_from_point(icon.x, icon.y) {
        let area = monitor.work_area();
        let left = area.position.x as f64 + gap;
        let right = area.position.x as f64 + area.size.width as f64 - width - gap;
        x = x.clamp(left, right.max(left));

        let room = (area.position.y as f64 + area.size.height as f64 - y - gap) / scale;
        let height = PANEL_HEIGHT.min(room).max(MIN_PANEL_HEIGHT);
        let _ = panel.set_size(LogicalSize::new(PANEL_WIDTH, height));
    }

    let _ = panel.set_position(PhysicalPosition::new(x, y));
}
