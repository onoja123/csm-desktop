import { Row } from '@/components/ui';
import { api } from '@/lib/api';
import { canReceiveHandoff } from '@/lib/capabilities';
import { PROVIDER_LONG_NAMES, PROVIDERS } from '@/lib/format';
import { useData } from '@/store/data';
import type { ProviderID } from '@/types';

// Clicking adds an agent to the end of the order or takes it out; the service validates and stores the list.
export function HandoffOrder({ order, description, automatic }: { order: ProviderID[]; description?: string; automatic: boolean }) {
  const providers = useData((s) => s.status?.providers);
  const toggle = (p: ProviderID) => void api.setHandoffTo(order.includes(p) ? order.filter((x) => x !== p) : [...order, p]);
  return (
    <div className="failover-panel__provider handoff-order">
      <Row label="Then hand off to">
        <span className="handoff-order__chips" role="group" aria-label="Agents to hand off to">
          {PROVIDERS.map((p) => {
            const at = order.indexOf(p);
            const usable = canReceiveHandoff(providers?.find((i) => i.id === p));
            return (
              <button key={p} className={`chip ${at >= 0 ? 'chip--active' : ''}`} aria-pressed={at >= 0} disabled={!usable && at < 0} title={usable ? undefined : `${PROVIDER_LONG_NAMES[p]} cannot receive a handoff`} onClick={() => toggle(p)}>
                {at >= 0 ? `${at + 1} · ` : ''}
                {PROVIDER_LONG_NAMES[p]}
              </button>
            );
          })}
        </span>
      </Row>
      <p className="muted">
        {order.length
          ? `When every account of the running agent is limited, CSM saves the task and continues with ${description?.split(' when ')[0] ?? 'the next agent'}.${automatic ? '' : ' Only used when failover is Automatic.'}`
          : 'Off. Failover stays with the same agent; add agents here to continue the task with another one when every account is limited.'}
      </p>
    </div>
  );
}
