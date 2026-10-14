import { memo } from 'react';
import { ComputerTerminal01Icon, GitBranchIcon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import { statusTone } from '@/lib/mission';
import { duration, liveSeconds } from '@/lib/format';
import type { AgentSession } from '@/types';

export const SessionRow = memo(function SessionRow({ session: s, selected, now, onSelect }: { session: AgentSession; selected: boolean; now: number; onSelect: (id: string) => void }) {
  const elapsed = duration(liveSeconds(s.startedAt, s.endedAt, now));
  const tone = statusTone(s.status);
  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={selected}
      className={`mc-row mc-row--${s.status} ${selected ? 'mc-row--selected' : ''}`}
      onClick={() => onSelect(s.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(s.id);
        }
      }}
    >
      <AgentIcon provider={s.provider} size="md" />
      <div className="mc-row__main">
        <div className="mc-row__head">
          <span className="mc-row__name">{s.providerName}</span>
          <span className="mc-row__account mono">{s.account}</span>
          {s.switched ? <span className="mc-row__switched">from {s.switched.from}</span> : null}
        </div>
        <span className={`mc-row__title ${s.title ? '' : 'mc-row__title--none'}`}>{s.title ?? s.note ?? (s.observable ? (s.live ? 'No request recorded yet' : 'No request recorded') : 'Request not visible from here')}</span>
      </div>
      <div className="mc-row__where">
        <span className="mc-row__project">{s.project}</span>
        <span className="mc-row__sub">
          {s.branch ? (
            <span className="mc-row__chip">
              <Icon icon={GitBranchIcon} size="sm" />
              {s.branch}
            </span>
          ) : null}
          {s.terminal ? (
            <span className="mc-row__chip">
              <Icon icon={ComputerTerminal01Icon} size="sm" />
              {`Tab ${s.terminal.tabIndex}`}
            </span>
          ) : null}
        </span>
      </div>
      <span className="mc-row__time mono">{elapsed}</span>
      <div className="mc-row__status">
        <StatusText tone={tone} pulse={s.status === 'running'}>
          {s.label}
        </StatusText>
        {s.detail ? <span className="mc-row__detail">{s.detail}</span> : null}
      </div>
    </div>
  );
});
