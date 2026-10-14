import type { ProviderID, RunKind, RunStatus } from '../enums/agent.enum';

export interface ProviderCapabilities {
  interactive: boolean;
  session_tracking: boolean;
  session_resume: boolean;
  tasks: boolean;
  handoff_target: boolean;
  handoff_context: boolean;
  usage_limits: boolean;
  usage_report: boolean;
  account_switching: boolean;
  mcp: boolean;
}

export interface ProviderInfo {
  id: ProviderID;
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
  resume?: boolean;
  shared_login?: boolean;
  capabilities?: ProviderCapabilities;
}

export interface TaskInfo {
  summary?: string;
  session_id?: string;
  messages?: number;
  files_modified?: string[];
  read_at?: string;
}

export interface Run {
  id: string;
  kind: RunKind;
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

export interface ResumeSessionRequest {
  provider: string;
  project_dir: string;
  session_id: string;
  cols?: number;
  rows?: number;
}

export interface RunOutput {
  run_id: string;
  data: string;
}
