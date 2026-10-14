import { Panel, Row } from '@/components/ui';
import { HandoffOrder } from './HandoffOrder';
import { api } from '@/lib/api';
import { useData } from '@/store/data';
import type { FailoverPolicy } from '@/types';

const POLICIES: { id: FailoverPolicy; label: string; text: string }[] = [
  {
    id: 'automatic',
    label: 'Automatic',
    text: 'Switch to the best account when the running one hits a usage limit.',
  },
  {
    id: 'manual',
    label: 'Manual',
    text: 'Report the limit and ask in the terminal before switching.',
  },
  { id: 'disabled', label: 'Disabled', text: 'Report the limit and stop.' },
];

export function FailoverPanel() {
  const failover = useData((s) => s.failover);

  if (!failover) return null;

  return (
    <Panel className="failover-panel">
      <div className="segmented">
        {POLICIES.map((p) => (
          <button
            key={p.id}
            className={`segmented__item ${failover.policy === p.id ? 'segmented__item--active' : ''}`}
            onClick={() => void api.setFailover(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="muted">{POLICIES.find((p) => p.id === failover.policy)?.text}</p>

      <HandoffOrder
        order={failover.handoff_to ?? []}
        description={failover.handoff_description}
        automatic={failover.policy === 'automatic'}
      />

      {failover.providers.map((p) => (
        <div key={p.provider} className="failover-panel__provider">
          <Row label={`${p.provider_name} priority`}>
            <span className="mono">{p.priority.join(' → ')}</span>
          </Row>

          <Row label="Would switch to">
            <span className="mono">
              {p.would_switch.length ? p.would_switch.join(' → ') : 'nothing usable right now'}
            </span>
          </Row>
        </div>
      ))}
    </Panel>
  );
}
