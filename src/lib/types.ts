export type ProviderID = 'claude' | 'codex' | 'gemini' | 'copilot';

export type Health = 'healthy' | 'warning' | 'rate_limited' | 'authentication_required' | 'unavailable' | 'unknown';

export type AccountStatus = 'ready' | 'disabled' | 'not authenticated' | 'cooldown';

export type FailoverPolicy = 'automatic' | 'manual' | 'disabled';

export interface UsageWindow {
  used_percent: number;
  resets_at: string;
}

export interface Usage {
  five_hour?: UsageWindow;
  seven_day?: UsageWindow;
  spend_limit?: UsageWindow;
  limited?: boolean;
}

export interface ProviderInfo {
  id: ProviderID;
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}

export interface Status {
  service: { version: string; pid: number; started_at: string; socket: string; home: string };
  failover_policy: FailoverPolicy;
  providers: ProviderInfo[];
  accounts: number;
  live_runs: number;
  pending_approvals: number;
  approvals_enabled: boolean;
}

export interface Settings {
  approvals_enabled: boolean;
  recent_projects?: string[];
}

export interface Account {
  name: string;
  provider: ProviderID;
  provider_name: string;
  email?: string;
  active: boolean;
  enabled: boolean;
  health: Health;
  status: AccountStatus;
  priority: number;
  usage_label: string;
  usage?: Usage;
  usage_updated_at?: string;
  last_used_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_failure?: string;
  last_failure_text?: string;
  failures_24h: number;
  cooldown_until?: string;
  verified_at?: string;
  created_at: string;
  profile_dir: string;
  failover_eligible: boolean;
  advice?: string;
  running: boolean;
}

export interface SwitchResult {
  mode: 'none' | 'session' | 'active';
  account: string;
  project?: string;
  message: string;
}

export interface Failover {
  policy: FailoverPolicy;
  description: string;
  providers: { provider: ProviderID; provider_name: string; priority: string[]; would_switch: string[] }[];
}

export interface TaskInfo {
  summary?: string;
  session_id?: string;
  messages?: number;
  files_modified?: string[];
  read_at?: string;
}

export type RunStatus = 'running' | 'exited';

export interface Run {
  id: string;
  kind: 'agent' | 'handoff';
  provider: ProviderID;
  account: string;
  project_dir: string;
  branch?: string;
  args?: string[];
  status: RunStatus;
  started_at: string;
  ended_at?: string;
  exit_code?: number;
  csm_pid: number;
  last_output_at?: string;
  session_id?: string;
  agent_pid?: number;
  task: TaskInfo;
  duration_seconds: number;
}

export interface ExternalRun {
  id: string;
  kind: 'external';
  provider: ProviderID;
  account: string;
  project_dir: string;
  status: RunStatus;
  started_at: string;
  csm_pid: number;
  session_id?: string;
  agent_pid?: number;
  duration_seconds: number;
}

export interface RunsView {
  runs: Run[];
  external: ExternalRun[];
}

export interface StartRunRequest {
  provider: ProviderID;
  project_dir: string;
  args?: string[];
  resume_session_id?: string;
  cols?: number;
  rows?: number;
}

export interface SessionEntry {
  id: string;
  kind: 'live' | 'checkpoint';
  provider: ProviderID;
  account: string;
  session_id?: string;
  project_dir: string;
  branch?: string;
  started_at?: string;
  checkpointed_at?: string;
  reason?: string;
  reason_text?: string;
  detail?: string;
  live: boolean;
  can_resume: boolean;
}

export interface HandoffAgent {
  provider: string;
  account: string;
  profile_dir?: string;
  session_id?: string;
}

export interface HandoffContext {
  user_requests?: string[];
  last_assistant?: string;
  files_read?: string[];
  files_modified?: string[];
  files_created?: string[];
  files_deleted?: string[];
  commands?: string[];
  decisions?: string[];
  next_steps?: string[];
  messages?: number;
  note?: string;
}

export interface HandoffGit {
  root?: string;
  working_dir: string;
  branch?: string;
  worktree?: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
  status?: string[];
  status_truncated?: boolean;
  diff_stat?: string;
  diff_file?: string;
  diff_truncated?: boolean;
  recent_commits?: string[];
}

export interface MCPResult {
  server: string;
  status: MCPStatus;
  reason?: string;
  requires_auth?: boolean;
  stateful?: boolean;
}

export interface Handoff {
  version: number;
  id: string;
  created_at: string;
  stage: string;
  reason?: string;
  source: HandoffAgent;
  target: HandoffAgent;
  resumed?: boolean;
  context: HandoffContext;
  git: HandoffGit;
  mcp?: MCPResult[];
  previous?: string;
  error?: string;
  project: string;
  project_dir?: string;
  dir: string;
  markdown?: string;
}

export interface HandoffPreview {
  mode: 'session' | 'checkpoint' | 'fresh' | 'none';
  source?: string;
  source_account?: string;
  target: ProviderID;
  target_account: string;
  session_id?: string;
  task_context: string;
  git_state: string;
  message: string;
  run_id?: string;
}

export type MCPStatus = 'migrated' | 'available' | 'requires_auth' | 'unsupported' | 'failed' | 'unknown';

export interface MCPServer {
  name: string;
  transport: 'stdio' | 'http' | 'sse' | 'ws';
  command?: string;
  args?: string[];
  url?: string;
  env?: string[];
  headers?: string[];
  env_refs?: string[];
  provider: string;
  scope: string;
  source: string;
  approved?: boolean;
  disabled?: boolean;
  oauth?: boolean;
  secret_args?: boolean;
  state: 'stateless' | 'stateful' | 'unknown';
  status: MCPStatus;
  reason?: string;
  requires_auth: boolean;
}

export interface MCPAccount {
  account: string;
  provider: ProviderID;
  provider_name: string;
  error?: string;
  servers: MCPServer[];
}

export interface Approval {
  id: string;
  run_id?: string;
  provider: ProviderID;
  account: string;
  session_id?: string;
  tool_name: string;
  command?: string;
  description?: string;
  input?: unknown;
  destructive: boolean;
  requested_at: string;
  decision?: 'allow' | 'deny' | '';
  decided_at?: string;
}

export interface ApprovalsView {
  pending: Approval[];
  recent: Approval[];
}

export interface Activity {
  id: string;
  at: string;
  kind: string;
  provider?: ProviderID;
  account?: string;
  title: string;
  detail?: string;
  run_id?: string;
  refs?: Record<string, string>;
}

export interface Project {
  dir: string;
  display: string;
  branch?: string;
  is_git: boolean;
  last_seen?: string;
  exists: boolean;
}

export interface ServiceInfo {
  home: string;
  socket: string;
  csm_path?: string;
  csm_version?: string;
  socket_present: boolean;
}

export type StreamEvent =
  | { type: 'hello'; data: { pid: number; version: string } }
  | { type: 'status' | 'accounts' | 'runs' | 'sessions' | 'handoffs' | 'projects'; data: null }
  | { type: 'run.output'; data: { run_id: string; data: string } }
  | { type: 'run.exit'; data: { run_id: string; exit_code: number } }
  | { type: 'approval.requested' | 'approval.resolved'; data: Approval }
  | { type: 'activity'; data: Activity };
