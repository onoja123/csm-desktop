import { SessionMenu } from './SessionMenu';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { StatusText } from '@/components/ui';
import { duration, liveSeconds } from '@/lib/format';
import { sessionTask, statusTone } from '@/lib/mission';
import type { AgentSession } from '@/types';

export function MenuBarSession({
  session: s,
  now,
  flagged,
  onOpen,
}: {
  session: AgentSession;
  now: number;
  flagged?: boolean;
  onOpen: (s: AgentSession) => void;
}) {
  const elapsed = duration(liveSeconds(s.startedAt, s.endedAt, now));

  return (
    <div
      className={`menubar-session menubar-session--${s.status} ${flagged ? 'menubar-session--flagged' : ''}`}
    >
      <button
        type="button"
        className="menubar-session__open"
        aria-label={`${s.providerName} ${s.account}: ${sessionTask(s)}. ${s.label}`}
        onClick={() => onOpen(s)}
      >
        <AgentIcon provider={s.provider} size="md" />

        <span className="menubar-session__main">
          <span className="menubar-session__head">
            <span className="menubar-session__name">{s.providerName}</span>
            <span className="menubar-session__account mono">{s.account}</span>
          </span>

          <span
            className={`menubar-session__task ${s.title ? '' : 'menubar-session__task--none'}`}
            title={sessionTask(s)}
          >
            {sessionTask(s)}
          </span>

          <span className="menubar-session__meta">
            {s.project}
            {s.branch ? ` · ${s.branch}` : ''}
            <span className="mono"> · {elapsed}</span>
          </span>
        </span>

        <StatusText tone={statusTone(s.status)} pulse={s.status === 'running'}>
          {s.label}
        </StatusText>
      </button>

      <SessionMenu session={s} onInspect={() => onOpen(s)} />
    </div>
  );
}
