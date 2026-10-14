export type RunState =
  | 'received'
  | 'triaging'
  | 'ready'
  | 'investigating'
  | 'reproducing'
  | 'planning'
  | 'awaiting_approval'
  | 'implementing'
  | 'integrating'
  | 'verifying'
  | 'reviewing'
  | 'correcting'
  | 'awaiting_attention'
  | 'awaiting_pr_authorization'
  | 'pr_opened'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type Reproduction = 'not_attempted' | 'reproduced' | 'not_reproduced' | 'inconclusive' | 'blocked';

export type Verdict = 'not_run' | 'fixed_and_verified' | 'tests_passed_reproduction_unconfirmed' | 'verification_failed' | 'verification_blocked';

export type AutofixTab = 'incidents' | 'settings';

export type IncidentStatus = 'open' | 'unmapped' | 'run_started';
