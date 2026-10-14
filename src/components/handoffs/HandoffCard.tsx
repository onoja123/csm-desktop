import { Link } from 'react-router-dom';
import { ArrowRight01Icon, Bookmark02Icon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import { AgentPair } from './AgentPair';
import type { Handoff } from '@/types';
import { PROVIDER_NAMES, ago } from '@/lib/format';
import { handoffLabel, handoffTone, isCheckpoint, stepsOf, taskOf } from '@/lib/checkpoint';

export function HandoffCard({ handoff }: { handoff: Handoff }) {
  const { text } = taskOf(handoff);
  const checkpoint = isCheckpoint(handoff);
  const steps = stepsOf(handoff).length;
  const project = handoff.git.root?.split('/').pop();
  return (
    <Link to={`/handoffs/${encodeURIComponent(handoff.project)}/${encodeURIComponent(handoff.id)}`} className="handoff-card">
      {checkpoint ? (
        <div className="agent-pair">
          <div className="agent-pair__agent">
            <AgentIcon provider={handoff.source.provider || undefined} size="md" />
            <span>
              <strong>{handoff.source.provider ? PROVIDER_NAMES[handoff.source.provider as keyof typeof PROVIDER_NAMES] ?? handoff.source.provider : 'No agent'}</strong>
              {handoff.source.account ? <span className="mono"> {handoff.source.account}</span> : null}
            </span>
          </div>
          <Icon icon={Bookmark02Icon} size="sm" />
        </div>
      ) : (
        <AgentPair handoff={handoff} />
      )}
      <div className="handoff-card__main">
        <span className="handoff-card__task">{text || 'Repository state only'}</span>
        <span className="handoff-card__meta">
          {!checkpoint && handoff.reason === 'usage_limit' ? 'automatic · ' : ''}
          {project ? `${project} · ` : ''}
          {handoff.git.branch ? `${handoff.git.branch} · ` : ''}
          {checkpoint && steps ? `${steps} next step${steps === 1 ? '' : 's'} · ` : ''}
          {ago(handoff.updated_at || handoff.created_at)}
        </span>
      </div>
      <StatusText tone={checkpoint ? 'idle' : handoffTone(handoff)}>{handoffLabel(handoff)}</StatusText>
      <Icon icon={ArrowRight01Icon} size="md" className="agent-card__chevron" />
    </Link>
  );
}
