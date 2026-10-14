import type { PlanEditTask } from './build-request.interface';
import type { PrimaryBuildAction, StageStepState } from '../enums/build.enum';

export interface PlanTaskDraft extends PlanEditTask {
  key: number;
  acceptanceText: string;
  filesText: string;
}

export interface StageStep {
  key: string;
  label: string;
  state: StageStepState;
}

export interface PrimaryAction {
  action: PrimaryBuildAction;
  label: string;
}

export interface CurrentAgent {
  provider?: string;
  account?: string;
}
