import { useState } from 'react';
import { UsageWindowRow } from '@/components/accounts/UsageWindowRow';
import { Button, Row } from '@/components/ui';
import { api } from '@/lib/api';
import { ago, clock } from '@/lib/format';
import { capability } from '@/lib/menubar';
import { useData } from '@/store/data';
import type { Account, ProviderID } from '@/types';

function checkCost(provider: ProviderID, name: string, agent: string): string {
  if (provider === 'claude') return `Sends a one-word request as ${name}, about 500 tokens.`;
  if (provider === 'codex') return 'Asks Codex for its current limits. No tokens are used.';

  return `Asks ${agent} for its current limits.`;
}

export function InspectorLimits({ account: a }: { account?: Account }) {
  const status = useData((d) => d.status);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<string>();
  const [error, setError] = useState<string>();

  if (!a) {
    return <p className="menubar__empty">CSM has no record of this account.</p>;
  }

  const agent = a.provider_name;
  const reports = capability(status, a.provider, 'usage_report');
  const observed = a.last_failure === 'usage_limit' || a.last_failure === 'rate_limited';

  const pausedUntil =
    a.cooldown_until && new Date(a.cooldown_until).getTime() > Date.now()
      ? a.cooldown_until
      : undefined;

  const check = async () => {
    setChecking(true);
    setError(undefined);
    setChecked(undefined);

    try {
      await api.refreshUsage(a.name);
      setChecked(`Checked ${new Date().toLocaleTimeString([], { timeStyle: 'short' })}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="inspector-limits">
      <section className="menubar__section">
        <h4 className="menubar__label">Reported by {agent}</h4>

        {a.usage ? (
          <>
            <p className="inspector__source">
              {agent} reported these for {a.name}
              {a.usage_updated_at ? `, checked ${ago(a.usage_updated_at)}` : ''}.
            </p>

            {a.usage.limited ? (
              <p className="inspector__limit" role="status">
                Limit reached: {agent} is rejecting requests on this account.
              </p>
            ) : null}

            <UsageWindowRow label="5-hour window" w={a.usage.five_hour} />
            <UsageWindowRow label="7-day window" w={a.usage.seven_day} />
            <UsageWindowRow label="Spend limit" w={a.usage.spend_limit} />
          </>
        ) : reports === 'unsupported' ? (
          <p className="menubar__empty">
            {agent} doesn&apos;t report usage, so CSM can&apos;t show its limits or see one coming.
          </p>
        ) : (
          <p className="menubar__empty">
            {agent} hasn&apos;t reported usage for {a.name} yet. CSM never estimates it.
          </p>
        )}

        {reports !== 'unsupported' ? (
          <div className="menubar-action">
            <div className="menubar-action__text">
              <span className="menubar-action__title">Check usage now</span>
              <span className="menubar-action__note">{checkCost(a.provider, a.name, agent)}</span>
            </div>
            <Button size="sm" loading={checking} onClick={() => void check()}>
              Check
            </Button>
          </div>
        ) : null}

        {checked ? <p className="inspector__source">{checked}</p> : null}
        {error ? <p className="menubar__error selectable">{error}</p> : null}
      </section>

      <section className="menubar__section">
        <h4 className="menubar__label">Observed by CSM</h4>

        {observed ? (
          <Row label="Last limit">
            {a.last_failure_text}
            {a.last_failure_at ? ` · ${ago(a.last_failure_at)}` : ''}
          </Row>
        ) : null}

        {pausedUntil ? <Row label="CSM pause">Until {clock(pausedUntil)}</Row> : null}

        {observed || pausedUntil ? (
          <p className="inspector__footnote">
            These come from {agent}&apos;s errors, not from a usage figure. The pause is CSM&apos;s
            fixed one-hour wait after a usage limit, not {agent}&apos;s reset time.
          </p>
        ) : (
          <p className="menubar__empty">No limit errors recorded for {a.name}.</p>
        )}
      </section>
    </div>
  );
}
