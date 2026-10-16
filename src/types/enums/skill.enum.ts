export type SkillLevel = 'compatible' | 'adapted' | 'partial' | 'unsupported' | 'unknown';

export type SkillInspectionStatus = 'clean' | 'review' | 'risky';

export type SkillSeverity = 'info' | 'warning' | 'high';

export type SkillState =
  | 'recommended'
  | 'selected'
  | 'resolved'
  | 'projected'
  | 'requested'
  | 'invoked'
  | 'unverified'
  | 'failed'
  | 'unavailable';

export type SkillOrigin = 'explicit' | 'default' | 'automatic' | 'recommended' | 'handoff';

export type SkillMode = 'manual' | 'recommended' | 'automatic';

export type SkillOutcomeStatus =
  | 'placed'
  | 'up to date'
  | 'shared'
  | 'native'
  | 'conflict'
  | 'changed'
  | 'unsupported'
  | 'removed'
  | 'failed';

export type SkillEntryStatus =
  | 'available'
  | 'available, partly'
  | 'duplicate'
  | 'invalid'
  | 'unusable'
  | 'not placed'
  | 'edited';

export type SkillFindingLevel = 'ok' | 'warn' | 'fail';

export type SkillsTab = 'installed' | 'discover' | 'packs' | 'agents' | 'selection';

export type SkillAction =
  'enable' | 'disable' | 'scope' | 'remove' | 'update' | 'rollback' | 'keep' | 'revert' | 'sync';
