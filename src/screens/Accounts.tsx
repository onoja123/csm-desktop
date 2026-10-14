import { UserRound } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AccountCard } from '@/components/accounts/AccountCard';
import { EmptyState, PageHeader, Panel, Row, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import type { FailoverPolicy, ProviderID } from '@/lib/types';
import { useData } from '@/store/data';

const POLICIES: { id: FailoverPolicy; label: string; text: string }[] = [
  { id: 'automatic', label: 'Automatic', text: 'Switch to the best account when the running one hits a usage limit.' },
  { id: 'manual', label: 'Manual', text: 'Report the limit and ask in the terminal before switching.' },
  { id: 'disabled', label: 'Disabled', text: 'Report the limit and stop.' },
];

export function FailoverPanel() {
  const failover = useData((s) => s.failover);
  if (!failover) return null;
  return (
    <Panel className="failover-panel">
      <div className="segmented">
        {POLICIES.map((p) => (
          <button key={p.id} className={`segmented__item ${failover.policy === p.id ? 'segmented__item--active' : ''}`} onClick={() => void api.setFailover(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="muted">{POLICIES.find((p) => p.id === failover.policy)?.text}</p>
      <HandoffOrder order={failover.handoff_to ?? []} description={failover.handoff_description} automatic={failover.policy === 'automatic'} />
      {failover.providers.map((p) => (
        <div key={p.provider} className="failover-panel__provider">
          <Row label={`${p.provider_name} priority`}>
            <span className="mono">{p.priority.join(' → ')}</span>
          </Row>
          <Row label="Would switch to">
            <span className="mono">{p.would_switch.length ? p.would_switch.join(' → ') : 'nothing usable right now'}</span>
          </Row>
        </div>
      ))}
    </Panel>
  );
}

// Clicking adds an agent to the end of the order or takes it out; the service validates and stores the list.
function HandoffOrder({ order, description, automatic }: { order: ProviderID[]; description?: string; automatic: boolean }) {
  const toggle = (p: ProviderID) => void api.setHandoffTo(order.includes(p) ? order.filter((x) => x !== p) : [...order, p]);
  return (
    <div className="failover-panel__provider handoff-order">
      <Row label="Then hand off to">
        <span className="handoff-order__chips" role="group" aria-label="Agents to hand off to">
          {PROVIDERS.map((p) => {
            const at = order.indexOf(p);
            return (
              <button key={p} className={`chip ${at >= 0 ? 'chip--active' : ''}`} aria-pressed={at >= 0} onClick={() => toggle(p)}>
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

export function Accounts() {
  const accounts = useData((s) => s.accounts);
  return (
    <Page>
      <PageHeader title="Accounts" subtitle="Every profile CSM manages, with the health it uses to pick where a switch goes." />
      {accounts.length === 0 ? (
        <EmptyState icon={UserRound} title="No accounts yet" body={<>Add one in a terminal with <code>csm account add &lt;name&gt; --provider claude|codex|gemini|copilot</code>. Logging in needs a browser, so it stays in the terminal.</>} />
      ) : (
        PROVIDERS.filter((p) => accounts.some((a) => a.provider === p)).map((p) => (
          <Section key={p} title={PROVIDER_LONG_NAMES[p]} meta={String(accounts.filter((a) => a.provider === p).length)}>
            <div className="list">
              {accounts
                .filter((a) => a.provider === p)
                .map((a) => (
                  <AccountCard key={a.name} account={a} />
                ))}
            </div>
          </Section>
        ))
      )}
      <Section title="Failover">
        <FailoverPanel />
      </Section>
    </Page>
  );
}
