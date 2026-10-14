import type { ProviderID } from '../enums/agent.enum';
import type { IncidentStatus, Reproduction, Verdict } from '../enums/autofix.enum';
import type { Signal } from './signal.interface';

export interface Investigation {
  classification: string;
  summary?: string;
  root_cause?: string;
  evidence?: string[];
  files?: string[];
  fix_plan?: string;
  confidence?: string;
  test?: RegressionTest;
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
  status: IncidentStatus;
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
  hub?: AutofixHubConnection;
}

export interface RegressionTest {
  language: string;
  package?: string;
  name: string;
  files: string[];
}

export interface AutofixHubConnection {
  url: string;
  connected: boolean;
  runner?: string;
  workspace?: string;
  last_sync?: string;
  last_error?: string;
}

export interface AutofixConfigPatch {
  sentry_secret?: string;
  mappings?: RepoMapping[];
  auto_start?: boolean;
  hub_url?: string;
  hub_token?: string;
}
