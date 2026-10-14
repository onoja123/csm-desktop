import type { Activity } from '../interfaces/activity.interface';
import type { Approval } from '../interfaces/approval.interface';
import type { RunOutput } from '../interfaces/agent.interface';
import type { BuildChangedPayload, HelloPayload, RunExitPayload } from '../interfaces/event.interface';

export type TauriCallback = (payload: unknown) => void;

export type OutputListener = (bytes: Uint8Array) => void;

export type StreamEvent =
  | { type: 'hello'; data: HelloPayload }
  | { type: 'status' | 'accounts' | 'runs' | 'sessions' | 'handoffs' | 'projects'; data: null }
  | { type: 'run.output'; data: RunOutput }
  | { type: 'run.exit'; data: RunExitPayload }
  | { type: 'approval.requested' | 'approval.resolved'; data: Approval }
  | { type: 'activity'; data: Activity }
  | { type: 'build'; data: BuildChangedPayload }
  | { type: 'signals'; data: null };
