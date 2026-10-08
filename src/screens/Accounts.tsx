import { UserRound } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AccountCard } from '@/components/accounts/AccountCard';
import { EmptyState, PageHeader, Panel, Row, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import type { FailoverPolicy } from '@/lib/types';
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
