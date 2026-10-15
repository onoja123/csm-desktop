import { AccountHealth } from '@/components/accounts/AccountHealth';
import { Row } from '@/components/ui';
import { desktop } from '@/lib/api';
import { ago } from '@/lib/format';
import { redactEmail } from '@/lib/menubar';
import type { Account, AccountStatus, AgentSession } from '@/types';

const STATUS_TEXT: Record<AccountStatus, string> = {
  ready: 'Ready',
  disabled: 'Disabled',
  'not authenticated': 'Not signed in',
  cooldown: 'Cooling down after a limit',
};

export function AccountFacts({ account: a }: { account: Account }) {
  return (
    <div className="inspector-account__facts">
      <Row label="Account">
        <span className="mono">{a.name}</span>
        {a.active ? <span className="menubar-tag">active for new sessions</span> : null}
      </Row>
      <Row label="Signed in as">{redactEmail(a.email) ?? 'Not recorded'}</Row>
      <Row label="Health">
        <AccountHealth account={a} />
      </Row>
      <Row label="Status">{STATUS_TEXT[a.status] ?? a.status}</Row>
      <Row label="Last verified">{a.verified_at ? ago(a.verified_at) : 'Never'}</Row>
      {a.last_failure_text ? (
        <Row label="Last failure">
          {a.last_failure_text}
          {a.last_failure_at ? ` · ${ago(a.last_failure_at)}` : ''}
        </Row>
      ) : null}
      <Row label="Used for failover">{a.failover_eligible ? 'Yes' : 'Not right now'}</Row>
      {a.advice ? <p className="inspector__advice selectable">{a.advice}</p> : null}
    </div>
  );
}

export function InspectorAccount({
  session: s,
  accounts,
  inspected,
  onInspect,
}: {
  session: AgentSession;
  accounts: Account[];
  inspected?: string;
  onInspect: (name?: string) => void;
}) {
  const sameAgent = accounts.filter((a) => a.provider === s.provider);
  const current = sameAgent.find((a) => a.name === s.account);
  const shown = (inspected && sameAgent.find((a) => a.name === inspected)) || current;
  const others = sameAgent.filter((a) => a.name !== shown?.name);

  return (
    <div className="inspector-account">
      {inspected && shown && shown.name !== s.account ? (
        <div className="menubar-note" role="status">
          <span>
            Viewing <span className="mono">{shown.name}</span>. The session still uses{' '}
            <span className="mono">{s.account}</span>.
          </span>
          <button type="button" className="menubar-inline-link" onClick={() => onInspect()}>
            Back to {s.account}
          </button>
        </div>
      ) : null}

      {shown ? (
        <AccountFacts account={shown} />
      ) : (
        <p className="menubar__empty">
          CSM has no record of the account {s.account}. It may have been removed.
        </p>
      )}

      <p className="inspector__footnote">CSM doesn&apos;t record plan or model for accounts.</p>

      <h4 className="menubar__label">Other {s.providerName} accounts</h4>

      {others.length ? (
        others.map((a) => (
          <button
            key={a.name}
            type="button"
            className="menubar-choice"
            onClick={() => onInspect(a.name === s.account ? undefined : a.name)}
          >
            <span className="mono">{a.name}</span>
            <span className="menubar-choice__meta">
              <AccountHealth account={a} />
            </span>
          </button>
        ))
      ) : (
        <p className="menubar__empty">
          No other {s.providerName} accounts. Add one with <code>csm account add</code>.
        </p>
      )}

      {shown ? (
        <button
          type="button"
          className="menubar__link"
          onClick={() => void desktop.showMain(`/accounts/${encodeURIComponent(shown.name)}`)}
        >
          Manage {shown.name} in CSM
        </button>
      ) : null}
    </div>
  );
}
