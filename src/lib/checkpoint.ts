import type {
  CheckpointTask,
  CheckpointVerification,
  Handoff,
  HandoffOutcome,
  StatusTone,
} from '@/types';
import { PROVIDER_LONG_NAMES } from './format';

export function isCheckpoint(h: Handoff): boolean {
  return h.kind === 'checkpoint';
}

export function taskOf(h: Handoff): CheckpointTask {
  if (h.edits?.task) return { text: h.edits.task, origin: 'user' };

  const last = h.context.user_requests?.at(-1);

  if (last) return { text: last, origin: 'session' };

  return { origin: 'none' };
}

export function originLabel(h: Handoff): string {
  const { origin } = taskOf(h);

  if (origin === 'user') return 'Written by you';

  if (origin === 'session')
    return `Last request in the ${PROVIDER_LONG_NAMES[h.source.provider as keyof typeof PROVIDER_LONG_NAMES] ?? h.source.provider} session record`;

  return h.context.note || 'No task was recorded. Add one before handing off.';
}

export function stepsOf(h: Handoff): string[] {
  if (h.edits?.next_steps?.length) return h.edits.next_steps;

  return h.context.next_steps ?? [];
}

export function shortSha(sha?: string): string {
  return sha ? sha.slice(0, 7) : '';
}

// Mirrors Verification.Problems in the Go handoff package so the UI and the brief say the same thing.
export function driftOf(v: CheckpointVerification): string[] {
  if (!v.repo_exists) return ['The repository recorded in the checkpoint no longer exists.'];

  const out: string[] = [];

  if (!v.same_root)
    out.push('The current directory is a different repository from the one in the checkpoint.');

  if ((v.branch_was ?? '') !== (v.branch_now ?? ''))
    out.push(
      `The branch changed from ${v.branch_was || '(detached HEAD)'} to ${v.branch_now || '(detached HEAD)'} since the checkpoint.`,
    );

  if (v.head_was && v.head_was !== v.head_now)
    out.push(
      `HEAD moved from ${shortSha(v.head_was)} to ${shortSha(v.head_now)} since the checkpoint.`,
    );

  if (v.tree_changed) out.push('The working tree changed since the checkpoint.');

  if (v.missing_files?.length)
    out.push(`Files named in the checkpoint are missing: ${v.missing_files.join(', ')}.`);

  return out;
}

export function outcomeLabel(o: HandoffOutcome): string {
  switch (o.status) {
    case 'complete':
      return 'Completed';
    case 'partial':
      return 'Partly completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Starting';
  }
}

export function outcomeTone(o: HandoffOutcome): StatusTone {
  switch (o.status) {
    case 'complete':
      return 'ok';
    case 'partial':
      return 'warn';
    case 'failed':
      return 'err';
    default:
      return 'idle';
  }
}

export function deliveryLabel(o: HandoffOutcome): string {
  switch (o.delivery) {
    case 'opening_instruction':
      return 'Sent as the agent’s opening instruction';
    case 'file_only':
      return 'Written to handoff.md only; point the agent at it';
    default:
      return 'Not delivered';
  }
}

export function parseSteps(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

export function handoffTone(h: Handoff): StatusTone {
  if (h.outcome) return outcomeTone(h.outcome);

  return stageTone(h.stage);
}

export function handoffLabel(h: Handoff): string {
  if (isCheckpoint(h)) return 'Saved';
  if (h.outcome) return outcomeLabel(h.outcome);

  return stageLabel(h.stage);
}

export function stageTone(stage: string): StatusTone {
  if (stage === 'target_started' || stage === 'completed') return 'ok';
  if (stage === 'failed') return 'err';

  return 'idle';
}

export function stageLabel(stage: string): string {
  switch (stage) {
    case 'target_started':
      return 'Completed';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'checkpointed':
      return 'Checkpointed';
    case 'context_extracted':
      return 'Context captured';
    case 'mcp_prepared':
      return 'MCP prepared';
    default:
      return stage;
  }
}
