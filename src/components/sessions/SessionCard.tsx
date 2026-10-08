import { GitBranch, FolderOpen } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Button, Icon, StatusText } from '@/components/ui';
import type { SessionEntry } from '@/lib/types';
import { PROVIDER_NAMES, ago, baseName, shortSession } from '@/lib/format';

export function SessionCard({ session, onResume, onHandoff, busy }: { session: SessionEntry; onResume?: () => void; onHandoff?: () => void; busy?: boolean }) {
  const when = session.live ? session.started_at : session.checkpointed_at;
  return (
    <div className="session-card">
      <AgentIcon provider={session.provider} size="md" />
      <div className="session-card__main">
        <div className="session-card__top">
          <span className="session-card__title">
            {PROVIDER_NAMES[session.provider]} · <span className="mono">{session.account}</span>
          </span>
          {session.live ? <StatusText tone="ok" pulse>Running</StatusText> : <span className="session-card__reason">{session.reason_text}</span>}
        </div>
        <div className="session-card__meta">
          <span>
            <Icon icon={FolderOpen} size="sm" /> {baseName(session.project_dir)}
          </span>
          {session.branch ? (
            <span>
              <Icon icon={GitBranch} size="sm" /> {session.branch}
            </span>
          ) : null}
          {session.session_id ? <span className="mono">{shortSession(session.session_id)}</span> : null}
          <span>{session.live ? `started ${ago(when)}` : ago(when)}</span>
        </div>
        {session.detail ? <p className="session-card__detail">{session.detail}</p> : null}
      </div>
      <div className="session-card__actions">
        {onResume && session.can_resume && !session.live ? (
          <Button size="sm" onClick={onResume} loading={busy}>
            Resume
          </Button>
        ) : null}
        {onHandoff ? (
          <Button size="sm" variant="ghost" onClick={onHandoff}>
            Handoff
          </Button>
        ) : null}
      </div>
    </div>
  );
}
