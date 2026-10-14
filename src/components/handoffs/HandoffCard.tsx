import { Link } from 'react-router-dom';
import { ArrowDown, Bookmark, ChevronRight } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import type { Handoff } from '@/lib/types';
import type { Tone } from '@/design/tokens';
import { PROVIDER_NAMES, ago } from '@/lib/format';
import { isCheckpoint, outcomeLabel, outcomeTone, stepsOf, taskOf } from '@/lib/checkpoint';

export function handoffTone(h: Handoff): Tone {
  if (h.outcome) return outcomeTone(h.outcome);
  return stageTone(h.stage);
}

export function handoffLabel(h: Handoff): string {
  if (isCheckpoint(h)) return 'Saved';
  if (h.outcome) return outcomeLabel(h.outcome);
  return stageLabel(h.stage);
}

export function stageTone(stage: string): Tone {
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

export function AgentPair({ handoff, vertical = false }: { handoff: Handoff; vertical?: boolean }) {
  const src = handoff.source;
  return (
    <div className={`agent-pair ${vertical ? 'agent-pair--vertical' : ''}`}>
      <div className="agent-pair__agent">
        <AgentIcon provider={src.provider || undefined} size={vertical ? 'xl' : 'md'} />
        <span>
          <strong>{src.provider ? PROVIDER_NAMES[src.provider as keyof typeof PROVIDER_NAMES] ?? src.provider : 'No previous agent'}</strong>
          {src.account ? <span className="mono"> {src.account}</span> : null}
        </span>
      </div>
      <Icon icon={ArrowDown} size={vertical ? 'lg' : 'sm'} className={vertical ? '' : 'rotate-270'} />
      <div className="agent-pair__agent">
        <AgentIcon provider={handoff.target.provider} size={vertical ? 'xl' : 'md'} />
        <span>
          <strong>{PROVIDER_NAMES[handoff.target.provider as keyof typeof PROVIDER_NAMES] ?? handoff.target.provider}</strong>
          <span className="mono"> {handoff.target.account}</span>
        </span>
      </div>
    </div>
  );
}

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
          <Icon icon={Bookmark} size="sm" />
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
      <Icon icon={ChevronRight} size="md" className="agent-card__chevron" />
    </Link>
  );
}
