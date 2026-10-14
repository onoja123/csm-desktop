export type BuildStatus =
  | 'draft'
  | 'planning'
  | 'awaiting_plan_approval'
  | 'ready'
  | 'running'
  | 'integrating'
  | 'reviewing'
  | 'fixing'
  | 'validating'
  | 'awaiting_final_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs_attention'
  | 'investigating'
  | 'reproducing';

export type BuildTaskStatus = 'blocked' | 'ready' | 'assigned' | 'running' | 'needs_review' | 'completed' | 'failed' | 'needs_attention' | 'cancelled';

export type BuildRecovery =
  | 'retry'
  | 'retry_plan'
  | 'write_plan'
  | 'retry_task'
  | 'continue_integration'
  | 'retry_resolve'
  | 'accept_findings'
  | 'retry_review'
  | 'skip_review'
  | 'retry_investigation'
  | 'retry_reproduction'
  | 'continue_unreproduced';

export type BuildAction =
  | 'approve-plan'
  | 'retry-plan'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'retry-task'
  | 'assign'
  | 'accept-task'
  | 'continue-integration'
  | 'retry-resolve'
  | 'accept-findings'
  | 'retry-review'
  | 'skip-review'
  | 'retry'
  | 'approve-pr'
  | 'finish'
  | 'retry-investigation'
  | 'retry-reproduction'
  | 'continue-unreproduced';

export type BuildGroup = 'attention' | 'approval' | 'active' | 'completed' | 'stopped';

export type BuildRunTab = 'timeline' | 'plan' | 'checks' | 'review' | 'integration';

export type BuildTaskKind = 'implement' | 'fix';

export type BuildAttemptRole = 'plan' | 'implement' | 'fix' | 'resolve' | 'review';

export type BuildAttemptStatus = 'running' | 'reported' | 'completed' | 'failed' | 'stopped' | 'interrupted';

export type PrimaryBuildAction = 'approve-plan' | 'approve-pr' | 'finish';

export type StageStepState = 'done' | 'current' | 'todo';

export type OutcomeFactState = 'done' | 'current' | 'skipped' | 'failed';
