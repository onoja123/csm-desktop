import type { ProviderID } from '../enums/agent.enum';
import type { RunState, Verdict } from '../enums/autofix.enum';
import type {
  BuildAttemptRole,
  BuildAttemptStatus,
  BuildRecovery,
  BuildStatus,
  BuildTaskKind,
  BuildTaskStatus,
} from '../enums/build.enum';
import type { Investigation, RunVerification } from './autofix.interface';
import type { CheckDef, CheckResult } from './build-check.interface';
import type { Finding, ReviewRound } from './build-review.interface';
import type { Signal } from './signal.interface';

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
  role: BuildAttemptRole;
  task_id?: string;
  provider: ProviderID;
  account?: string;
  run_id?: string;
  dir: string;
  status: BuildAttemptStatus;
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
  kind: BuildTaskKind;
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
  plan: BuildPlan;
  tasks: BuildTask[];
  attempts?: BuildAttempt[];
  checks?: CheckResult[];
  reviews?: ReviewRound[];
  findings?: Finding[];
  integration: BuildIntegration;
  pr: BuildPullRequest;
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
  hub?: BuildHubLink;
  events: BuildEvent[];
  live: Record<string, BuildLiveRun>;
  ops: string[];
  summary: BuildSummary;
  verified: boolean;
  check_summary: CheckSummary;
}

export interface BuildPlan {
  summary?: string;
  layers?: string[];
  considerations?: string[];
  suggested_checks?: string[];
  source?: string;
  edited_by_user?: boolean;
}

export interface BuildFileOverlap {
  file: string;
  tasks: string[];
}

export interface BuildIntegration {
  branch?: string;
  worktree?: string;
  head?: string;
  merged?: string[];
  overlaps?: BuildFileOverlap[];
  conflicts?: BuildConflict[];
  diff_stat?: string;
  files?: string[];
  pending?: string;
}

export interface BuildPullRequest {
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
}

export interface BuildHubLink {
  url: string;
  run_id: string;
  job_id?: string;
  synced_events: number;
  state?: string;
}

export interface BuildLiveRun {
  run_status: string;
  provider: ProviderID;
  account: string;
  last_output_at?: string;
}
