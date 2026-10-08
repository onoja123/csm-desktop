import { invoke } from '@tauri-apps/api/core';
import type {
  Account,
  Activity,
  ApprovalsView,
  Approval,
  Failover,
  FailoverPolicy,
  Handoff,
  HandoffPreview,
  MCPAccount,
  Project,
  Run,
  RunsView,
  ServiceInfo,
  SessionEntry,
  Settings,
  StartRunRequest,
  Status,
  SwitchResult,
} from './types';

interface RawResponse {
  status: number;
  body: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: RawResponse;

  try {
    res = await invoke<RawResponse>('csm_request', { method, path, body: body === undefined ? null : JSON.stringify(body) });
  } catch (e) {
    throw new ConnectionError(typeof e === 'string' ? e : String(e));
  }

  if (res.status >= 400) {
    let message = res.body;

    try {
      message = (JSON.parse(res.body) as { error?: string }).error ?? res.body;
    } catch {
      // Not JSON; keep the raw body.
    }

    throw new ApiError(res.status, message);
  }

  return res.body ? (JSON.parse(res.body) as T) : (undefined as T);
}

const q = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
};

export const api = {
  status: () => call<Status>('GET', '/v1/status'),
  settings: () => call<Settings>('GET', '/v1/settings'),
  updateSettings: (patch: Partial<Settings>) => call<Settings>('PUT', '/v1/settings', patch),

  accounts: () => call<Account[]>('GET', '/v1/accounts'),
  account: (name: string) => call<Account>('GET', `/v1/accounts/${encodeURIComponent(name)}`),
  switchAccount: (name: string, projectDir?: string) =>
    call<SwitchResult>('POST', `/v1/accounts/${encodeURIComponent(name)}/switch`, { project_dir: projectDir ?? '' }),
  enableAccount: (name: string) => call<Account>('POST', `/v1/accounts/${encodeURIComponent(name)}/enable`),
  disableAccount: (name: string) => call<Account>('POST', `/v1/accounts/${encodeURIComponent(name)}/disable`),
  setPriority: (name: string, position: number) =>
    call<Account>('POST', `/v1/accounts/${encodeURIComponent(name)}/priority`, { position }),
  refreshUsage: (name: string) => call<Account>('POST', `/v1/accounts/${encodeURIComponent(name)}/usage/refresh`),

  failover: () => call<Failover>('GET', '/v1/failover'),
  setFailover: (policy: FailoverPolicy) => call<Failover>('PUT', '/v1/failover', { policy }),

  runs: () => call<RunsView>('GET', '/v1/runs'),
  startRun: (req: StartRunRequest) => call<Run>('POST', '/v1/runs', req),
  run: (id: string) => call<Run>('GET', `/v1/runs/${id}`),
  runOutput: (id: string) => call<{ run_id: string; data: string }>('GET', `/v1/runs/${id}/output`),
  sendInput: (id: string, text: string) => call<void>('POST', `/v1/runs/${id}/input`, { text }),
  sendBytes: (id: string, data: string) => call<void>('POST', `/v1/runs/${id}/input`, { data }),
  resize: (id: string, cols: number, rows: number) => call<void>('POST', `/v1/runs/${id}/resize`, { cols, rows }),
  stopRun: (id: string) => call<void>('POST', `/v1/runs/${id}/stop`),
  forgetRun: (id: string) => call<void>('DELETE', `/v1/runs/${id}`),

  sessions: () => call<SessionEntry[]>('GET', '/v1/sessions'),
  resumeSession: (req: { provider: string; project_dir: string; session_id: string; cols?: number; rows?: number }) =>
    call<Run>('POST', '/v1/sessions/resume', req),

  handoffs: () => call<Handoff[]>('GET', '/v1/handoffs'),
  handoff: (project: string, id: string) => call<Handoff>('GET', `/v1/handoffs/${encodeURIComponent(project)}/${encodeURIComponent(id)}`),
  previewHandoff: (projectDir: string, targetAccount: string) =>
    call<HandoffPreview>('POST', '/v1/handoffs', { project_dir: projectDir, target_account: targetAccount, preview: true }),
  createHandoff: (projectDir: string, targetAccount: string, size?: { cols: number; rows: number }) =>
    call<HandoffPreview>('POST', '/v1/handoffs', { project_dir: projectDir, target_account: targetAccount, ...size }),

  mcp: (projectDir?: string) => call<MCPAccount[]>('GET', '/v1/mcp' + q({ project_dir: projectDir })),

  approvals: () => call<ApprovalsView>('GET', '/v1/approvals'),
  decide: (id: string, decision: 'allow' | 'deny', reason?: string) =>
    call<Approval>('POST', `/v1/approvals/${id}/decision`, { decision, reason }),

  activity: (limit = 200) => call<Activity[]>('GET', '/v1/activity' + q({ limit })),

  projects: () => call<Project[]>('GET', '/v1/projects'),
  addProject: (dir: string) => call<Project>('POST', '/v1/projects', { dir }),
};

export const service = {
  info: () => invoke<ServiceInfo>('csm_info'),
  start: () => invoke<string>('csm_start_service'),
  stop: () => invoke<string>('csm_stop_service'),
  subscribe: () => invoke<boolean>('csm_subscribe'),
};
