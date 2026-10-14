import type { ProviderID } from '../enums/agent.enum';
import type { CheckDef } from './build-check.interface';
import type { BuildPolicy } from './build.interface';

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

export interface CreateBuildRequest {
  instruction: string;
  project_dir: string;
  base_branch?: string;
  policy: Partial<BuildPolicy>;
  custom_checks?: string[];
  skip_detected_checks?: boolean;
}

export interface PlanEdit {
  summary?: string;
  tasks: PlanEditTask[];
}

export interface BuildActionRequest {
  task?: string;
  provider?: string;
}
