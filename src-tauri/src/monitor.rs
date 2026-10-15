use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Notify;

use crate::prefs::{self, NotificationPrefs};
use crate::{csm, tray};

const REFRESH_EVERY: Duration = Duration::from_secs(15);
const STOP_CODES: [i64; 3] = [129, 130, 143];
const SEEN_LIMIT: usize = 1000;
const STATE_KEYS: [&str; 3] = ["failed:", "limit:", "login:"];

static WAKE: OnceLock<Notify> = OnceLock::new();

fn wake() -> &'static Notify {
    WAKE.get_or_init(Notify::new)
}

pub fn poke() {
    wake().notify_one();
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct AttentionEntry {
    pub key: String,
    pub kind: String,
    pub provider: String,
    pub account: String,
    pub run_id: Option<String>,
    pub project_dir: Option<String>,
    pub title: String,
    pub reason: String,
    pub detail: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq)]
pub struct MenuState {
    pub connected: bool,
    pub live: usize,
    pub waiting: usize,
    pub attention: Vec<AttentionEntry>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Category {
    Approval,
    Failure,
    RateLimit,
    Auth,
    Handoff,
    Recovery,
    Completed,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Notice {
    pub key: String,
    pub category: Category,
    pub title: String,
    pub body: String,
    pub target: Value,
}

#[derive(Clone, Debug, Default)]
struct RunMeta {
    provider: String,
    project_dir: String,
    task: Option<String>,
}

#[derive(Default)]
struct Inner {
    state: MenuState,
    baselined: bool,
    seen: HashSet<String>,
    order: VecDeque<String>,
    runs: HashMap<String, RunMeta>,
    names: HashMap<String, String>,
    pending_target: Option<Value>,
}

impl Inner {
    fn mark(&mut self, key: &str) -> bool {
        if !self.seen.insert(key.to_string()) {
            return false;
        }

        self.order.push_back(key.to_string());

        while self.order.len() > SEEN_LIMIT {
            if let Some(old) = self.order.pop_front() {
                self.seen.remove(&old);
            }
        }

        true
    }

    fn forget_resolved(&mut self, current: &MenuState) {
        let live: HashSet<&str> = current.attention.iter().map(|a| a.key.as_str()).collect();
        let resolved: Vec<String> = self
            .seen
            .iter()
            .filter(|k| STATE_KEYS.iter().any(|p| k.starts_with(p)) && !live.contains(k.as_str()))
            .cloned()
            .collect();

        for key in resolved {
            self.seen.remove(&key);
            self.order.retain(|k| k != &key);
        }
    }
}

#[derive(Default)]
pub struct MonitorState(Mutex<Inner>);

pub fn install(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.notification().on_action(move |action| {
        let target = action
            .notification()
            .and_then(|n| n.extra().get("target").cloned());

        if let Some(target) = target {
            let h = handle.clone();
            let _ = handle.run_on_main_thread(move || route(&h, target));
        }
    });

    let handle = app.clone();
    tauri::async_runtime::spawn(async move { refresh_loop(handle).await });
}

pub fn on_event(app: &AppHandle, kind: &str, data: &Value) {
    poke();

    let Some(state) = app.try_state::<MonitorState>() else {
        return;
    };

    let notice = match state.0.lock() {
        Ok(inner) => event_notice(kind, data, &inner.runs, &inner.names),
        Err(_) => None,
    };

    if let Some(notice) = notice {
        let fresh = state
            .0
            .lock()
            .map(|mut i| i.mark(&notice.key))
            .unwrap_or(false);

        if fresh {
            deliver(app, &notice);
        }
    }
}

#[tauri::command]
pub fn menubar_state(state: State<'_, MonitorState>) -> MenuState {
    state.0.lock().map(|i| i.state.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn menubar_take_target(state: State<'_, MonitorState>) -> Option<Value> {
    state
        .0
        .lock()
        .ok()
        .and_then(|mut i| i.pending_target.take())
}

fn route(app: &AppHandle, target: Value) {
    if target.get("open").and_then(Value::as_str) == Some("main") {
        let route = target
            .get("route")
            .and_then(Value::as_str)
            .map(String::from);
        tray::show_main(app, route);
        return;
    }

    if let Some(state) = app.try_state::<MonitorState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner.pending_target = Some(target.clone());
        }
    }

    tray::open_panel(app);
    let _ = app.emit_to(tray::PANEL, "menubar:target", target);
}

async fn refresh_loop(app: AppHandle) {
    loop {
        let _ = tokio::time::timeout(REFRESH_EVERY, wake().notified()).await;
        refresh(&app).await;

        // Bursts of service events would otherwise trigger a refresh each.
        tokio::time::sleep(Duration::from_millis(400)).await;
    }
}

async fn refresh(app: &AppHandle) {
    let Some(runs) = get_json("/v1/runs").await else {
        publish(app, MenuState::default(), Vec::new());
        return;
    };

    let approvals = get_json("/v1/approvals").await;
    let accounts = get_json("/v1/accounts").await.unwrap_or(Value::Null);
    let state = compute(&runs, approvals.as_ref(), &accounts);

    let notices = match app.try_state::<MonitorState>() {
        Some(monitor) => match monitor.0.lock() {
            Ok(mut inner) => {
                remember(&mut inner, &runs, &accounts);
                let notices = attention_notices(&mut inner, &state);
                inner.state = state.clone();
                notices
            }
            Err(_) => Vec::new(),
        },
        None => Vec::new(),
    };

    publish(app, state, notices);
}

fn publish(app: &AppHandle, state: MenuState, notices: Vec<Notice>) {
    if !state.connected {
        if let Some(monitor) = app.try_state::<MonitorState>() {
            if let Ok(mut inner) = monitor.0.lock() {
                inner.state = state.clone();
            }
        }
    }

    tray::set_status(app, title(&state).as_deref(), &tooltip(&state));
    let _ = app.emit_to(tray::PANEL, "menubar:state", &state);

    for notice in notices {
        deliver(app, &notice);
    }
}

async fn get_json(path: &str) -> Option<Value> {
    let res = csm::request("GET", path, None).await.ok()?;

    if res.status >= 400 {
        return None;
    }

    serde_json::from_str(&res.body).ok()
}

fn remember(inner: &mut Inner, runs: &Value, accounts: &Value) {
    for a in list(accounts, None) {
        if let (Some(id), Some(name)) = (str_of(a, "provider"), str_of(a, "provider_name")) {
            inner.names.insert(id.to_string(), name.to_string());
        }
    }

    for r in list(runs, Some("runs")) {
        if let Some(id) = str_of(r, "id") {
            inner.runs.insert(
                id.to_string(),
                RunMeta {
                    provider: str_of(r, "provider").unwrap_or_default().to_string(),
                    project_dir: str_of(r, "project_dir").unwrap_or_default().to_string(),
                    task: r
                        .get("task")
                        .and_then(|t| t.get("summary"))
                        .and_then(Value::as_str)
                        .filter(|s| !s.is_empty())
                        .map(String::from),
                },
            );
        }
    }
}

fn attention_notices(inner: &mut Inner, state: &MenuState) -> Vec<Notice> {
    inner.forget_resolved(state);

    if !inner.baselined {
        inner.baselined = true;

        for a in &state.attention {
            inner.mark(&a.key);
        }

        return Vec::new();
    }

    let mut notices = Vec::new();

    for a in &state.attention {
        if !inner.mark(&a.key) {
            continue;
        }

        let target = match &a.run_id {
            Some(id) => json!({ "open": "panel", "session": id }),
            None => json!({ "open": "main", "route": format!("/accounts/{}", a.account) }),
        };

        let category = match a.kind.as_str() {
            "failed" => Category::Failure,
            "usage_limit" => Category::RateLimit,
            _ => Category::Auth,
        };

        notices.push(Notice {
            key: a.key.clone(),
            category,
            title: a.title.clone(),
            body: match &a.detail {
                Some(detail) => format!("{} · {}", a.reason, detail),
                None => a.reason.clone(),
            },
            target,
        });
    }

    notices
}

fn list<'a>(value: &'a Value, key: Option<&str>) -> Vec<&'a Value> {
    let arr = match key {
        Some(k) => value.get(k),
        None => Some(value),
    };

    arr.and_then(Value::as_array)
        .map(|a| a.iter().collect())
        .unwrap_or_default()
}

fn str_of<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.get(key).and_then(Value::as_str)
}

fn base_name(path: &str) -> &str {
    path.trim_end_matches('/')
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .unwrap_or(path)
}

pub fn compute(runs: &Value, approvals: Option<&Value>, accounts: &Value) -> MenuState {
    let accounts = list(accounts, None);
    let names: HashMap<&str, &str> = accounts
        .iter()
        .filter_map(|a| Some((str_of(a, "provider")?, str_of(a, "provider_name")?)))
        .collect();
    let name = |p: &str| names.get(p).copied().unwrap_or(p).to_string();
    let account_of = |provider: &str, account: &str| {
        accounts
            .iter()
            .find(|a| str_of(a, "provider") == Some(provider) && str_of(a, "name") == Some(account))
            .copied()
    };

    let own = list(runs, Some("runs"));
    let external = list(runs, Some("external"));
    let live: Vec<&Value> = own
        .iter()
        .chain(external.iter())
        .filter(|r| str_of(r, "status") == Some("running"))
        .copied()
        .collect();

    let mut attention = Vec::new();

    for r in &own {
        let Some(code) = r.get("exit_code").and_then(Value::as_i64) else {
            continue;
        };

        if str_of(r, "status") != Some("exited") || code == 0 || STOP_CODES.contains(&code) {
            continue;
        }

        let provider = str_of(r, "provider").unwrap_or_default();
        let project = str_of(r, "project_dir").unwrap_or_default();

        attention.push(AttentionEntry {
            key: format!("failed:{}", str_of(r, "id").unwrap_or_default()),
            kind: "failed".into(),
            provider: provider.into(),
            account: str_of(r, "account").unwrap_or_default().into(),
            run_id: str_of(r, "id").map(String::from),
            project_dir: Some(project.into()),
            title: "Agent failed".into(),
            reason: format!("{} exited with status {code}", name(provider)),
            detail: Some(base_name(project).into()),
        });
    }

    let mut covered = HashSet::new();

    for r in &live {
        let provider = str_of(r, "provider").unwrap_or_default();
        let account = str_of(r, "account").unwrap_or_default();
        let Some(acct) = account_of(provider, account) else {
            continue;
        };

        let health = str_of(acct, "health").unwrap_or_default();
        let limited = acct
            .get("usage")
            .and_then(|u| u.get("limited"))
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let id = str_of(r, "id").unwrap_or_default();
        let project = str_of(r, "project_dir").unwrap_or_default();

        let (kind, key, title, reason) = if health == "authentication_required" {
            covered.insert((provider, account));
            (
                "login",
                format!("login:{id}"),
                "Login required",
                format!(
                    "{} account {account} needs to sign in again",
                    name(provider)
                ),
            )
        } else if health == "rate_limited" || limited {
            (
                "usage_limit",
                format!("limit:{id}"),
                "Usage limit reached",
                format!("{} reported a usage limit on {account}", name(provider)),
            )
        } else {
            continue;
        };

        attention.push(AttentionEntry {
            key,
            kind: kind.into(),
            provider: provider.into(),
            account: account.into(),
            run_id: Some(id.into()),
            project_dir: Some(project.into()),
            title: title.into(),
            reason,
            detail: str_of(acct, "last_failure_text").map(String::from),
        });
    }

    for a in &accounts {
        let provider = str_of(a, "provider").unwrap_or_default();
        let account = str_of(a, "name").unwrap_or_default();
        let enabled = a.get("enabled").and_then(Value::as_bool).unwrap_or(false);

        if !enabled
            || str_of(a, "health") != Some("authentication_required")
            || covered.contains(&(provider, account))
        {
            continue;
        }

        attention.push(AttentionEntry {
            key: format!("login:{provider}/{account}"),
            kind: "login".into(),
            provider: provider.into(),
            account: account.into(),
            run_id: None,
            project_dir: None,
            title: "Login required".into(),
            reason: format!(
                "{} account {account} needs to sign in again",
                name(provider)
            ),
            detail: Some(format!("Run: csm account login {account}")),
        });
    }

    let waiting = approvals
        .and_then(|a| a.get("pending"))
        .and_then(Value::as_array)
        .map_or(0, Vec::len);

    MenuState {
        connected: true,
        live: live.len(),
        waiting,
        attention,
    }
}

pub fn title(state: &MenuState) -> Option<String> {
    let flagged = state.waiting + state.attention.len();
    let needs = match flagged {
        0 => None,
        n if state.attention.is_empty() => Some(format!("{n} waiting")),
        1 => Some("1 needs you".to_string()),
        n => Some(format!("{n} need you")),
    };

    match (state.live, needs) {
        (0, None) => None,
        (n, None) => Some(n.to_string()),
        (0, Some(needs)) => Some(needs),
        (n, Some(needs)) => Some(format!("{n} · {needs}")),
    }
}

pub fn tooltip(state: &MenuState) -> String {
    if !state.connected {
        return "CSM · the service is not running".into();
    }

    let count = |kind: &str| state.attention.iter().filter(|a| a.kind == kind).count();
    let mut parts = vec![match state.live {
        0 => "no agents running".to_string(),
        1 => "1 agent running".to_string(),
        n => format!("{n} agents running"),
    }];

    let plural = |n: usize, one: &str, many: &str| match n {
        0 => None,
        1 => Some(format!("1 {one}")),
        n => Some(format!("{n} {many}")),
    };

    parts.extend(plural(
        state.waiting,
        "approval waiting",
        "approvals waiting",
    ));
    parts.extend(plural(count("failed"), "agent failed", "agents failed"));
    parts.extend(plural(count("usage_limit"), "usage limit", "usage limits"));
    parts.extend(plural(count("login"), "sign-in needed", "sign-ins needed"));

    format!("CSM · {}", parts.join(" · "))
}

fn event_notice(
    kind: &str,
    data: &Value,
    runs: &HashMap<String, RunMeta>,
    names: &HashMap<String, String>,
) -> Option<Notice> {
    let name = |p: &str| names.get(p).cloned().unwrap_or_else(|| p.to_string());
    let project = |run: Option<&str>| {
        run.and_then(|id| runs.get(id))
            .map(|m| format!(" in {}", base_name(&m.project_dir)))
            .unwrap_or_default()
    };

    match kind {
        "approval.requested" => {
            let id = str_of(data, "id")?;
            let provider = str_of(data, "provider").unwrap_or_default();
            let account = str_of(data, "account").unwrap_or_default();
            // The program name is enough to decide whether to look; full commands can carry secrets.
            let program = str_of(data, "command")
                .and_then(|c| c.split_whitespace().next())
                .or_else(|| str_of(data, "tool_name"))
                .unwrap_or("a command");

            Some(Notice {
                key: format!("approval:{id}"),
                category: Category::Approval,
                title: "Approval needed".into(),
                body: format!(
                    "{} ({account}) wants to run {program}{}",
                    name(provider),
                    project(str_of(data, "run_id"))
                ),
                target: json!({ "open": "panel" }),
            })
        }
        "run.exit" => {
            let id = str_of(data, "run_id")?;

            if data.get("exit_code").and_then(Value::as_i64) != Some(0) {
                return None;
            }

            let meta = runs.get(id).cloned().unwrap_or_default();
            let what = meta
                .task
                .clone()
                .unwrap_or_else(|| base_name(&meta.project_dir).to_string());

            Some(Notice {
                key: format!("done:{id}"),
                category: Category::Completed,
                title: format!("{} finished", name(&meta.provider)),
                body: what,
                target: json!({ "open": "panel", "session": id }),
            })
        }
        "activity" => {
            let id = str_of(data, "id")?;
            let title = str_of(data, "title").unwrap_or_default();
            let detail = str_of(data, "detail").unwrap_or_default();
            let joined = if detail.is_empty() {
                title.to_string()
            } else {
                format!("{title} · {detail}")
            };

            let (category, heading, target) = match str_of(data, "kind")? {
                "switch" => (
                    Category::Recovery,
                    "Session moved to another account",
                    json!({ "open": "main", "route": "/mission" }),
                ),
                "handoff.target_started" => (
                    Category::Recovery,
                    "Handoff started the next agent",
                    json!({ "open": "main", "route": "/handoffs" }),
                ),
                "handoff.failed" => (
                    Category::Handoff,
                    "Handoff failed",
                    json!({ "open": "main", "route": "/handoffs" }),
                ),
                _ => return None,
            };

            Some(Notice {
                key: format!("activity:{id}"),
                category,
                title: heading.into(),
                body: joined,
                target,
            })
        }
        _ => None,
    }
}

pub fn allowed(prefs: &NotificationPrefs, category: Category, minute_of_day: u16) -> bool {
    if !prefs.enabled || prefs.quiet_hours.is_some_and(|q| q.contains(minute_of_day)) {
        return false;
    }

    match category {
        Category::Approval => prefs.approvals,
        Category::Failure => prefs.failures,
        Category::RateLimit => prefs.rate_limits,
        Category::Auth => prefs.auth,
        Category::Handoff => prefs.handoffs,
        Category::Recovery => prefs.recovery,
        Category::Completed => prefs.completed,
    }
}

fn deliver(app: &AppHandle, notice: &Notice) {
    let prefs = prefs::current(app);

    if !allowed(&prefs.notifications, notice.category, local_minute()) {
        return;
    }

    let _ = app
        .notification()
        .builder()
        .title(&notice.title)
        .body(&notice.body)
        .extra("target", notice.target.clone())
        .show();
}

#[cfg(unix)]
fn local_minute() -> u16 {
    let now = unsafe { libc::time(std::ptr::null_mut()) };
    let mut tm: libc::tm = unsafe { std::mem::zeroed() };

    if unsafe { libc::localtime_r(&now, &mut tm) }.is_null() {
        return 0;
    }

    (tm.tm_hour * 60 + tm.tm_min) as u16
}

#[cfg(not(unix))]
fn local_minute() -> u16 {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    ((secs / 60) % (24 * 60)) as u16
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::prefs::QuietHours;

    fn accounts() -> Value {
        json!([
            { "name": "work", "provider": "claude", "provider_name": "Claude Code", "enabled": true, "health": "healthy" },
            { "name": "personal", "provider": "claude", "provider_name": "Claude Code", "enabled": true, "health": "rate_limited", "last_failure_text": "known usage limit" },
            { "name": "codex-main", "provider": "codex", "provider_name": "Codex", "enabled": true, "health": "healthy", "usage": { "limited": true } },
            { "name": "old", "provider": "gemini", "provider_name": "Gemini CLI", "enabled": true, "health": "authentication_required" },
            { "name": "off", "provider": "gemini", "provider_name": "Gemini CLI", "enabled": false, "health": "authentication_required" }
        ])
    }

    #[test]
    fn counts_live_agents_including_terminal_sessions() {
        let runs = json!({
            "runs": [
                { "id": "r1", "provider": "claude", "account": "work", "status": "running", "project_dir": "/p/shop" },
                { "id": "r2", "provider": "claude", "account": "work", "status": "exited", "exit_code": 0, "project_dir": "/p/shop" }
            ],
            "external": [{ "id": "external-9", "provider": "claude", "account": "work", "status": "running", "project_dir": "/p/docs" }]
        });

        let state = compute(&runs, Some(&json!({ "pending": [] })), &json!([]));

        assert_eq!(state.live, 2);
        assert_eq!(state.waiting, 0);
        assert!(state.attention.is_empty());
        assert_eq!(title(&state).as_deref(), Some("2"));
    }

    #[test]
    fn flags_failures_but_not_stops() {
        let runs = json!({
            "runs": [
                { "id": "bad", "provider": "claude", "account": "work", "status": "exited", "exit_code": 1, "project_dir": "/p/shop" },
                { "id": "stopped", "provider": "claude", "account": "work", "status": "exited", "exit_code": 143, "project_dir": "/p/shop" },
                { "id": "ok", "provider": "claude", "account": "work", "status": "exited", "exit_code": 0, "project_dir": "/p/shop" }
            ],
            "external": []
        });

        let state = compute(&runs, None, &accounts());
        let failed: Vec<_> = state
            .attention
            .iter()
            .filter(|a| a.kind == "failed")
            .collect();

        assert_eq!(failed.len(), 1);
        assert_eq!(failed[0].run_id.as_deref(), Some("bad"));
        assert_eq!(failed[0].reason, "Claude Code exited with status 1");
    }

    #[test]
    fn flags_live_sessions_on_limited_or_signed_out_accounts() {
        let runs = json!({
            "runs": [
                { "id": "a", "provider": "claude", "account": "personal", "status": "running", "project_dir": "/p/shop" },
                { "id": "b", "provider": "codex", "account": "codex-main", "status": "running", "project_dir": "/p/api" }
            ],
            "external": [{ "id": "external-4", "provider": "gemini", "account": "old", "status": "running", "project_dir": "/p/app" }]
        });

        let state = compute(
            &runs,
            Some(&json!({ "pending": [{ "id": "x" }] })),
            &accounts(),
        );
        let kinds: Vec<_> = state
            .attention
            .iter()
            .map(|a| (a.kind.as_str(), a.key.as_str()))
            .collect();

        assert_eq!(
            kinds,
            vec![
                ("usage_limit", "limit:a"),
                ("usage_limit", "limit:b"),
                ("login", "login:external-4"),
            ],
            "the signed-out account is reported once, through its live session; the disabled one never"
        );
        assert_eq!(state.waiting, 1);
        assert_eq!(title(&state).as_deref(), Some("3 · 4 need you"));
        assert_eq!(
            tooltip(&state),
            "CSM · 3 agents running · 1 approval waiting · 2 usage limits · 1 sign-in needed"
        );
    }

    #[test]
    fn idle_accounts_needing_sign_in_are_reported_on_their_own() {
        let state = compute(&json!({ "runs": [], "external": [] }), None, &accounts());

        assert_eq!(state.attention.len(), 1);
        assert_eq!(state.attention[0].key, "login:gemini/old");
        assert_eq!(title(&state).as_deref(), Some("1 needs you"));
    }

    #[test]
    fn approvals_alone_read_as_waiting() {
        let runs = json!({ "runs": [{ "id": "r", "provider": "claude", "account": "work", "status": "running" }], "external": [] });
        let state = compute(
            &runs,
            Some(&json!({ "pending": [{ "id": "a" }] })),
            &json!([]),
        );

        assert_eq!(title(&state).as_deref(), Some("1 · 1 waiting"));
    }

    #[test]
    fn notifies_new_attention_once_and_again_after_it_clears() {
        let mut inner = Inner::default();
        let runs = json!({ "runs": [{ "id": "bad", "provider": "claude", "account": "work", "status": "exited", "exit_code": 2, "project_dir": "/p/shop" }], "external": [] });
        let empty = compute(&json!({ "runs": [], "external": [] }), None, &json!([]));
        let failing = compute(&runs, None, &json!([]));

        assert!(
            attention_notices(&mut inner, &empty).is_empty(),
            "first look is the baseline"
        );
        assert_eq!(attention_notices(&mut inner, &failing).len(), 1);
        assert!(
            attention_notices(&mut inner, &failing).is_empty(),
            "unchanged condition stays quiet"
        );

        attention_notices(&mut inner, &empty);
        assert_eq!(
            attention_notices(&mut inner, &failing).len(),
            1,
            "a new occurrence notifies again"
        );
    }

    #[test]
    fn conditions_present_at_startup_do_not_notify() {
        let mut inner = Inner::default();
        let state = compute(&json!({ "runs": [], "external": [] }), None, &accounts());

        assert!(attention_notices(&mut inner, &state).is_empty());
        assert!(attention_notices(&mut inner, &state).is_empty());
    }

    #[test]
    fn approval_notices_name_the_program_not_the_command() {
        let mut runs = HashMap::new();
        runs.insert(
            "r1".to_string(),
            RunMeta {
                project_dir: "/p/storefront".into(),
                ..Default::default()
            },
        );
        let names = HashMap::from([("claude".to_string(), "Claude Code".to_string())]);
        let data = json!({ "id": "a1", "run_id": "r1", "provider": "claude", "account": "work", "command": "curl -H 'Authorization: Bearer secret' https://x" });

        let n = event_notice("approval.requested", &data, &runs, &names).unwrap();

        assert_eq!(n.key, "approval:a1");
        assert_eq!(n.body, "Claude Code (work) wants to run curl in storefront");
        assert!(!n.body.contains("secret"));
    }

    #[test]
    fn only_clean_exits_count_as_finished() {
        let names = HashMap::new();
        let runs = HashMap::new();

        assert!(event_notice(
            "run.exit",
            &json!({ "run_id": "r", "exit_code": 1 }),
            &runs,
            &names
        )
        .is_none());
        assert_eq!(
            event_notice(
                "run.exit",
                &json!({ "run_id": "r", "exit_code": 0 }),
                &runs,
                &names
            )
            .unwrap()
            .target,
            json!({ "open": "panel", "session": "r" })
        );
    }

    #[test]
    fn activity_notices_cover_switches_and_handoff_failures_only() {
        let names = HashMap::new();
        let runs = HashMap::new();
        let switch = json!({ "id": "1", "kind": "switch", "title": "CSM switched work → personal", "detail": "usage_limit · ~/p/shop" });
        let failed = json!({ "id": "2", "kind": "handoff.failed", "title": "Handoff failed", "detail": "codex is not installed" });
        let other = json!({ "id": "3", "kind": "run.started", "title": "x" });

        assert_eq!(
            event_notice("activity", &switch, &runs, &names)
                .unwrap()
                .category,
            Category::Recovery
        );
        assert_eq!(
            event_notice("activity", &failed, &runs, &names)
                .unwrap()
                .category,
            Category::Handoff
        );
        assert!(event_notice("activity", &other, &runs, &names).is_none());
    }

    #[test]
    fn preferences_and_quiet_hours_gate_delivery() {
        let mut prefs = NotificationPrefs::default();

        assert!(allowed(&prefs, Category::Approval, 600));

        prefs.completed = false;
        assert!(!allowed(&prefs, Category::Completed, 600));

        prefs.quiet_hours = Some(QuietHours {
            start_minute: 22 * 60,
            end_minute: 7 * 60,
        });
        assert!(!allowed(&prefs, Category::Approval, 23 * 60));
        assert!(allowed(&prefs, Category::Approval, 12 * 60));

        prefs.enabled = false;
        assert!(!allowed(&prefs, Category::Approval, 12 * 60));
    }
}
