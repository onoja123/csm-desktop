use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt;

const FILE: &str = "menubar.json";
pub const MAX_RECENT: u8 = 10;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuietHours {
    pub start_minute: u16,
    pub end_minute: u16,
}

impl QuietHours {
    pub fn contains(&self, minute_of_day: u16) -> bool {
        if self.start_minute == self.end_minute {
            return false;
        }

        if self.start_minute < self.end_minute {
            (self.start_minute..self.end_minute).contains(&minute_of_day)
        } else {
            minute_of_day >= self.start_minute || minute_of_day < self.end_minute
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct NotificationPrefs {
    pub enabled: bool,
    pub approvals: bool,
    pub failures: bool,
    pub rate_limits: bool,
    pub auth: bool,
    pub handoffs: bool,
    pub recovery: bool,
    pub completed: bool,
    pub quiet_hours: Option<QuietHours>,
}

impl Default for NotificationPrefs {
    fn default() -> Self {
        Self {
            enabled: true,
            approvals: true,
            failures: true,
            rate_limits: true,
            auth: true,
            handoffs: true,
            recovery: true,
            completed: true,
            quiet_hours: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Prefs {
    pub show_in_dock: bool,
    pub recent_limit: u8,
    pub notifications: NotificationPrefs,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            show_in_dock: true,
            recent_limit: 3,
            notifications: NotificationPrefs::default(),
        }
    }
}

impl Prefs {
    fn sanitized(mut self) -> Self {
        self.recent_limit = self.recent_limit.min(MAX_RECENT);

        if let Some(q) = self.notifications.quiet_hours {
            if q.start_minute >= 24 * 60 || q.end_minute >= 24 * 60 {
                self.notifications.quiet_hours = None;
            }
        }

        self
    }
}

#[derive(Default)]
pub struct PrefsState(pub Mutex<Prefs>);

#[derive(Serialize)]
pub struct PrefsView {
    pub prefs: Prefs,
    pub dock_supported: bool,
}

#[derive(Serialize)]
pub struct LoginItemView {
    pub supported: bool,
    pub enabled: bool,
    pub error: Option<String>,
}

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join(FILE))
}

pub fn load(app: &AppHandle) -> Prefs {
    path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|text| serde_json::from_str::<Prefs>(&text).ok())
        .unwrap_or_default()
        .sanitized()
}

fn save(app: &AppHandle, prefs: &Prefs) -> Result<(), String> {
    let path = path(app).ok_or("CSM could not find its settings folder")?;

    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    }

    let text = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    fs::write(&path, text).map_err(|e| format!("could not save {}: {e}", path.display()))
}

pub fn apply_dock(app: &AppHandle, prefs: &Prefs) {
    #[cfg(target_os = "macos")]
    let _ = app.set_dock_visibility(prefs.show_in_dock);

    #[cfg(not(target_os = "macos"))]
    let _ = (app, prefs);
}

pub fn current(app: &AppHandle) -> Prefs {
    app.state::<PrefsState>()
        .0
        .lock()
        .map(|p| p.clone())
        .unwrap_or_default()
}

fn view(prefs: Prefs) -> PrefsView {
    PrefsView {
        prefs,
        dock_supported: cfg!(target_os = "macos"),
    }
}

#[tauri::command]
pub fn menubar_prefs(state: State<'_, PrefsState>) -> PrefsView {
    view(state.0.lock().map(|p| p.clone()).unwrap_or_default())
}

#[tauri::command]
pub fn set_menubar_prefs(
    app: AppHandle,
    state: State<'_, PrefsState>,
    prefs: Prefs,
) -> Result<PrefsView, String> {
    let prefs = prefs.sanitized();
    save(&app, &prefs)?;
    apply_dock(&app, &prefs);

    if let Ok(mut current) = state.0.lock() {
        *current = prefs.clone();
    }

    Ok(view(prefs))
}

#[tauri::command]
pub fn login_item(app: AppHandle) -> LoginItemView {
    match app.autolaunch().is_enabled() {
        Ok(enabled) => LoginItemView {
            supported: true,
            enabled,
            error: None,
        },
        Err(e) => LoginItemView {
            supported: false,
            enabled: false,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
pub fn set_login_item(app: AppHandle, enabled: bool) -> LoginItemView {
    let launcher = app.autolaunch();
    let result = if enabled {
        launcher.enable()
    } else {
        launcher.disable()
    };

    match (result, launcher.is_enabled()) {
        (Ok(()), Ok(now)) => LoginItemView {
            supported: true,
            enabled: now,
            error: None,
        },
        (Err(e), now) => LoginItemView {
            supported: true,
            enabled: now.unwrap_or(false),
            error: Some(e.to_string()),
        },
        (Ok(()), Err(e)) => LoginItemView {
            supported: true,
            enabled: false,
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quiet_hours_wrap_past_midnight() {
        let q = QuietHours {
            start_minute: 22 * 60,
            end_minute: 7 * 60,
        };

        assert!(q.contains(23 * 60));
        assert!(q.contains(30));
        assert!(!q.contains(12 * 60));
        assert!(!q.contains(7 * 60));
    }

    #[test]
    fn quiet_hours_within_a_day_and_empty_ranges() {
        let q = QuietHours {
            start_minute: 13 * 60,
            end_minute: 14 * 60,
        };

        assert!(q.contains(13 * 60 + 30));
        assert!(!q.contains(14 * 60));

        let empty = QuietHours {
            start_minute: 600,
            end_minute: 600,
        };

        assert!(!empty.contains(600));
    }

    #[test]
    fn unknown_or_missing_fields_fall_back_to_defaults() {
        let prefs: Prefs =
            serde_json::from_str(r#"{"recent_limit": 250, "future": true}"#).unwrap();
        let prefs = prefs.sanitized();

        assert_eq!(prefs.recent_limit, MAX_RECENT);
        assert!(prefs.show_in_dock);
        assert!(prefs.notifications.approvals);
    }

    #[test]
    fn out_of_range_quiet_hours_are_dropped() {
        let mut prefs = Prefs::default();
        prefs.notifications.quiet_hours = Some(QuietHours {
            start_minute: 2000,
            end_minute: 60,
        });

        assert_eq!(prefs.sanitized().notifications.quiet_hours, None);
    }
}
