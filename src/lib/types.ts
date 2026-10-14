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
  resume?: boolean;
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
  handoff_to?: ProviderID[];
  handoff_description?: string;
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
  build_id?: string;
  build_task?: string;
  label?: string;
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
  head?: string;
  head_subject?: string;
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

export interface CheckpointEdits {
  task?: string;
  next_steps?: string[];
  notes?: string;
  edited_at?: string;
}

export interface Verification {
  checked_at: string;
  repo_exists: boolean;
  same_root: boolean;
  branch_was?: string;
  branch_now?: string;
  head_was?: string;
  head_now?: string;
  tree_changed: boolean;
  missing_files?: string[];
}

export type OutcomeStatus = 'starting' | 'complete' | 'partial' | 'failed';

export interface HandoffOutcome {
  status: OutcomeStatus;
  delivery: 'opening_instruction' | 'file_only' | 'none';
  started: boolean;
  started_at?: string;
  project_dir?: string;
  verification: Verification;
  problems?: string[];
}

export interface Handoff {
  version: number;
  id: string;
  kind?: 'checkpoint';
  created_at: string;
  updated_at?: string;
  completeness?: 'complete' | 'partial';
  edits?: CheckpointEdits;
  checkpoint?: string;
  outcome?: HandoffOutcome;
  source_commit?: string;
  current?: Verification;
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
  checkpoint?: string;
  changes?: string[];
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
  | { type: 'activity'; data: Activity }
  | { type: 'build'; data: { id: string; status: BuildStatus } }
  | { type: 'signals'; data: null };

export type BuildStatus =
  | 'draft'
  | 'planning'
  | 'awaiting_plan_approval'
  | 'ready'
  | 'running'
  | 'integrating'
  | 'reviewing'
  | 'fixing'
  | 'validating'
  | 'awaiting_final_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs_attention'
  | 'investigating'
  | 'reproducing';

export type BuildTaskStatus = 'blocked' | 'ready' | 'assigned' | 'running' | 'needs_review' | 'completed' | 'failed' | 'needs_attention' | 'cancelled';

export type CheckState = 'passed' | 'failed' | 'not_run' | 'skipped' | 'blocked' | 'baseline_failure';

export type BuildRecovery =
  | 'retry'
  | 'retry_plan'
  | 'write_plan'
  | 'retry_task'
  | 'continue_integration'
  | 'retry_resolve'
  | 'accept_findings'
  | 'retry_review'
  | 'skip_review'
  | 'retry_investigation'
  | 'retry_reproduction'
  | 'continue_unreproduced';

export type BuildAction =
  | 'approve-plan'
  | 'retry-plan'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'retry-task'
  | 'assign'
  | 'accept-task'
  | 'continue-integration'
  | 'retry-resolve'
  | 'accept-findings'
  | 'retry-review'
  | 'skip-review'
  | 'retry'
  | 'approve-pr'
  | 'finish'
  | 'retry-investigation'
  | 'retry-reproduction'
  | 'continue-unreproduced';

export interface CheckDef {
  name: string;
  command: string[];
  source: string;
}

export interface BuildPolicy {
  max_parallel: number;
  require_plan_approval: boolean;
  review: boolean;
  max_review_cycles: number;
  agents?: ProviderID[];
  planner?: ProviderID | '';
  reviewer?: ProviderID | '';
  checks?: CheckDef[];
  run_baseline: boolean;
  allow_remote: boolean;
}

export interface AgentSwitch {
  at: string;
  from: string;
  to: string;
  reason?: string;
  started: boolean;
  handoff?: string;
  commit?: string;
  from_session?: string;
  to_session?: string;
}

export interface BuildAttempt {
  id: string;
  role: 'plan' | 'implement' | 'fix' | 'resolve' | 'review';
  task_id?: string;
  provider: ProviderID;
  account?: string;
  run_id?: string;
  dir: string;
  status: 'running' | 'reported' | 'completed' | 'failed' | 'stopped' | 'interrupted';
  started_at: string;
  ended_at?: string;
  exit_code?: number;
  note?: string;
  switches?: AgentSwitch[];
  started_as?: string;
}

export interface AcceptanceClaim {
  criterion: string;
  addressed: boolean;
  note?: string;
}

export interface Completion {
  files_changed: string[] | null;
  diff_stat?: string;
  commit?: string;
  summary?: string;
  claimed_files?: string[];
  claimed_commands?: string[];
  claimed_tests?: string[];
  limitations?: string[];
  acceptance?: AcceptanceClaim[];
  discrepancies?: string[];
  report_missing?: boolean;
  report_unparseable?: boolean;
}

export interface BuildTask {
  id: string;
  kind: 'implement' | 'fix';
  title: string;
  objective: string;
  scope?: string;
  acceptance?: string[];
  context?: string;
  files?: string[];
  depends_on?: string[];
  provider?: ProviderID | '';
  account?: string;
  status: BuildTaskStatus;
  branch?: string;
  worktree?: string;
  base_commit?: string;
  head?: string;
  attempts?: BuildAttempt[];
  completion?: Completion;
  findings?: string[];
  cycle?: number;
  problem?: string;
  recovery?: string;
  started_at?: string;
  finished_at?: string;
  order: number;
  integrated?: boolean;
  switches?: AgentSwitch[];
}

export interface CheckResult {
  name: string;
  command: string[];
  source: string;
  stage: 'baseline' | 'integration';
  state: CheckState;
  exit_code?: number;
  duration_ms: number;
  output?: string;
  reason?: string;
  at: string;
  baseline?: CheckState;
}

export type EvidenceStatus = 'passed' | 'failed' | 'timed_out' | 'pre_existing_failure' | 'skipped' | 'unavailable' | 'inconclusive';
export type ClaimStatus = 'confirmed' | 'contradicted' | 'unverifiable';
export type ReceiptOutcome = 'verified' | 'failed' | 'partially_verified' | 'unverified';

export interface TestCounts {
  unit: string;
  passed: number;
  failed: number;
  skipped?: number;
  total: number;
  from: string;
}

export interface ReceiptCheck {
  name: string;
  command: string;
  source?: string;
  stage: string;
  status: EvidenceStatus;
  exit_code?: number;
  duration_ms: number;
  commit?: string;
  reason?: string;
  tests?: TestCounts;
  output?: string;
  at?: string;
}

export interface ReceiptClaim {
  task_id?: string;
  agent?: string;
  kind: string;
  claim: string;
  status: ClaimStatus;
  evidence: string;
}

export interface ReceiptAgentSwitch {
  at: string;
  from: string;
  to: string;
  reason?: string;
  commit?: string;
}

export interface ReceiptAgent {
  role: string;
  task_id?: string;
  agent: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  note?: string;
  switches?: ReceiptAgentSwitch[];
}

export interface ReceiptReview {
  enabled: boolean;
  rounds?: { cycle: number; agent: string; independent: boolean; verdict?: string; status: string; findings: number; commit?: string }[];
  independent: boolean;
  open_blocking: number;
  open_non_blocking: number;
  fix_requested: number;
  rechecked: number;
  accepted_by_user: number;
  check_findings: number;
  open_findings?: string[];
}

export interface ReceiptDrift {
  checked_at: string;
  where: string;
  head?: string;
  uncommitted?: string[];
  same_as_verified: boolean;
  note: string;
  unreadable?: boolean;
}

export interface Receipt {
  version: number;
  generated_at: string;
  build_id: string;
  kind?: string;
  title: string;
  status: BuildStatus;
  final: boolean;
  partial: boolean;
  partial_reasons?: string[];
  repo: string;
  repo_name: string;
  base_branch?: string;
  base_commit?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  outcome: ReceiptOutcome;
  headline: string;
  revision: { branch?: string; commit?: string; head?: string; dirty_at_check?: boolean; files?: string[]; diff_stat?: string; mixed?: boolean };
  checks: ReceiptCheck[];
  baseline?: ReceiptCheck[];
  claims: ReceiptClaim[];
  agents: ReceiptAgent[];
  review: ReceiptReview;
  acceptance: { passed: boolean; reasons: string[] };
  pull_request: { state: string; url?: string; pushed: boolean; error?: string };
  drift?: ReceiptDrift;
  limitations: string[];
}

export interface Finding {
  id: string;
  cycle: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file?: string;
  line?: number;
  title: string;
  explanation?: string;
  reasoning?: string;
  recommendation?: string;
  blocking: boolean;
  task_id?: string;
  status: 'open' | 'fix_requested' | 'rechecked' | 'accepted';
  source: string;
}

export interface ReviewRound {
  cycle: number;
  provider: ProviderID;
  account?: string;
  independent: boolean;
  note?: string;
  verdict?: string;
  summary?: string;
  commit?: string;
  ignored_edits?: string[];
  status: 'running' | 'completed' | 'failed';
  at: string;
  blocking_open: number;
  findings: number;
}

export interface BuildConflict {
  task_id: string;
  files: string[];
  tasks: string[] | null;
  status: string;
  resolution?: string;
  at: string;
}

export interface BuildEvent {
  at: string;
  kind: string;
  task_id?: string;
  message: string;
}

export interface BuildSummary {
  id: string;
  title: string;
  instruction: string;
  repo: string;
  repo_name: string;
  base_branch: string;
  status: BuildStatus;
  paused: boolean;
  attention?: string;
  tasks: number;
  tasks_completed: number;
  tasks_running: number;
  tasks_failed: number;
  agents: ProviderID[];
  pr_url?: string;
  kind?: 'autofix';
  severity?: string;
  source?: string;
  verdict?: Verdict;
  state: RunState;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CheckSummary {
  Passed: number;
  Failed: number;
  Baseline: number;
  Blocked: number;
  Skipped: number;
  NotRun: number;
}

export interface Build {
  id: string;
  instruction: string;
  title: string;
  repo: string;
  repo_name: string;
  base_branch: string;
  base_commit: string;
  status: BuildStatus;
  paused?: boolean;
  cancel_requested?: boolean;
  attention?: string;
  recovery?: BuildRecovery[];
  policy: BuildPolicy;
  plan: { summary?: string; layers?: string[]; considerations?: string[]; suggested_checks?: string[]; source?: string; edited_by_user?: boolean };
  tasks: BuildTask[];
  attempts?: BuildAttempt[];
  checks?: CheckResult[];
  reviews?: ReviewRound[];
  findings?: Finding[];
  integration: {
    branch?: string;
    worktree?: string;
    head?: string;
    merged?: string[];
    overlaps?: { file: string; tasks: string[] }[];
    conflicts?: BuildConflict[];
    diff_stat?: string;
    files?: string[];
    pending?: string;
  };
  pr: {
    state: string;
    title?: string;
    body_file?: string;
    branch?: string;
    base?: string;
    remote?: string;
    url?: string;
    pushed?: boolean;
    approved?: boolean;
    error?: string;
    blocker?: string;
  };
  cycle: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  source_dirty?: boolean;
  kind?: 'autofix';
  signal?: Signal;
  incident_id?: string;
  investigation?: Investigation;
  verification?: RunVerification;
  hub?: { url: string; run_id: string; job_id?: string; synced_events: number; state?: string };
  events: BuildEvent[];
  live: Record<string, { run_status: string; provider: ProviderID; account: string; last_output_at?: string }>;
  ops: string[];
  summary: BuildSummary;
  verified: boolean;
  check_summary: CheckSummary;
}

export interface AgentChoice {
  id: ProviderID;
  name: string;
  eligible: boolean;
  account?: string;
  reason?: string;
}

export interface BuildPreflight {
  repo: string;
  repo_name: string;
  branch: string;
  branches: string[] | null;
  head: string;
  dirty: string[] | null;
  checks: CheckDef[];
  agents: AgentChoice[];
  defaults: BuildPolicy;
}

export interface BuildDiff {
  target: string;
  base: string;
  head: string;
  files: string[];
  stat: string;
  diff: string;
  truncated: boolean;
}

export interface PlanEditTask {
  id: string;
  title: string;
  objective: string;
  scope?: string;
  acceptance?: string[];
  context?: string;
  files?: string[];
  depends_on?: string[];
  provider?: ProviderID | '';
}

export type RunState =
  | 'received'
  | 'triaging'
  | 'ready'
  | 'investigating'
  | 'reproducing'
  | 'planning'
  | 'awaiting_approval'
  | 'implementing'
  | 'integrating'
  | 'verifying'
  | 'reviewing'
  | 'correcting'
  | 'awaiting_attention'
  | 'awaiting_pr_authorization'
  | 'pr_opened'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type Reproduction = 'not_attempted' | 'reproduced' | 'not_reproduced' | 'inconclusive' | 'blocked';

export type Verdict = 'not_run' | 'fixed_and_verified' | 'tests_passed_reproduction_unconfirmed' | 'verification_failed' | 'verification_blocked';

export interface SignalFrame {
  file?: string;
  function?: string;
  line?: number;
  in_app: boolean;
  context?: string;
}

export interface Signal {
  id?: string;
  source: string;
  event_type: string;
  external_id: string;
  issue_id?: string;
  fingerprint: string;
  title: string;
  message?: string;
  culprit?: string;
  severity: string;
  environment?: string;
  release?: string;
  repository: { project?: string; name?: string; branch?: string; commit?: string };
  occurred_at: string;
  received_at: string;
  link?: string;
  evidence: {
    kind: string;
    sentry?: {
      platform?: string;
      exceptions?: { type: string; value?: string; module?: string; frames?: SignalFrame[] }[];
      tags?: Record<string, string>;
      count?: number;
      user_count?: number;
      request?: string;
    };
  };
}

export interface Investigation {
  classification: string;
  summary?: string;
  root_cause?: string;
  evidence?: string[];
  files?: string[];
  fix_plan?: string;
  confidence?: string;
  test?: { language: string; package?: string; name: string; files: string[] };
  commit?: string;
  worktree?: string;
  branch?: string;
  ignored_edits?: string[];
  source?: string;
}

export interface SandboxResult {
  exit_code: number;
  output?: string;
  duration: number;
  timed_out?: boolean;
  sandboxed: boolean;
  runner: string;
  image?: string;
  error?: string;
  limits?: string;
  started_at: string;
  command: string[];
}

export interface RunVerification {
  reproduction: Reproduction;
  reproduction_reason?: string;
  before?: SandboxResult;
  after?: SandboxResult;
  failure_gone?: boolean;
  test_unchanged?: boolean;
  checks_passed?: boolean;
  new_failures?: string[];
  verdict: Verdict;
  notes?: string[];
}

export interface Incident {
  id: string;
  fingerprint: string;
  source: string;
  project?: string;
  title: string;
  severity: string;
  environment?: string;
  first_seen: string;
  last_seen: string;
  count: number;
  signals: string[];
  runs: string[] | null;
  status: 'open' | 'unmapped' | 'run_started';
  note?: string;
  latest?: Signal;
}

export interface RepoMapping {
  source: string;
  project: string;
  repo: string;
  base_branch?: string;
  agents?: ProviderID[];
  disabled?: boolean;
}

export interface AutofixConfig {
  has_sentry_secret: boolean;
  mappings: RepoMapping[];
  auto_start: boolean;
  webhook_path: string;
  hub?: { url: string; connected: boolean; runner?: string; workspace?: string; last_sync?: string; last_error?: string };
}

export interface HubWorkspace {
  id: string;
  name: string;
  role?: string;
}

export type DeliveryResult = 'recorded' | 'duplicate' | 'ignored' | 'test' | 'invalid_signature' | 'no_secret' | 'invalid_payload';

export interface HubIntegration {
  id: string;
  kind: string;
  name: string;
  webhook_url: string;
  has_secret: boolean;
  last_delivery_at?: string;
  last_delivery_result?: DeliveryResult;
  last_event_at?: string;
}

export interface HubStatus {
  url: string;
  public: boolean;
  signed_in?: string;
  reachable: boolean;
  error?: string;
  workspace?: HubWorkspace;
  runner?: string;
  integrations: HubIntegration[];
  mappings: { source: string; project: string; repository: string; base_branch: string }[];
  has_local_secret: boolean;
}

export interface HubSignin {
  url: string;
  email: string;
  public: boolean;
  workspaces: HubWorkspace[];
}

export interface HubSetup {
  workspace_id?: string;
  workspace_name?: string;
  project: string;
  repo: string;
  repository?: string;
  base_branch?: string;
}
