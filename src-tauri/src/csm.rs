use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::body::Incoming;
use hyper::Request;
use hyper_util::rt::TokioIo;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tokio::net::UnixStream;

#[derive(Default)]
pub struct EventsState {
    started: AtomicBool,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Serialize)]
pub struct ServiceInfo {
    pub home: String,
    pub socket: String,
    pub csm_path: Option<String>,
    pub csm_version: Option<String>,
    pub socket_present: bool,
}

#[derive(Serialize, Clone)]
struct ConnectionEvent {
    connected: bool,
    error: Option<String>,
}

#[derive(Serialize, Clone)]
struct StreamEvent {
    #[serde(rename = "type")]
    kind: String,
    data: serde_json::Value,
}

pub fn home_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("CSM_HOME") {
        if !dir.is_empty() {
            return PathBuf::from(dir);
        }
    }

    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .join(".csm")
}

pub fn socket_path() -> PathBuf {
    home_dir().join("csm.sock")
}

// The desktop app inherits a minimal PATH from launchd, so the usual install locations are checked by hand.
pub fn locate_csm() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CSM_PATH") {
        let p = PathBuf::from(path);
        if p.is_file() {
            return Some(p);
        }
    }

    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    let mut candidates: Vec<PathBuf> = vec![
        home.join(".local/bin/csm"),
        home.join("go/bin/csm"),
        PathBuf::from("/usr/local/bin/csm"),
        PathBuf::from("/opt/homebrew/bin/csm"),
        PathBuf::from("/usr/local/go/bin/csm"),
    ];

    if let Ok(path) = std::env::var("PATH") {
        for dir in path.split(':') {
            candidates.push(PathBuf::from(dir).join("csm"));
        }
    }

    candidates.into_iter().find(|p| p.is_file())
}

async fn connect() -> Result<hyper::client::conn::http1::SendRequest<Full<Bytes>>, String> {
    let path = socket_path();
    let stream = UnixStream::connect(&path)
        .await
        .map_err(|e| format!("cannot reach the csm service at {}: {}", path.display(), e))?;
    let io = TokioIo::new(stream);
    let (sender, conn) = hyper::client::conn::http1::handshake(io)
        .await
        .map_err(|e| format!("handshake with the csm service failed: {e}"))?;

    tauri::async_runtime::spawn(async move {
        let _ = conn.await;
    });

    Ok(sender)
}

fn build_request(
    method: &str,
    path: &str,
    body: Option<String>,
) -> Result<Request<Full<Bytes>>, String> {
    Request::builder()
        .method(method)
        .uri(format!("http://csm{path}"))
        .header("Host", "csm")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream")
        .body(Full::new(Bytes::from(body.unwrap_or_default())))
        .map_err(|e| e.to_string())
}

pub async fn request(
    method: &str,
    path: &str,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let mut sender = connect().await?;
    let req = build_request(method, path, body)?;
    let res = sender
        .send_request(req)
        .await
        .map_err(|e| format!("request to the csm service failed: {e}"))?;
    let status = res.status().as_u16();
    let bytes = res
        .into_body()
        .collect()
        .await
        .map_err(|e| format!("reading the csm service response failed: {e}"))?
        .to_bytes();

    Ok(ApiResponse {
        status,
        body: String::from_utf8_lossy(&bytes).into_owned(),
    })
}

#[tauri::command]
pub async fn csm_request(
    method: String,
    path: String,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    request(&method, &path, body).await
}

#[tauri::command]
pub async fn csm_info() -> ServiceInfo {
    let csm_path = locate_csm();
    let csm_version = match &csm_path {
        Some(p) => tokio::process::Command::new(p)
            .arg("version")
            .output()
            .await
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .and_then(|s| s.lines().next().map(|l| l.trim().to_string())),
        None => None,
    };

    ServiceInfo {
        home: home_dir().display().to_string(),
        socket: socket_path().display().to_string(),
        csm_path: csm_path.map(|p| p.display().to_string()),
        csm_version,
        socket_present: socket_path().exists(),
    }
}

#[tauri::command]
pub async fn csm_start_service() -> Result<String, String> {
    let csm = locate_csm().ok_or_else(|| "csm was not found. Install it with `go install github.com/onoja123/csm/cmd/csm@latest` or set CSM_PATH.".to_string())?;
    let output = tokio::process::Command::new(&csm)
        .args(["serve", "--detach"])
        .env("CSM_HOME", home_dir())
        .output()
        .await
        .map_err(|e| format!("could not run {}: {}", csm.display(), e))?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if !output.status.success() {
        return Err(text.trim().to_string());
    }

    for _ in 0..30 {
        if request("GET", "/v1/status", None).await.is_ok() {
            return Ok(text.trim().to_string());
        }

        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    Err("the csm service started but is not answering yet".to_string())
}

#[tauri::command]
pub async fn csm_stop_service() -> Result<String, String> {
    let csm = locate_csm().ok_or_else(|| "csm was not found".to_string())?;
    let output = tokio::process::Command::new(&csm)
        .args(["serve", "stop"])
        .env("CSM_HOME", home_dir())
        .output()
        .await
        .map_err(|e| e.to_string())?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if output.status.success() {
        Ok(text.trim().to_string())
    } else {
        Err(text.trim().to_string())
    }
}

#[tauri::command]
pub fn csm_subscribe(app: AppHandle, state: State<'_, EventsState>) -> bool {
    if state.started.swap(true, Ordering::SeqCst) {
        return false;
    }

    tauri::async_runtime::spawn(event_loop(app));

    true
}

async fn event_loop(app: AppHandle) {
    let mut delay = Duration::from_millis(500);

    loop {
        match stream_events(&app).await {
            Ok(()) => {
                let _ = app.emit(
                    "csm:connection",
                    ConnectionEvent {
                        connected: false,
                        error: None,
                    },
                );
                delay = Duration::from_millis(500);
            }
            Err(e) => {
                let _ = app.emit(
                    "csm:connection",
                    ConnectionEvent {
                        connected: false,
                        error: Some(e),
                    },
                );
                delay = (delay * 2).min(Duration::from_secs(5));
            }
        }

        crate::monitor::poke();
        tokio::time::sleep(delay).await;
    }
}

async fn stream_events(app: &AppHandle) -> Result<(), String> {
    let mut sender = connect().await?;
    let req = build_request("GET", "/v1/events", None)?;
    let res = sender.send_request(req).await.map_err(|e| e.to_string())?;

    if res.status() != 200 {
        return Err(format!("event stream refused with status {}", res.status()));
    }

    let _ = app.emit(
        "csm:connection",
        ConnectionEvent {
            connected: true,
            error: None,
        },
    );
    let mut body: Incoming = res.into_body();
    let mut buffer: Vec<u8> = Vec::new();

    while let Some(frame) = body.frame().await {
        let frame = frame.map_err(|e| e.to_string())?;

        if let Some(chunk) = frame.data_ref() {
            buffer.extend_from_slice(chunk);
            drain_events(app, &mut buffer);
        }
    }

    Ok(())
}

// Server-sent events arrive as blank-line separated blocks; anything after the last blank line is kept for the next chunk.
fn drain_events(app: &AppHandle, buffer: &mut Vec<u8>) {
    loop {
        let Some(pos) = find_block_end(buffer) else {
            return;
        };

        let block = buffer.drain(..pos + 2).collect::<Vec<u8>>();
        let text = String::from_utf8_lossy(&block);

        if let Some(ev) = parse_block(&text) {
            // Terminal output and screens stream constantly and never change what the menu bar shows.
            if ev.kind != "run.output" && ev.kind != "run.screen" {
                crate::monitor::on_event(app, &ev.kind, &ev.data);
            }

            let _ = app.emit("csm:event", ev);
        }
    }
}

fn find_block_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(2).position(|w| w == b"\n\n")
}

fn parse_block(text: &str) -> Option<StreamEvent> {
    let mut kind = String::new();
    let mut data_lines: Vec<&str> = Vec::new();

    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("event:") {
            kind = rest.trim().to_string();
        } else if let Some(rest) = line.strip_prefix("data:") {
            data_lines.push(rest.strip_prefix(' ').unwrap_or(rest));
        }
    }

    if kind.is_empty() {
        return None;
    }

    let joined = data_lines.join("\n");
    let data = serde_json::from_str(&joined).unwrap_or(serde_json::Value::Null);

    Some(StreamEvent { kind, data })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_event_blocks() {
        let ev = parse_block("event: runs\ndata: {\"a\":1}\n\n").unwrap();
        assert_eq!(ev.kind, "runs");
        assert_eq!(ev.data["a"], 1);
        assert!(parse_block(": ping\n\n").is_none());
    }

    #[test]
    fn drains_only_complete_blocks() {
        let mut buf = b"event: a\ndata: null\n\nevent: b\ndata: {".to_vec();
        let end = find_block_end(&buf).unwrap();
        buf.drain(..end + 2);
        assert_eq!(String::from_utf8_lossy(&buf), "event: b\ndata: {");
        assert!(find_block_end(&buf).is_none());
    }
}
