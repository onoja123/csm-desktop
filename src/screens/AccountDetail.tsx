import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Page } from '@/components/shell/Page';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AccountHealth } from '@/components/accounts/AccountHealth';
import { Button, ErrorState, Panel, PanelHeader, Row, Section } from '@/components/ui';
import { UsageWindowRow } from '@/components/accounts/UsageWindowRow';
import { api } from '@/lib/api';
import { ago, until } from '@/lib/format';
import { useData } from '@/store/data';

export function AccountDetail() {
  const { name = '' } = useParams();
  const account = useData((s) => s.accounts.find((a) => a.name === decodeURIComponent(name)));
  const providers = useData((s) => s.status?.providers);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [position, setPosition] = useState('');

  if (!account) {
    return (
      <Page>
        <ErrorState title="No such account" body="It may have been removed in a terminal." />
      </Page>
    );
  }

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setError(undefined);
    setMessage(undefined);
    try {
      const res = await fn();
      setMessage(done ?? (res && typeof res === 'object' && 'message' in res ? String((res as { message: string }).message) : undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const usage = account.usage;
  const reportsUsage = providers?.find((p) => p.id === account.provider)?.capabilities?.usage_report ?? true;

  return (
    <Page>
      <header className="agent-head">
        <AgentIcon provider={account.provider} size="hero" />
        <div className="agent-head__main">
          <div className="agent-head__top">
            <h1 className="mono">{account.name}</h1>
            <AccountHealth account={account} />
          </div>
          <p className="agent-head__task">
            {account.provider_name}
            {account.email ? ` · ${account.email}` : ''}
            {account.active ? ' · active' : ''}
          </p>
          <div className="agent-head__actions">
            {!account.active && account.status === 'ready' ? (
              <Button variant="primary" loading={busy === 'switch'} onClick={() => void act('switch', () => api.switchAccount(account.name))}>
                {account.running ? 'Switch running session here' : 'Make active'}
              </Button>
            ) : null}
            {account.enabled ? (
              <Button loading={busy === 'disable'} onClick={() => void act('disable', () => api.disableAccount(account.name), `${account.name} disabled`)}>
                Disable
              </Button>
            ) : (
              <Button loading={busy === 'enable'} onClick={() => void act('enable', () => api.enableAccount(account.name), `${account.name} enabled`)}>
                Enable
              </Button>
            )}
            <Button icon={RefreshCw} loading={busy === 'usage'} disabled={!reportsUsage} title={reportsUsage ? undefined : `${account.provider_name} does not report plan usage`} onClick={() => void act('usage', () => api.refreshUsage(account.name), 'Usage checked')}>
              Check usage
            </Button>
          </div>
          {message ? <p className="form-ok">{message}</p> : null}
          {error ? <p className="form-error selectable">{error}</p> : null}
          {account.advice ? <p className="muted selectable">{account.advice.replace(/\n+/g, ' ')}</p> : null}
        </div>
      </header>

      <div className="two-col">
        <Section title="Health">
          <Panel>
            <Row label="Health">
              <AccountHealth account={account} />
            </Row>
            <Row label="Status">{account.status}</Row>
            <Row label="Authentication">{account.verified_at && !account.verified_at.startsWith('0001') ? `verified ${ago(account.verified_at)}` : 'not logged in'}</Row>
            <Row label="Priority">{account.priority}</Row>
            <Row label="Failover eligible">{account.failover_eligible ? 'Yes' : 'No'}</Row>
            <Row label="Last used">{ago(account.last_used_at)}</Row>
            <Row label="Last success">{ago(account.last_success_at)}</Row>
            <Row label="Last failure">{account.last_failure_at && !account.last_failure_at.startsWith('0001') ? `${ago(account.last_failure_at)} · ${account.last_failure_text}` : 'never'}</Row>
            <Row label="Failures (24h)">{account.failures_24h}</Row>
            {account.cooldown_until ? <Row label="Cooldown ends">in {until(account.cooldown_until)}</Row> : null}
            <Row label="Profile" mono>
              {account.profile_dir}
            </Row>
          </Panel>
        </Section>
        <Section title="Usage">
          <Panel>
            {usage ? (
              <>
                <PanelHeader title="As reported by the agent" meta={`checked ${ago(account.usage_updated_at)}`} />
                {usage.limited ? <p className="tone-limit">Limit reached: requests are currently rejected.</p> : null}
                <UsageWindowRow label="5-hour" w={usage.five_hour} />
                <UsageWindowRow label="7-day" w={usage.seven_day} />
                <UsageWindowRow label="Spend" w={usage.spend_limit} />
              </>
            ) : (
              <>
                <Row label="Usage">Unknown</Row>
                <p className="muted">{reportsUsage ? 'The agent has not reported usage for this account. CSM never estimates it. Run a live check with the button above.' : `${account.provider_name} does not report plan usage, so CSM shows none and cannot see a limit coming.`}</p>
              </>
            )}
          </Panel>
        </Section>
      </div>

      <Section title="Priority">
        <Panel>
          <div className="input-row">
            <input className="input input--sm mono" style={{ width: 80 }} inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} placeholder={String(account.priority)} />
            <Button size="sm" loading={busy === 'priority'} disabled={!position} onClick={() => void act('priority', () => api.setPriority(account.name, Number(position)), `Priority set`)}>
              Set position
            </Button>
            <span className="muted">Position among {account.provider_name} accounts. Manual switches follow this order exactly.</span>
          </div>
        </Panel>
      </Section>

      {account.status === 'not authenticated' || account.health === 'authentication_required' ? (
        <Section title="Login">
          <Panel>
            <p className="muted">Logging in opens the agent's browser flow, so it stays in a terminal:</p>
            <pre className="code-block selectable">csm account login {account.name}</pre>
          </Panel>
        </Section>
      ) : null}
    </Page>
  );
}
