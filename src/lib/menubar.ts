import { canReceiveHandoff } from './capabilities';
import { sortSessions } from './mission';
import type {
  Account,
  AgentSession,
  CapabilityState,
  ConnectionPhase,
  Failover,
  HandoffPreview,
  ProviderCapabilities,
  ProviderID,
  ServiceStatus,
} from '@/types';

const FINISHED_SHOWN = 3;

function endedAt(s: AgentSession): number {
  return Date.parse(s.endedAt ?? s.startedAt) || 0;
}

export function splitSessions(
  sessions: AgentSession[],
  finishedLimit = FINISHED_SHOWN,
): {
  live: AgentSession[];
  finished: AgentSession[];
} {
  const sorted = sortSessions(sessions);

  return {
    live: sorted.filter((s) => s.live),
    finished: sorted
      .filter((s) => !s.live)
      .sort((a, b) => endedAt(b) - endedAt(a))
      .slice(0, Math.max(0, finishedLimit)),
  };
}

export function headline(
  phase: ConnectionPhase,
  live: number,
  waiting: number,
  attention = 0,
): string {
  if (phase !== 'connected') return 'Not connected to csm';

  const parts = [
    live === 1 ? '1 agent running' : live ? `${live} agents running` : 'No agents running',
  ];

  if (waiting) parts.push(waiting === 1 ? '1 approval waiting' : `${waiting} approvals waiting`);
  if (attention) parts.push(attention === 1 ? '1 needs attention' : `${attention} need attention`);

  return parts.join(' · ');
}

export function sessionRoute(s: AgentSession): string {
  return s.runId ? `/agents/${s.runId}` : '/mission';
}

export function timeOfDay(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minuteOfDay(value: string): number {
  const [h, m] = value.split(':').map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;

  return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
}

export function capability(
  status: ServiceStatus | undefined,
  provider: ProviderID,
  key: keyof ProviderCapabilities,
): CapabilityState {
  const caps = status?.providers.find((p) => p.id === provider)?.capabilities;

  if (!caps) return 'unknown';

  return caps[key] ? 'supported' : 'unsupported';
}

export function accountOf(accounts: Account[], s: AgentSession): Account | undefined {
  return accounts.find((a) => a.provider === s.provider && a.name === s.account);
}

export function switchCandidates(accounts: Account[], s: AgentSession): Account[] {
  return accounts.filter(
    (a) => a.provider === s.provider && a.name !== s.account && a.enabled && a.status === 'ready',
  );
}

export function failoverTarget(
  failover: Failover | undefined,
  accounts: Account[],
  s: AgentSession,
): Account | undefined {
  const order = failover?.providers.find((p) => p.provider === s.provider)?.would_switch ?? [];
  const ready = switchCandidates(accounts, s);

  for (const name of order) {
    const match = ready.find((a) => a.name === name);

    if (match) return match;
  }

  return undefined;
}

export function handoffTargets(
  accounts: Account[],
  status: ServiceStatus | undefined,
  s: AgentSession,
): Account[] {
  return accounts.filter(
    (a) =>
      !(a.provider === s.provider && a.name === s.account) &&
      a.enabled &&
      a.status !== 'not authenticated' &&
      canReceiveHandoff(status?.providers.find((p) => p.id === a.provider)),
  );
}

export function redactEmail(email?: string): string | undefined {
  if (!email) return undefined;

  const at = email.indexOf('@');

  if (at < 1) return email;

  const name = email.slice(0, at);
  const keep = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);

  return `${keep}${'•'.repeat(Math.max(3, name.length - keep.length))}${email.slice(at)}`;
}

export function resumeBlocker(
  s: AgentSession,
  status: ServiceStatus | undefined,
): string | undefined {
  if (s.live) return 'The session is still running.';
  if (!s.sessionId) return "CSM didn't record a session id for this run, so it can't resume it.";

  // The service passes --resume to every agent; Codex needs `codex resume <id>` and Gemini is unverified.
  if (s.provider === 'codex') return "CSM can't resume Codex sessions from here yet.";
  if (s.provider === 'gemini') return "Resuming Gemini CLI sessions from CSM isn't verified yet.";

  if (capability(status, s.provider, 'session_resume') === 'unsupported')
    return `${s.providerName} can't resume sessions.`;

  return undefined;
}

function carriesConversation(s: AgentSession, status: ServiceStatus | undefined): boolean {
  return (
    capability(status, s.provider, 'session_resume') === 'supported' && s.provider !== 'cursor'
  );
}

export function switchFacts(
  s: AgentSession,
  dest: Account,
  status: ServiceStatus | undefined,
): string[] {
  const facts = [
    `${s.providerName} in ${s.project} moves from ${s.account} to ${dest.name}.`,
    carriesConversation(s, status)
      ? `CSM stops the agent, then restarts it as ${dest.name} and resumes the same conversation.`
      : `CSM stops the agent and starts a new session as ${dest.name} with a brief of the work so far. The conversation itself does not carry over.`,
    'Only this session switches. Sessions in other projects keep their accounts.',
    `${dest.name} also becomes the active ${s.providerName} account for new sessions.`,
  ];

  if (dest.health === 'rate_limited') facts.push(`${dest.name} is rate limited as well.`);
  if (dest.health === 'warning') facts.push(`${dest.name} has used most of a usage window.`);

  return facts;
}

export function stopFacts(s: AgentSession): string[] {
  return [
    `CSM ends ${s.providerName} in ${s.project}. It gets 10 seconds to exit, then it is killed.`,
    'CSM keeps no checkpoint of this session. To hand the task off later, save a checkpoint in CSM first.',
  ];
}

export function resumeFacts(s: AgentSession, active?: Account): string[] {
  return [
    `Starts a new ${s.providerName} run in ${s.project} that resumes this session.`,
    active
      ? `It runs as ${active.name}, the active ${s.providerName} account.`
      : `It runs as the active ${s.providerName} account.`,
  ];
}

export function handoffFacts(preview: HandoffPreview, dest: Account): string[] {
  const who = `${dest.provider_name} (${dest.name})`;
  const facts: string[] = [];

  switch (preview.mode) {
    case 'session':
      facts.push(`The running session continues as ${who} in the same process.`);
      break;
    case 'checkpoint':
      facts.push(`CSM starts ${who} from the saved checkpoint.`);
      break;
    case 'fresh':
      facts.push(`CSM starts ${who} with a brief of the project's current state.`);
      break;
    case 'none':
      facts.push(`This session already runs as ${dest.name}.`);
      break;
  }

  if (preview.task_context) facts.push(`Task context: ${preview.task_context}`);
  if (preview.git_state) facts.push(`Repository: ${preview.git_state}`);
  if (preview.message) facts.push(preview.message);
  if (preview.changes?.length) facts.push(`Changed since then: ${preview.changes.join(', ')}`);

  facts.push(
    `CSM gives ${dest.provider_name} the brief as its opening instruction. It can't confirm the agent follows it.`,
  );

  return facts;
}
