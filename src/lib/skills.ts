import type {
  FileDiff,
  SkillEntryStatus,
  SkillFileChange,
  SkillFindingLevel,
  SkillInspectionStatus,
  SkillLevel,
  SkillOutcomeStatus,
  SkillRecord,
  SkillSeverity,
  SkillState,
  StatusTone,
} from '@/types';

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  compatible: 'Compatible',
  adapted: 'Adapted',
  partial: 'Partly supported',
  unsupported: 'Unsupported',
  unknown: 'Not verified',
};

export function levelTone(level?: SkillLevel): StatusTone {
  switch (level) {
    case 'compatible':
    case 'adapted':
      return 'ok';
    case 'partial':
      return 'warn';
    case 'unsupported':
      return 'err';
    default:
      return 'idle';
  }
}

export const INSPECTION_LABEL: Record<SkillInspectionStatus, string> = {
  clean: 'No warnings',
  review: 'Read before use',
  risky: 'Risky',
};

export function inspectionTone(status: SkillInspectionStatus): StatusTone {
  return status === 'clean' ? 'ok' : status === 'review' ? 'warn' : 'err';
}

export function severityTone(s: SkillSeverity): StatusTone {
  return s === 'high' ? 'err' : s === 'warning' ? 'warn' : 'idle';
}

// Only 'invoked' rests on the agent's own session record; every other state is about availability.
export const STATE_LABEL: Record<SkillState, string> = {
  recommended: 'Recommended',
  selected: 'Selected',
  resolved: 'Resolved',
  projected: 'Available to the agent',
  requested: 'Named in the instruction',
  invoked: 'Loaded (verified)',
  unverified: 'Use unverified',
  failed: 'Failed',
  unavailable: 'Unavailable',
};

export function stateTone(s: SkillState): StatusTone {
  switch (s) {
    case 'invoked':
      return 'ok';
    case 'unverified':
      return 'warn';
    case 'failed':
    case 'unavailable':
      return 'err';
    default:
      return 'idle';
  }
}

export function outcomeTone(s: SkillOutcomeStatus): StatusTone {
  switch (s) {
    case 'placed':
    case 'up to date':
    case 'shared':
    case 'native':
      return 'ok';
    case 'changed':
    case 'unsupported':
      return 'warn';
    case 'removed':
      return 'idle';
    default:
      return 'err';
  }
}

export function entryTone(s: SkillEntryStatus): StatusTone {
  switch (s) {
    case 'available':
      return 'ok';
    case 'available, partly':
    case 'duplicate':
    case 'edited':
      return 'warn';
    default:
      return 'err';
  }
}

export function findingTone(level: SkillFindingLevel): StatusTone {
  return level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'err';
}

export function placementStateTone(state: string): StatusTone {
  if (state === 'ok') return 'ok';
  if (state.startsWith('missing')) return 'err';

  return 'warn';
}

export function scopeLabel(r: SkillRecord): string {
  const projects = r.projects?.length ?? 0;

  if (r.global && projects) return `Global + ${projects} project${projects === 1 ? '' : 's'}`;
  if (r.global) return 'Global';
  if (projects === 1) return 'One project';
  if (projects) return `${projects} projects`;

  return 'Not placed';
}

export function sourceLabel(r: {
  source: { type: string; repo?: string; path?: string; url?: string };
}): string {
  const s = r.source;

  if (s.repo) return `github.com/${s.repo}${s.path ? '/' + s.path : ''}`;

  return s.path || s.url || s.type;
}

export function licenseText(skill?: string, repo?: string): string {
  if (skill) return skill;
  if (repo) return `Not stated in the skill; the repository is ${repo}`;

  return 'Not stated';
}

export function toFileDiff(c: SkillFileChange): FileDiff {
  const lines = (c.diff ?? '')
    .split('\n')
    .filter((l) => !l.startsWith('--- ') && !l.startsWith('+++ ') && l !== '');

  return {
    path: `${c.path} (${c.change})`,
    lines,
    added: lines.filter((l) => l.startsWith('+')).length,
    removed: lines.filter((l) => l.startsWith('-')).length,
  };
}
