import type { ProviderID } from '../enums/agent.enum';
import type { HandoffCompleteness, HandoffDelivery, HandoffOutcomeStatus, HandoffPreviewMode, TaskOrigin } from '../enums/handoff.enum';
import type { MCPStatus } from '../enums/mcp.enum';

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

export interface CheckpointVerification {
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

export interface HandoffOutcome {
  status: HandoffOutcomeStatus;
  delivery: HandoffDelivery;
  started: boolean;
  started_at?: string;
  project_dir?: string;
  verification: CheckpointVerification;
  problems?: string[];
}

export interface Handoff {
  version: number;
  id: string;
  kind?: 'checkpoint';
  created_at: string;
  updated_at?: string;
  completeness?: HandoffCompleteness;
  edits?: CheckpointEdits;
  checkpoint?: string;
  outcome?: HandoffOutcome;
  source_commit?: string;
  current?: CheckpointVerification;
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
  mode: HandoffPreviewMode;
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

export interface CheckpointEditRequest {
  task?: string;
  next_steps?: string[];
  notes?: string;
}

export interface CheckpointTask {
  text?: string;
  origin: TaskOrigin;
}
