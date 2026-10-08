import { Link } from 'react-router-dom';
import { ArrowDown, ChevronRight } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import type { Handoff } from '@/lib/types';
import type { Tone } from '@/design/tokens';
import { PROVIDER_NAMES, ago } from '@/lib/format';

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
  const task = handoff.context.user_requests?.at(-1);
  return (
    <Link to={`/handoffs/${encodeURIComponent(handoff.project)}/${encodeURIComponent(handoff.id)}`} className="handoff-card">
      <AgentPair handoff={handoff} />
      <div className="handoff-card__main">
        <span className="handoff-card__task">{task || 'Repository state only'}</span>
        <span className="handoff-card__meta">
          {handoff.git.branch ? `${handoff.git.branch} · ` : ''}
          {ago(handoff.created_at)}
        </span>
      </div>
      <StatusText tone={stageTone(handoff.stage)}>{stageLabel(handoff.stage)}</StatusText>
      <Icon icon={ChevronRight} size="md" className="agent-card__chevron" />
    </Link>
  );
}
