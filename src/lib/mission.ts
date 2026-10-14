import type { Account, Activity, Approval, ExternalRun, Health, ProviderID, Run, Status } from './types';
import type { Pane, Tab } from '@/terminal/types';
import { paneIds } from '@/terminal/layout';
import { PROVIDER_LONG_NAMES, PROVIDER_NAMES, baseName, duration, isZeroTime } from './format';
import type { Tone } from '@/design/tokens';

export type SessionStatus = 'attention' | 'waiting' | 'running' | 'idle' | 'completed' | 'disconnected';

export type AttentionKind = 'exit' | 'usage_limit' | 'login' | 'handoff';

export interface SessionAttention {
  kind: AttentionKind;
  reason: string;
  detail?: string;
}

export interface SessionSwitch {
  from: string;
  to: string;
  reason: string;
  at: string;
}

export interface TerminalLink {
  tabId: string;
  tabIndex: number;
  paneId: string;
  kind: 'agent' | 'shell';
}

export interface AgentSession {
  id: string;
  kind: 'agent' | 'handoff' | 'external';
  runId?: string;
  provider: ProviderID;
  providerName: string;
  account: string;
  accountHealth?: Health;
  projectDir: string;
  project: string;
  branch?: string;
  title?: string;
  buildId?: string;
  sessionId?: string;
  status: SessionStatus;
  label: string;
  detail?: string;
  attention?: SessionAttention;
  approval?: Approval;
  switched?: SessionSwitch;
  terminal?: TerminalLink;
  startedAt: string;
  endedAt?: string;
  lastOutputAt?: string;
  exitCode?: number;
  live: boolean;
  observable: boolean;
  filesModified: number;
  messages?: number;
  canResume: boolean;
}

export interface MissionInput {
  runs: Run[];
  external: ExternalRun[];
  approvals: Approval[];
  activity: Activity[];
  accounts: Account[];
  status?: Status;
  tabs: Tab[];
  panes: Record<string, Pane>;
  connected: boolean;
  now: number;
}

export const IDLE_AFTER_MS = 60_000;

const STOP_CODES = new Set([129, 130, 143]);

export const STATUS_ORDER: SessionStatus[] = ['attention', 'waiting', 'running', 'idle', 'completed', 'disconnected'];

export const STATUS_LABEL: Record<SessionStatus, string> = {
  attention: 'Needs attention',
  waiting: 'Waiting',
  running: 'Running',
  idle: 'Idle',
  completed: 'Completed',
  disconnected: 'Disconnected',
};

export function statusTone(status: SessionStatus): Tone {
  switch (status) {
    case 'attention':
      return 'err';
    case 'waiting':
      return 'warn';
    case 'running':
      return 'ok';
    default:
      return 'idle';
  }
}

function time(value?: string): number {
  if (!value || isZeroTime(value)) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Activity details end with the project path as the service displays it, home shortened to "~".
export function mentionsProject(detail: string | undefined, projectDir: string): boolean {
  if (!detail) return false;
  const shown = detail.split(' · ').pop()?.trim() ?? '';
  if (!shown) return false;
  if (shown === projectDir) return true;
  return shown.startsWith('~/') && projectDir.endsWith(shown.slice(1));
}

function parseSwitch(a: Activity): { from: string; to: string } | undefined {
  const m = /^CSM switched (.+?) → (.+)$/.exec(a.title);
  if (m) return { from: m[1], to: m[2] };
  const h = /^Automatic handoff after a usage limit: (\S+) → (\S+)$/.exec(a.title);
  return h ? { from: h[1], to: h[2] } : undefined;
}

interface ProjectEvents {
  usageLimit?: Activity;
  switched?: Activity;
  handoffFailed?: Activity;
}

function eventsFor(activity: Activity[], provider: ProviderID, projectDir: string, since: number): ProjectEvents {
  const out: ProjectEvents = {};
  for (const a of activity) {
    if (a.provider !== provider || time(a.at) < since || !mentionsProject(a.detail, projectDir)) continue;
    if (a.kind === 'usage_limit' && !out.usageLimit) out.usageLimit = a;
    else if ((a.kind === 'switch' || a.kind === 'handoff.automatic') && !out.switched) out.switched = { ...a, detail: a.kind === 'handoff.automatic' ? `usage limit, another agent · ${a.detail ?? ''}` : a.detail };
    else if (a.kind === 'handoff.failed' && !out.handoffFailed) out.handoffFailed = a;
  }
  return out;
}

function findTerminal(tabs: Tab[], panes: Record<string, Pane>, match: (p: Pane) => boolean): TerminalLink | undefined {
  for (let i = 0; i < tabs.length; i++) {
    for (const id of paneIds(tabs[i].layout)) {
      const pane = panes[id];
      if (pane && match(pane)) return { tabId: tabs[i].id, tabIndex: i + 1, paneId: id, kind: pane.kind };
    }
  }
  return undefined;
}

function quietFor(lastOutputAt: string | undefined, startedAt: string, now: number): string {
  const since = time(lastOutputAt) || time(startedAt);
  return duration(Math.max(0, Math.floor((now - since) / 1000)));
}

function normalizeRun(run: Run, input: MissionInput): AgentSession {
  const started = time(run.started_at);
  const events = eventsFor(input.activity, run.provider, run.project_dir, started);
  const approval = input.approvals.find((a) => a.run_id === run.id);
  const account = input.accounts.find((a) => a.name === run.account && a.provider === run.provider);
  const live = run.status === 'running';
  const lastOutput = time(run.last_output_at);
  const sw = events.switched && parseSwitch(events.switched);
  const switchedAt = time(events.switched?.at);
  const limitAt = time(events.usageLimit?.at);

  const base: AgentSession = {
    id: run.id,
    kind: run.kind,
    runId: run.id,
    provider: run.provider,
    providerName: PROVIDER_LONG_NAMES[run.provider] ?? run.provider,
    account: run.account,
    accountHealth: account?.health,
    projectDir: run.project_dir,
    project: baseName(run.project_dir),
    branch: run.branch,
    title: run.task.summary || (run.label ? `Build Room · ${run.label}` : undefined),
    buildId: run.build_id,
    sessionId: run.session_id,
    status: 'running',
    label: 'Running',
    approval,
    switched: sw && events.switched ? { ...sw, reason: events.switched.detail?.split(' · ')[0] ?? '', at: events.switched.at } : undefined,
    terminal: findTerminal(input.tabs, input.panes, (p) => p.kind === 'agent' && p.runId === run.id),
    startedAt: run.started_at,
    endedAt: run.ended_at && !isZeroTime(run.ended_at) ? run.ended_at : undefined,
    lastOutputAt: run.last_output_at && !isZeroTime(run.last_output_at) ? run.last_output_at : undefined,
    exitCode: run.exit_code,
    live,
    observable: true,
    filesModified: run.task.files_modified?.length ?? 0,
    messages: run.task.messages,
    canResume: !live && !!run.session_id && !!input.status?.providers.find((p) => p.id === run.provider)?.resume,
  };

  if (!input.connected) {
    return { ...base, status: 'disconnected', label: 'Disconnected', detail: 'The CSM service is not reachable; this is the last known state.' };
  }

  let attention: SessionAttention | undefined;
  if (events.handoffFailed) {
    attention = { kind: 'handoff', reason: 'Handoff failed', detail: events.handoffFailed.detail };
  } else if (events.usageLimit && limitAt > switchedAt) {
    const on = events.usageLimit.account ?? run.account;
    attention = live
      ? { kind: 'usage_limit', reason: `Usage limit on ${on}`, detail: 'No account switch has been recorded since.' }
      : { kind: 'usage_limit', reason: `Stopped by a usage limit on ${on}`, detail: 'No account switch has been recorded since.' };
  } else if (!live && run.exit_code !== undefined && run.exit_code !== 0 && !STOP_CODES.has(run.exit_code)) {
    attention = { kind: 'exit', reason: `Exited with status ${run.exit_code}` };
  } else if (live && account?.health === 'authentication_required') {
    attention = { kind: 'login', reason: `Login required for ${run.account}`, detail: account.last_failure_text };
  }

  if (attention) return { ...base, status: 'attention', label: 'Needs attention', detail: attention.reason, attention };

  if (!live) {
    if (run.exit_code !== undefined && STOP_CODES.has(run.exit_code)) return { ...base, status: 'completed', label: 'Stopped', detail: run.build_id ? 'Ended by Build Room' : `Exit status ${run.exit_code}` };
    return { ...base, status: 'completed', label: 'Completed', detail: run.exit_code === undefined ? undefined : `Exit status ${run.exit_code}` };
  }

  if (approval) {
    return { ...base, status: 'waiting', label: 'Waiting for approval', detail: approval.command || approval.tool_name };
  }

  const quietSince = lastOutput || started;
  if (input.now - quietSince >= IDLE_AFTER_MS) {
    return { ...base, status: 'idle', label: 'Idle', detail: `No output for ${quietFor(run.last_output_at, run.started_at, input.now)}` };
  }

  return base;
}

function normalizeExternal(run: ExternalRun, input: MissionInput): AgentSession {
  const account = input.accounts.find((a) => a.name === run.account && a.provider === run.provider);
  const started = time(run.started_at);
  const events = eventsFor(input.activity, run.provider, run.project_dir, started);
  const sw = events.switched && parseSwitch(events.switched);
  const base: AgentSession = {
    id: run.id,
    kind: 'external',
    provider: run.provider,
    providerName: PROVIDER_LONG_NAMES[run.provider] ?? run.provider,
    account: run.account,
    accountHealth: account?.health,
    projectDir: run.project_dir,
    project: baseName(run.project_dir),
    sessionId: run.session_id,
    status: 'running',
    label: 'Running in a terminal',
    detail: 'Started with the csm command; its output is not visible here.',
    switched: sw && events.switched ? { ...sw, reason: events.switched.detail?.split(' · ')[0] ?? '', at: events.switched.at } : undefined,
    terminal: findTerminal(input.tabs, input.panes, (p) => p.kind === 'shell' && p.cwd === run.project_dir && !p.exited),
    startedAt: run.started_at,
    live: true,
    observable: false,
    filesModified: 0,
    canResume: false,
  };

  if (!input.connected) return { ...base, status: 'disconnected', label: 'Disconnected', detail: 'The CSM service is not reachable; this is the last known state.' };

  if (events.usageLimit && time(events.usageLimit.at) > time(events.switched?.at)) {
    const attention: SessionAttention = { kind: 'usage_limit', reason: `Usage limit on ${events.usageLimit.account ?? run.account}`, detail: 'No account switch has been recorded since.' };
    return { ...base, status: 'attention', label: 'Needs attention', detail: attention.reason, attention };
  }

  if (account?.health === 'authentication_required') {
    const attention: SessionAttention = { kind: 'login', reason: `Login required for ${run.account}`, detail: account.last_failure_text };
    return { ...base, status: 'attention', label: 'Needs attention', detail: attention.reason, attention };
  }

  return base;
}

export function normalizeSessions(input: MissionInput): AgentSession[] {
  const out = [...input.runs.map((r) => normalizeRun(r, input)), ...input.external.map((r) => normalizeExternal(r, input))];
  return sortSessions(out);
}

export function sortSessions(sessions: AgentSession[]): AgentSession[] {
  return [...sessions].sort((a, b) => {
    const d = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (d !== 0) return d;
    return time(b.startedAt) - time(a.startedAt);
  });
}

export type StatusFilter = 'all' | SessionStatus;

export type GroupBy = 'status' | 'project' | 'provider';

export interface SessionGroup {
  key: string;
  title: string;
  meta?: string;
  sessions: AgentSession[];
}

export function matchesQuery(s: AgentSession, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [s.providerName, PROVIDER_NAMES[s.provider], s.account, s.project, s.projectDir, s.branch, s.title, s.sessionId, s.label, s.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

export function filterSessions(sessions: AgentSession[], filter: StatusFilter, query: string): AgentSession[] {
  return sessions.filter((s) => (filter === 'all' || s.status === filter) && matchesQuery(s, query));
}

export function countByStatus(sessions: AgentSession[]): Record<SessionStatus, number> {
  const counts: Record<SessionStatus, number> = { attention: 0, waiting: 0, running: 0, idle: 0, completed: 0, disconnected: 0 };
  for (const s of sessions) counts[s.status]++;
  return counts;
}

export function groupSessions(sessions: AgentSession[], by: GroupBy): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  const push = (key: string, title: string, s: AgentSession, meta?: string) => {
    const g = groups.get(key) ?? { key, title, meta, sessions: [] };
    g.sessions.push(s);
    groups.set(key, g);
  };

  for (const s of sessions) {
    if (by === 'status') push(s.status, STATUS_LABEL[s.status], s);
    else if (by === 'provider') push(s.provider, s.providerName, s);
    else push(s.projectDir, s.project, s, s.projectDir);
  }

  const list = Array.from(groups.values());
  if (by === 'status') list.sort((a, b) => STATUS_ORDER.indexOf(a.key as SessionStatus) - STATUS_ORDER.indexOf(b.key as SessionStatus));
  else list.sort((a, b) => STATUS_ORDER.indexOf(a.sessions[0].status) - STATUS_ORDER.indexOf(b.sessions[0].status) || a.title.localeCompare(b.title));
  return list;
}

export function needsAttention(s: AgentSession): boolean {
  return s.status === 'attention' || s.status === 'waiting';
}
