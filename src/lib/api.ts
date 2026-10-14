import { invoke } from '@tauri-apps/api/core';
import type {
  Account,
  Activity,
  ApprovalsView,
  Approval,
  AutofixConfig,
  Incident,
  RepoMapping,
  Build,
  BuildAction,
  BuildDiff,
  Receipt,
  BuildPolicy,
  BuildPreflight,
  BuildSummary,
  PlanEditTask,
  Failover,
  FailoverPolicy,
  Handoff,
  HandoffPreview,
  MCPAccount,
  Project,
  ProviderID,
  Run,
  RunsView,
  ServiceInfo,
  SessionEntry,
  Settings,
  StartRunRequest,
  Status,
  SwitchResult,
  HubSetup,
  HubSignin,
  HubStatus,
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
  setHandoffTo: (providers: ProviderID[]) => call<Failover>('PUT', '/v1/failover', { handoff_to: providers }),

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
  previewHandoff: (projectDir: string, targetAccount: string, checkpointId?: string) =>
    call<HandoffPreview>('POST', '/v1/handoffs', { project_dir: projectDir, target_account: targetAccount, checkpoint_id: checkpointId ?? '', preview: true }),
  createHandoff: (projectDir: string, targetAccount: string, checkpointId?: string, size?: { cols: number; rows: number }) =>
    call<HandoffPreview>('POST', '/v1/handoffs', { project_dir: projectDir, target_account: targetAccount, checkpoint_id: checkpointId ?? '', ...size }),
  createCheckpoint: (projectDir: string, edits?: { task?: string; next_steps?: string[]; notes?: string }) =>
    call<Handoff>('POST', '/v1/checkpoints', { project_dir: projectDir, ...edits }),
  editCheckpoint: (project: string, id: string, edits: { task?: string; next_steps?: string[]; notes?: string }) =>
    call<Handoff>('PATCH', `/v1/handoffs/${encodeURIComponent(project)}/${encodeURIComponent(id)}`, edits),

  mcp: (projectDir?: string) => call<MCPAccount[]>('GET', '/v1/mcp' + q({ project_dir: projectDir })),

  approvals: () => call<ApprovalsView>('GET', '/v1/approvals'),
  decide: (id: string, decision: 'allow' | 'deny', reason?: string) =>
    call<Approval>('POST', `/v1/approvals/${id}/decision`, { decision, reason }),

  builds: () => call<BuildSummary[]>('GET', '/v1/builds'),
  build: (id: string) => call<Build>('GET', `/v1/builds/${encodeURIComponent(id)}`),
  buildPreflight: (projectDir: string) => call<BuildPreflight>('GET', '/v1/builds/preflight' + q({ project_dir: projectDir })),
  createBuild: (req: { instruction: string; project_dir: string; base_branch?: string; policy: Partial<BuildPolicy>; custom_checks?: string[]; skip_detected_checks?: boolean }) =>
    call<Build>('POST', '/v1/builds', req),
  editPlan: (id: string, plan: { summary?: string; tasks: PlanEditTask[] }) => call<Build>('PUT', `/v1/builds/${encodeURIComponent(id)}/plan`, plan),
  buildAction: (id: string, action: BuildAction, req: { task?: string; provider?: string } = {}) =>
    call<Build>('POST', `/v1/builds/${encodeURIComponent(id)}/actions/${action}`, req),
  buildReceipt: (id: string) => call<Receipt>('GET', `/v1/builds/${encodeURIComponent(id)}/receipt`),
  buildDiff: (id: string, target: string) => call<BuildDiff>('GET', `/v1/builds/${encodeURIComponent(id)}/diff` + q({ target })),

  signals: () => call<Incident[]>('GET', '/v1/signals'),
  startIncidentRun: (id: string) => call<BuildSummary>('POST', `/v1/incidents/${encodeURIComponent(id)}/runs`),
  autofixConfig: () => call<AutofixConfig>('GET', '/v1/autofix'),
  updateAutofixConfig: (patch: { sentry_secret?: string; mappings?: RepoMapping[]; auto_start?: boolean; hub_url?: string; hub_token?: string }) =>
    call<AutofixConfig>('PUT', '/v1/autofix', patch),
  hubSignin: (body: { url: string; email: string; password: string; name?: string; create_account?: boolean }) => call<HubSignin>('POST', '/v1/autofix/hub/signin', body),
  hubSetup: (body: HubSetup) => call<HubStatus>('POST', '/v1/autofix/hub/setup', body),
  hubSecret: (secret: string) => call<HubStatus>('PUT', '/v1/autofix/hub/secret', { secret }),
  hubStatus: () => call<HubStatus>('GET', '/v1/autofix/hub/status'),
  hubTest: () => call<{ ok: boolean; message: string }>('POST', '/v1/autofix/hub/test'),

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
