import { ArrowDown } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon } from '@/components/ui';
import { PROVIDER_NAMES } from '@/lib/format';
import type { Handoff } from '@/types';

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
