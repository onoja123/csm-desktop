import type {
  Build,
  BuildGroup,
  BuildStatus,
  BuildSummary,
  BuildTask,
  BuildTaskStatus,
  CheckState,
  CurrentAgent,
  Finding,
  FindingStatus,
  PrimaryAction,
  Reproduction,
  StageStep,
  StatusTone,
  Verdict,
} from '@/types';

export const BUILD_STATUS_LABEL: Record<BuildStatus, string> = {
  draft: 'Draft',
  planning: 'Planning',
  awaiting_plan_approval: 'Plan ready for review',
  ready: 'Ready',
  running: 'Running',
  integrating: 'Integrating',
  reviewing: 'Reviewing',
  fixing: 'Fixing review findings',
  validating: 'Running checks',
  awaiting_final_approval: 'Ready for your approval',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  needs_attention: 'Needs attention',
  investigating: 'Investigating',
  reproducing: 'Reproducing',
};

export function buildTone(status: BuildStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'ok';
    case 'failed':
    case 'needs_attention':
      return 'err';
    case 'awaiting_plan_approval':
    case 'awaiting_final_approval':
      return 'warn';
    case 'cancelled':
    case 'draft':
      return 'idle';
    default:
      return 'limit';
  }
}

export const TASK_STATUS_LABEL: Record<BuildTaskStatus, string> = {
  blocked: 'Waiting on dependencies',
  ready: 'Ready',
  assigned: 'Starting',
  running: 'Running',
  needs_review: 'Needs review',
  completed: 'Completed',
  failed: 'Failed',
  needs_attention: 'Needs attention',
  cancelled: 'Cancelled',
};

export function taskTone(status: BuildTaskStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'ok';
    case 'failed':
    case 'needs_attention':
      return 'err';
    case 'running':
    case 'assigned':
      return 'limit';
    case 'ready':
    case 'needs_review':
      return 'warn';
    default:
      return 'idle';
  }
}

export const CHECK_LABEL: Record<CheckState, string> = {
  passed: 'Passed',
  failed: 'Failed',
  not_run: 'Not run',
  skipped: 'Skipped',
  blocked: 'Blocked by environment',
  baseline_failure: 'Already failing on base',
};

export function checkTone(state: CheckState): StatusTone {
  switch (state) {
    case 'passed':
      return 'ok';
    case 'failed':
      return 'err';
    case 'baseline_failure':
    case 'blocked':
      return 'warn';
    default:
      return 'idle';
  }
}

export function severityTone(f: Finding): StatusTone {
  if (f.status === 'rechecked' || f.status === 'accepted') return 'idle';
  if (f.severity === 'critical' || f.severity === 'high') return 'err';
  if (f.severity === 'medium') return 'warn';
  return 'idle';
}

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  fix_requested: 'Sent for fixing',
  rechecked: 'Re-reviewed',
  accepted: 'Accepted by you',
};

export function groupOf(b: Pick<BuildSummary, 'status'>): BuildGroup {
  switch (b.status) {
    case 'needs_attention':
    case 'failed':
      return b.status === 'failed' ? 'stopped' : 'attention';
    case 'awaiting_plan_approval':
    case 'awaiting_final_approval':
      return 'approval';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'stopped';
    default:
      return 'active';
  }
}

export const GROUP_TITLE: Record<BuildGroup, string> = {
  attention: 'Needs attention',
  approval: 'Waiting for your approval',
  active: 'Active',
  completed: 'Completed',
  stopped: 'Failed and cancelled',
};

export const GROUP_ORDER: BuildGroup[] = ['attention', 'approval', 'active', 'completed', 'stopped'];

export function isTerminal(status: BuildStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

// Columns of the dependency graph: a task sits one column right of its deepest dependency.
export function graphColumns(tasks: BuildTask[]): BuildTask[][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map<string, number>();
  const visit = (t: BuildTask, seen: Set<string>): number => {
    const known = depth.get(t.id);
    if (known !== undefined) return known;
    if (seen.has(t.id)) return 0;
    seen.add(t.id);
    let d = 0;
    for (const id of t.depends_on ?? []) {
      const dep = byId.get(id);
      if (dep) d = Math.max(d, visit(dep, seen) + 1);
    }
    depth.set(t.id, d);
    return d;
  };
  const cols: BuildTask[][] = [];
  for (const t of [...tasks].sort((a, b) => a.order - b.order)) {
    const d = t.kind === 'fix' ? Math.max(0, ...tasks.filter((o) => o.kind !== 'fix').map((o) => visit(o, new Set()) + 1)) : visit(t, new Set());
    (cols[d] ??= []).push(t);
  }
  return cols.filter(Boolean);
}

// The next thing the user can do, if anything; the server re-checks every action.
export function primaryAction(b: Build): PrimaryAction | undefined {
  if (b.status === 'awaiting_plan_approval') return { action: 'approve-plan', label: 'Approve plan and start' };
  if (b.status === 'awaiting_final_approval' && b.pr.state === 'prepared') {
    if (b.policy.allow_remote && !b.pr.blocker && !b.pr.url) return { action: 'approve-pr', label: 'Push branch and open pull request' };
    return { action: 'finish', label: 'Finish with local branch' };
  }
  return undefined;
}

export function currentAgent(b: Build, t: BuildTask): CurrentAgent {
  const attempt = [...(b.attempts ?? [])].reverse().find((a) => a.task_id === t.id);
  const live = attempt ? b.live[attempt.id] : undefined;
  if (live) return { provider: live.provider, account: live.account };
  return { provider: t.provider || undefined, account: t.account };
}

export function stageSteps(b: Build): StageStep[] {
  if (b.kind === 'autofix') return autofixSteps(b);
  const order: BuildStatus[] = ['planning', 'awaiting_plan_approval', 'running', 'integrating', 'validating', 'reviewing', 'awaiting_final_approval', 'completed'];
  const labels = ['Plan', 'Approve', 'Implement', 'Integrate', 'Check', 'Review', 'Approve', 'Done'];
  const effective: BuildStatus = b.status === 'fixing' ? 'reviewing' : b.status === 'ready' || b.status === 'draft' ? (b.tasks.length ? 'running' : 'planning') : b.status;
  let at = order.indexOf(effective);
  if (at < 0) {
    if (b.integration.head) at = order.indexOf(b.reviews?.length ? 'reviewing' : 'integrating');
    else if (b.tasks.some((t) => t.attempts?.length)) at = order.indexOf('running');
    else at = b.tasks.length ? 1 : 0;
  }
  return order.map((key, i) => ({ key: `${key}-${i}`, label: labels[i], state: i < at || (key === 'completed' && b.status === 'completed') ? 'done' : i === at ? 'current' : 'todo' }));
}

function autofixSteps(b: Build): StageStep[] {
  const order: BuildStatus[] = ['investigating', 'reproducing', 'running', 'integrating', 'validating', 'reviewing', 'awaiting_final_approval', 'completed'];
  const labels = ['Investigate', 'Reproduce', 'Fix', 'Integrate', 'Verify', 'Review', 'Approve PR', 'Done'];
  let at = order.indexOf(b.status === 'fixing' ? 'reviewing' : b.status === 'draft' || b.status === 'ready' ? 'investigating' : b.status);
  if (at < 0) {
    const v = b.verification;
    if (b.integration.head) at = order.indexOf(b.reviews?.length ? 'reviewing' : 'validating');
    else if (b.tasks.length) at = order.indexOf('running');
    else if (v && v.reproduction !== 'not_attempted') at = order.indexOf('reproducing');
    else at = 0;
  }
  return order.map((key, i) => ({ key: `${key}-${i}`, label: labels[i], state: i < at || (key === 'completed' && b.status === 'completed') ? 'done' : i === at ? 'current' : 'todo' }));
}

export const REPRO_LABEL: Record<Reproduction, string> = {
  not_attempted: 'Not attempted',
  reproduced: 'Reproduced',
  not_reproduced: 'Not reproduced',
  inconclusive: 'Inconclusive',
  blocked: 'Blocked',
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  not_run: 'Not verified yet',
  fixed_and_verified: 'Fixed and verified',
  tests_passed_reproduction_unconfirmed: 'Tests pass, reproduction unconfirmed',
  verification_failed: 'Verification failed',
  verification_blocked: 'Verification blocked',
};

export function verdictTone(v: Verdict): StatusTone {
  if (v === 'fixed_and_verified') return 'ok';
  if (v === 'verification_failed') return 'err';
  if (v === 'not_run') return 'idle';
  return 'warn';
}

export function reproTone(r: Reproduction): StatusTone {
  if (r === 'reproduced') return 'ok';
  if (r === 'not_attempted') return 'idle';
  return 'warn';
}

export function severityToneOf(s?: string): StatusTone {
  if (s === 'critical' || s === 'high') return 'err';
  if (s === 'medium') return 'warn';
  return 'idle';
}

export function slugify(title: string, taken: string[]): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'task';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}
