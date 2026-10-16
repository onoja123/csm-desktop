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

## Mission Control

Mission Control is one list of every agent session CSM knows about: the ones started from the desktop app, the ones started with `csm claude` (or codex, gemini, copilot) in a terminal, across every project and provider. Each row shows the provider, the account in use (and the account it switched from), the project and branch, the last request the user made in that session, the terminal tab that shows it, elapsed time and a status. Rows can be searched, filtered by status and grouped by status, project or provider; selecting one opens a panel with the session's details and the actions CSM supports for it: go to its terminal tab, open it in the Terminal, open a shell in its project, reveal the project in Finder, switch its account, hand it off, stop it, resume it (where the agent supports resume) or clear it.

Statuses come only from what CSM can observe:

| Status | What it means |
|---|---|
| Needs attention | The run exited with an error, hit a usage limit with no switch recorded since, failed a handoff, or its account needs a login. |
| Waiting | A command is waiting for your approval (Claude Code under the service). |
| Running | The agent process is alive and produced output in the last minute. A session started in a terminal is shown as running in that terminal; its output is not visible here. |
| Idle | The agent process is alive but has produced no output for a minute or more. CSM cannot tell an agent waiting at its prompt from one that is thinking quietly, so the row says how long it has been quiet. |
| Completed | The run exited cleanly, or was stopped. |
| Disconnected | The CSM service is not reachable; rows show the last known state. |

Account failover is reflected as it happens: the row's account updates when the runner writes the new live session, and the switch (from, to, reason) comes from the activity CSM logged for that project. There is no progress figure and no guessed task name, for the same reason as elsewhere in the app.

## Menu bar

CSM Desktop stays in the macOS menu bar. Its item shows how many agents are running, including ones started with `csm` in a terminal, and how many need you: approvals waiting, runs that exited with an error, sessions whose account hit a usage limit or needs a login, and enabled accounts that need a login. Clicking it opens a panel with the approvals waiting (approve or reject them there), what needs attention, what each agent is working on and the sessions that finished most recently. Selecting a session opens its details in four tabs: **Overview**; **Account**, which can show another account without switching; **Rate limits**, which keeps the usage the agent reported apart from the limits CSM observed; and **Actions**, which opens the session in CSM or in a terminal, changes its account, recovers it through the failover order, hands it off, stops it or resumes it. Nothing changes until you confirm, and an action CSM can't take for that agent says why. Right-click the item for Open CSM, Mission Control, Accounts and Quit CSM.

Closing the main window leaves CSM in the menu bar. Agents run in the csm service either way, and Quit says so before it quits. The panel's settings choose which events send a notification (approval requests, failures, usage limits, sign-ins, failed handoffs, a session moving to another account, an agent finishing), quiet hours, how many finished sessions to list, whether CSM shows in the Dock and whether it opens at login. They are saved as `menubar.json` in the app's config directory.

## Build Room

Build Room takes one request and a repository and runs it through a plan, isolated implementation, integration, checks, review and a pull request description, using the agents you have signed in to. **New build run** asks for the request, the repository and base branch, which agents to use, how many may run at once, and whether to approve the plan first, review, check the base commit and offer to push. A run's page shows the stage it is in, the plan, the tasks as a dependency graph with the agent and account working on each, and a panel for the selected task: its worktree and branch, attempts and any account or agent switch, what CSM measured in git next to what the agent reported, its diff, and retry, reassign and accept actions. The Checks, Review, Integration and History tabs show the commands CSM ran with their results, the review rounds and findings (marked as the reviewing agent's claims), the integration branch, conflicts and integrated diff, and every event. Plans can be edited before approval; runs can be paused, resumed and cancelled; pushing and opening a pull request always waits for your approval. Build Room tasks also appear in Mission Control and Activity. See the csm README for the rules the service follows.


## Skills

The Skills screen manages csm's skill library. **Installed** lists each skill with its source, revision, inspection result and how many places it was copied to; selecting one shows its details, the agents it is enabled for, every placed copy as checked on disk, compatibility per agent and its history, with update checks, enable and disable, scope and remove. **Discover** searches the public catalog and skills.sh, and **Install a skill** reads a skill from a name, a GitHub path or URL, a git URL or a local folder, shows its files, inspection findings and compatibility with each agent before anything is installed, and asks before accepting risky findings or extra permissions. **Packs** installs curated groups, **Agents** shows which skill folders each agent account reads and what is in them, and **Selection** sets how tasks get skills (manual, recommended or automatic) and the default skills. A project picker switches the view to a project's own skills.

Skills also appear where tasks run: the Build Room plan editor and task panel pin skills to a task, the task panel and receipt show the revisions used and whether each skill's use was verified from the agent's own session record, an agent's page lists what its account can load, and a handoff's page lists the skills carried to the next agent and any that were not. CSM never runs anything inside a skill; see the csm README for the rules.

## AutoFix

AutoFix lists production incidents: Sentry errors received by the local service or claimed from CSM Hub, deduplicated
by fingerprint, with their occurrence count, severity, environment and the run started for them. An AutoFix run opens in
the same run page as Build Room, with the incident's redacted evidence (exception and in-app frames), the investigation
(marked as the agent's analysis), and a reproduction and verification panel showing what CSM measured in the sandbox:
whether the failure reproduced before the fix, whether it is gone after it, whether the regression test was left
unchanged, the repository checks, and the commands with their output. Settings → Connect Sentry walks through the
whole setup: sign in to CSM Hub, choose the workspace, Sentry project and repository, copy the webhook URL into a Sentry
internal integration, paste its client secret back, and send a test. The panel then shows whether Sentry's deliveries
are arriving and whether their signatures match.
## Context Handoff

The Handoffs screen keeps **checkpoints** and **handoffs** for every project. **Save checkpoint** (also in the command palette and on a Mission Control session) asks the service to capture the task in a project without stopping its agent: the task and progress from the agent's session record, the repository state from git, and the MCP servers by name and status. The checkpoint page separates what CSM verified in the repository from what the agent's record reports, re-checks the repository each time it opens and lists anything that changed since, and lets you edit the task, next steps and notes. **Continue with another agent** opens the handoff dialog with the checkpoint attached; the service then runs the same handoff the CLI does (`csm handoff --checkpoint`). With agents chosen under **Accounts → Failover → Then hand off to**, CSM does all of this on its own when every account of the running agent hits its usage limit; those handoffs are marked automatic on the Handoffs screen and in Mission Control. A handoff's page shows its outcome as CSM observed it: how the brief was delivered, whether the agent started and where, and whether the repository still matched. See the csm README for the format and the rules.

## CSM Terminal

The Terminal screen is a real terminal: every pane is a pseudo-terminal running your login shell, created by the Rust side with `portable-pty` (the PTY layer from WezTerm) and rendered by xterm.js with the WebGL renderer. Interactive programs, the alternate screen, colours, Unicode, resizing and signals all go through the PTY. Tabs, splits, search, scrollback, shell choice and persistence of open tabs and directories are handled in `src/terminal/`; the shell integration files under the app's data directory report the working directory and prompt boundaries (OSC 7 and OSC 133) so tab titles and the status bar stay truthful. An agent's session can be opened as a terminal tab; that tab is the service's PTY for the run, not a copy.

The PTY is reachable only through Tauri IPC from the app window. Nothing about local terminals is exposed on the service socket or the network listener.

| Shortcut | Action |
|---|---|
| ⌘T · ⌘⇧T | New terminal · reopen closed |
| ⌘W · ⌘⇧W | Close pane · close tab |
| ⌘D · ⌘⇧D | Split side by side · split stacked |
| ⌘⇧] · ⌘⇧[ · ⌃Tab · ⌘1-9 | Switch tabs |
| ⌘⌥← → | Focus panes |
| ⌘F | Search output |
| ⌘⇧K | Clear |
| ⌘K · ⌘⇧P | Command palette, including terminal actions |

## Requirements

- macOS 12 or newer (Linux should work but is untested)
- `csm` (`go install github.com/onoja123/csm/cmd/csm@latest`), on your `PATH` or at `~/.local/bin/csm`, `~/go/bin/csm`, `/usr/local/bin/csm` or `/opt/homebrew/bin/csm` (or set `CSM_PATH`)
- Node 22 (see `.nvmrc`), Rust 1.92 (pinned in `rust-toolchain.toml`), Xcode command line tools

## Development

```bash
npm install
npm run app:dev      # starts Vite and the Tauri window
npm test             # vitest: API client, stores, formatting, components
npm run typecheck
npm run lint
npm run format       # Prettier; format:check is what CI runs
(cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test)
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

produces `src-tauri/target/release/bundle/macos/CSM.app`. For a disk image, run `npm run app:dmg` afterwards; it uses `hdiutil` rather than Tauri's Finder-scripted DMG, which needs automation permissions.

## Layout

```
src/
  types/       shared TypeScript types: interfaces/, enums/ (string-literal unions), aliases/
  components/  one component per file, grouped by area: ui (primitives, Icon), shell, agents,
               mission, menubar, accounts, autofix, build, handoffs, skills, terminal, palette,
               mcp, approvals, activity, tasks, sessions
  screens/     one file per route: Home, MissionControl, BuildRoom, BuildRun, AutoFix, Accounts,
               AgentDetail, Handoffs, Skills, Sessions, Tasks, Activity, MCP, Settings, Terminal and
               details,
               plus MenuBar, the menu bar panel's window
  hooks/       useBuild, useHomeDir, useMenuState, useNow, useSessions, useTerminalShortcuts, useTimeline
  store/       zustand stores: connection (bootstrap, reconnect), data (sections, event routing),
               palette, dialog and menu bar panel state
  lib/         api.ts (typed client), browser-shim.ts, format, mission (session status model),
               menubar, build, receipt, skills, timeline, hub, mcp, provider-icons, navigation
  terminal/    terminal store, pane layout, PTY bridge, OSC parsing
  design/      tokens.css, tokens.ts (shared with the future mobile app), base.css, app.css
  test/        vitest suites
src-tauri/
  src/csm.rs        socket client, SSE reader, service launcher, csm discovery
  src/terminal/     PTY sessions, shell discovery, git helpers
  src/tray.rs       menu bar item, panel window, showing and routing the main window
  src/monitor.rs    what needs attention, for the menu bar title, panel and notifications
  src/prefs.rs      menu bar settings: notifications, quiet hours, Dock, open at login
  src/lib.rs        Tauri setup and command registration
```

## Security notes

- The desktop never sees tokens, API keys or MCP secret values. CSM's own redaction applies to everything it stores; the service only adds names, statuses and timestamps.
- Approvals default to on. Turn them off in Settings if you prefer Claude Code's own prompts.
- Commands that look destructive (`rm -rf`, `git push --force`, `DROP TABLE`, …) need a second click to approve.
- Approval notifications name only the program a command runs, never the full command, which can carry secrets.
- The service is local only. Remote access for the mobile app is a separate design and is not part of this version.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Privacy

CSM Desktop collects no analytics or telemetry. It talks only to the csm service on your own machine, over a unix socket.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the checks CI runs and the code conventions, and everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
