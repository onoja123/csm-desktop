import type { TimelineStepState } from '../enums/timeline.enum';

export interface TimelineStep {
  id: string;
  phase: string;
  label: string;
  agent?: string;
  start: number;
  end?: number;
  state: TimelineStepState;
  // background steps run alongside the phase's main work, so the bar leaves them out.
  background?: boolean;
  notes: TimelineNote[];
}

export interface TimelinePhase {
  name: string;
  start: number;
  end: number;
  steps: TimelineStep[];
  current: boolean;
}

export interface Timeline {
  origin: number;
  end: number;
  steps: TimelineStep[];
  phases: TimelinePhase[];
  live: boolean;
}

export interface TimelineNote {
  text: string;
  // was is the same measurement on the base commit, for a before/after reading.
  was?: string;
}
