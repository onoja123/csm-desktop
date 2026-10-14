import type { Build, BuildEvent, CheckResult } from './types';
import { isTerminal } from './build';

export type StepState = 'done' | 'running' | 'failed' | 'skipped' | 'point';

export interface TimelineStep {
  id: string;
  phase: string;
  label: string;
  agent?: string;
  start: number;
  end?: number;
  state: StepState;
  // background steps run alongside the phase's main work, so the bar leaves them out.
  background?: boolean;
  // was is the same measurement on the base commit, for a before/after reading.
  notes: { text: string; was?: string }[];
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

const t = (e: BuildEvent) => new Date(e.at).getTime();

export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export function offset(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function agentOf(message: string): string | undefined {
  return /^(.+?\))[: ]/.exec(message)?.[1];
}

function checkNotes(checks: CheckResult[], stage: 'baseline' | 'integration', base: CheckResult[]): TimelineStep['notes'] {
  return checks
    .filter((c) => c.stage === stage)
    .map((c) => {
      const before = stage === 'integration' ? base.find((b) => b.name === c.name) : undefined;
      const state = c.state === 'passed' ? duration(c.duration_ms) : c.state.replace(/_/g, ' ');
      return { text: `${c.name} · ${state}`, was: before ? (before.state === 'passed' ? duration(before.duration_ms) : before.state.replace(/_/g, ' ')) : undefined };
    });
}

// buildTimeline pairs each *.started event with the event that ends it, so every step has a start, an end and a phase.
export function buildTimeline(b: Build, now = Date.now()): Timeline {
  const events = [...b.events].sort((x, y) => t(x) - t(y));
  const origin = events.length ? Math.min(t(events[0]), new Date(b.created_at).getTime() || t(events[0])) : new Date(b.created_at).getTime();
  const fix = b.kind === 'autofix';
  const steps: TimelineStep[] = [];
  const open = new Map<string, TimelineStep>();
  const checks = b.checks ?? [];
  const base = checks.filter((c) => c.stage === 'baseline');
  const agents = new Map<string, string>();
  let reviewRound = 0;

  const begin = (key: string, s: Omit<TimelineStep, 'state' | 'notes' | 'id'> & { notes?: TimelineStep['notes'] }) => {
    const step: TimelineStep = { id: `${key}-${steps.length}`, state: 'running', notes: [], ...s };
    steps.push(step);
    open.set(key, step);
    return step;
  };
  const finish = (key: string, at: number, state: StepState = 'done') => {
    const step = open.get(key);
    if (!step) return undefined;
    step.end = at;
    step.state = state;
    open.delete(key);
    return step;
  };
  const point = (phase: string, label: string, at: number, state: StepState = 'point') => steps.push({ id: `p-${steps.length}`, phase, label, start: at, end: at, state, notes: [] });

  for (const e of events) {
    const at = t(e);
    switch (e.kind) {
      case 'agent.started':
        if (e.task_id) agents.set(e.task_id, agentOf(e.message) ?? '');
        break;
      case 'investigation.started':
        begin('investigate', { phase: 'Investigate', label: 'Investigation', start: at });
        break;
      case 'investigation.completed': {
        const s = finish('investigate', at);
        if (s) s.agent = agentOf(e.message.replace(/^Investigation by /, ''));
        break;
      }
      case 'plan.started':
        begin('plan', { phase: 'Plan', label: 'Draft the plan', start: at, agent: agentOf(e.message.replace(/^.*? by /, '')) });
        break;
      case 'plan.generated':
      case 'plan.invalid':
        finish('plan', at, e.kind === 'plan.invalid' ? 'failed' : 'done');
        break;
      case 'plan.approved':
        point('Plan', 'Plan approved', at);
        break;
      case 'reproduction.started':
        begin('repro', { phase: 'Reproduce', label: b.investigation?.test?.name ? `Reproduce with ${b.investigation.test.name}` : 'Reproduce the failure', start: at });
        break;
      case 'reproduction.completed': {
        const repro = b.verification?.reproduction;
        const s = finish('repro', at, repro && repro !== 'reproduced' ? 'failed' : 'done');
        if (s && b.verification?.reproduction_reason) s.notes.push({ text: b.verification.reproduction_reason });
        break;
      }
      case 'reproduction.waived':
        point('Reproduce', 'Continued without a reproduction', at, 'skipped');
        break;
      case 'task.scheduled':
      case 'task.assigned':
        if (e.task_id && !open.has(`task-${e.task_id}`)) {
          const task = b.tasks.find((x) => x.id === e.task_id);
          begin(`task-${e.task_id}`, { phase: task?.kind === 'fix' ? 'Review fixes' : fix ? 'Fix' : 'Build', label: task?.title ?? e.task_id, start: at, agent: agents.get(e.task_id) || undefined });
        }
        break;
      case 'task.completed':
      case 'task.failed':
        if (e.task_id) {
          const s = finish(`task-${e.task_id}`, at, e.kind === 'task.failed' ? 'failed' : 'done');
          if (s && !s.agent) s.agent = agents.get(e.task_id);
        }
        break;
      case 'integration.started':
        begin('integrate', { phase: 'Integrate', label: 'Merge the task branches', start: at });
        break;
      case 'integration.conflict':
        finish('integrate', at, 'failed');
        break;
      case 'baseline.started':
        begin('baseline', { phase: fix ? 'Fix' : 'Build', label: 'Checks on the base commit', start: at, background: true });
        break;
      case 'baseline.completed': {
        const s = finish('baseline', at);
        if (s) s.notes = checkNotes(checks, 'baseline', base);
        break;
      }
      case 'validation.started':
        finish('integrate', at);
        begin('validate', { phase: fix ? 'Verify' : 'Check', label: 'Checks on the result', start: at });
        break;
      case 'validation.completed': {
        const failed = checks.some((c) => c.stage === 'integration' && c.state === 'failed' && c.baseline !== 'failed');
        const s = finish('validate', at, failed ? 'failed' : 'done');
        if (s) s.notes = checkNotes(checks, 'integration', base);
        break;
      }
      case 'verification.started':
        begin('verify', { phase: 'Verify', label: 'Regression test on the fix', start: at });
        break;
      case 'verification.completed': {
        const v = b.verification;
        const s = finish('verify', at, v?.verdict === 'verification_failed' ? 'failed' : 'done');
        if (s && v) {
          if (v.failure_gone !== undefined) s.notes.push({ text: v.failure_gone ? 'passes now' : 'still fails', was: v.reproduction === 'reproduced' ? 'failing on base' : undefined });
          if (v.test_unchanged === false) s.notes.push({ text: 'the fix changed the regression test' });
        }
        break;
      }
      case 'review.started':
        reviewRound++;
        begin('review', {
          phase: 'Review',
          label: `Review round ${reviewRound}`,
          start: at,
          agent: agentOf(e.message.replace(/^Review round \d+ by /, '')) ?? e.message.replace(/^Review round \d+ by /, ''),
        });
        break;
      case 'review.completed': {
        const s = finish('review', at);
        const n = /(\d+) finding/.exec(e.message)?.[1];
        const blocking = /(\d+) blocking/.exec(e.message)?.[1];
        if (s && n) s.notes.push({ text: `${n === '0' ? 'no' : n} finding${n === '1' ? '' : 's'}${blocking && blocking !== '0' ? `, ${blocking} blocking` : ''}` });
        break;
      }
      case 'review.skipped':
        point('Review', 'Review skipped', at, 'skipped');
        break;
      case 'final.ready':
        point('Approve', 'Ready for your approval', at);
        break;
      case 'pr.created':
        point('Approve', 'Pull request opened', at);
        break;
      case 'completed':
        point('Approve', 'Completed', at);
        break;
      case 'attention':
        point(steps[steps.length - 1]?.phase ?? 'Run', 'Needs your attention', at, 'failed');
        break;
    }
  }

  const live = !isTerminal(b.status) && b.status !== 'awaiting_final_approval' && b.status !== 'needs_attention' && !b.paused;
  const last = events.length ? t(events[events.length - 1]) : origin;
  const end = live ? Math.max(now, last) : last;
  for (const s of steps) if (s.end === undefined) s.state = live ? 'running' : b.status === 'cancelled' ? 'skipped' : 'failed';

  steps.sort((x, y) => x.start - y.start);
  const phases: TimelinePhase[] = [];
  for (const s of steps) {
    let p = phases[phases.length - 1];
    if (!p || p.name !== s.phase) {
      p = { name: s.phase, start: s.start, end: s.end ?? end, steps: [], current: false };
      phases.push(p);
    }
    p.steps.push(s);
    p.end = Math.max(p.end, s.end ?? end);
  }
  for (const p of phases) p.steps.sort((x, y) => Number(!!x.background) - Number(!!y.background));
  const latest = [...phases].reverse().find((p) => p.steps.some((s) => s.state !== 'point' && s.state !== 'skipped'));
  if (latest) latest.current = true;
  return { origin, end, steps, phases, live };
}
