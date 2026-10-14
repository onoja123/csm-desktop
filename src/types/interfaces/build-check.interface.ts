import type { CheckStage, CheckState } from '../enums/check.enum';

export interface CheckDef {
  name: string;
  command: string[];
  source: string;
}

export interface CheckResult {
  name: string;
  command: string[];
  source: string;
  stage: CheckStage;
  state: CheckState;
  exit_code?: number;
  duration_ms: number;
  output?: string;
  reason?: string;
  at: string;
  baseline?: CheckState;
}
