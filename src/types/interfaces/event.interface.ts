import type { BuildStatus } from '../enums/build.enum';

export interface TauriEvent {
  event: string;
  id: number;
  payload: unknown;
}

export interface HelloPayload {
  pid: number;
  version: string;
}

export interface RunExitPayload {
  run_id: string;
  exit_code: number;
}

export interface BuildChangedPayload {
  id: string;
  status: BuildStatus;
}

export interface ConnectionEventPayload {
  connected: boolean;
  error?: string;
}
