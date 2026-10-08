# CSM Desktop

The graphical client for [csm](https://github.com/onoja123/csm), the Code Session Manager. It shows what your coding agents are doing right now, lets you start and stop them, switch accounts, approve commands, hand tasks between agents, and watch CSM's failover decisions, all from one black window you can leave open all day.

CSM Desktop does not reimplement any of CSM. The Go CLI stays the engine; the desktop app is a client of a local service that CSM exposes.

## How it fits together

```
csm (Go)                              CSM Desktop (Tauri + React + TypeScript)
┌──────────────────────────┐          ┌──────────────────────────────────────┐
│ csm serve                │          │ Rust core                            │
│   HTTP/JSON API          │◀────────▶│   hyper client over the Unix socket  │
│   server-sent events     │  ~/.csm/ │   SSE reader → Tauri events          │
│   PTY runs of `csm <agent>`  csm.sock│   starts `csm serve --detach`        │
│   approvals (Claude hook)│          ├──────────────────────────────────────┤
│   activity log           │          │ React UI                             │
│ accounts, health,        │          │   zustand stores fed by the events   │
│ failover, sessions,      │          │   xterm.js terminal per run          │
│ handoffs, MCP (unchanged)│          │   ⌘K command palette                 │
└──────────────────────────┘          └──────────────────────────────────────┘
```

- **Transport**: a Unix socket at `~/.csm/csm.sock`, mode `0600`, inside the `0700` state directory. Nothing listens on a TCP port and nothing leaves the machine.
- **Live updates**: the service streams changes as server-sent events (`/v1/events`): run output, run exit, approvals, activity, and change notices for accounts, runs, sessions, handoffs and projects. The UI refetches only the section that changed.
- **Agents**: when you start an agent here, the service spawns `csm claude` (or codex, gemini, copilot) in a pseudo-terminal. All of CSM's switching, failover, checkpoint and handoff rules run exactly as they do in a terminal. The Output tab is that terminal.
- **Approvals**: under the service, CSM registers a `PreToolUse` hook for Claude Code's shell commands. The hook asks the service; the service asks you; the answer goes back as Claude Code's own hook decision. No answer within ten minutes, or no desktop connected, and Claude Code falls back to its normal prompt. Other agents keep their terminal prompts, which you can answer in the Output tab.
- **Truthful data**: every figure comes from CSM or the agent's own session record. Usage shows `Unknown` until the agent reports it. Task names are the last request the user made in that session, not a guess. There is no progress percentage because nothing provides one.

## Requirements

- macOS 12 or newer (Linux should work but is untested)
- `csm` built from the `desktop-api` branch, on your `PATH` or at `~/.local/bin/csm`, `~/go/bin/csm`, `/usr/local/bin/csm` or `/opt/homebrew/bin/csm` (or set `CSM_PATH`)
- Node 20+, Rust 1.77+, Xcode command line tools

## Development

```bash
npm install
npm run app:dev      # starts Vite and the Tauri window
npm test             # vitest: API client, stores, formatting, components
npm run typecheck
npm run lint
(cd src-tauri && cargo test)
```

The app starts the service itself if `~/.csm/csm.sock` is not answering, by running `csm serve --detach`. You can also run it by hand:

```bash
csm serve            # foreground
csm serve --detach   # background, logs to ~/.csm/serve.log
csm serve status
csm serve stop
```

## Production build

```bash
npm run app:build
```

produces `src-tauri/target/release/bundle/macos/CSM.app` and a `.dmg` next to it.

## Layout

```
src/
  design/      tokens.css, tokens.ts (shared with the future mobile app), base.css, app.css
  lib/         api.ts (typed client), types.ts, format.ts, output-bus.ts
  store/       connection.ts (bootstrap, reconnect), data.ts (sections + event routing)
  components/  shell, ui primitives, agents, accounts, tasks, sessions, terminal,
               mcp, handoffs, approvals, activity, palette
  screens/     Home, Agents, AgentDetail, Accounts, AccountDetail, MCP, Sessions,
               Handoffs (+ detail), Tasks, Activity, Settings
  test/        vitest suites
src-tauri/
  src/csm.rs   socket client, SSE reader, service launcher, csm discovery
  src/lib.rs   Tauri setup and command registration
```

## Security notes

- The desktop never sees tokens, API keys or MCP secret values. CSM's own redaction applies to everything it stores; the service only adds names, statuses and timestamps.
- Approvals default to on. Turn them off in Settings if you prefer Claude Code's own prompts.
- Commands that look destructive (`rm -rf`, `git push --force`, `DROP TABLE`, …) need a second click to approve.
- The service is local only. Remote access for the mobile app is a separate design and is not part of this version.
