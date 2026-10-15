import type { KeyboardEvent } from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { InspectorAccount } from './InspectorAccount';
import { InspectorActions } from './InspectorActions';
import { InspectorLimits } from './InspectorLimits';
import { InspectorOverview } from './InspectorOverview';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import { accountOf } from '@/lib/menubar';
import { sessionTask, statusTone } from '@/lib/mission';
import { useData } from '@/store/data';
import { useMenuBar } from '@/store/menubar';
import type { AgentSession, InspectorTab, MenuAttention } from '@/types';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'limits', label: 'Rate limits' },
  { id: 'actions', label: 'Actions' },
];

export function Inspector({
  session: s,
  attention,
  onClose,
  onOpenSession,
}: {
  session: AgentSession;
  attention: MenuAttention[];
  onClose: () => void;
  onOpenSession: (id: string) => void;
}) {
  const tab = useMenuBar((m) => m.tab);
  const setTab = useMenuBar((m) => m.setTab);
  const inspected = useMenuBar((m) => m.inspectedAccount);
  const inspect = useMenuBar((m) => m.inspectAccount);
  const accounts = useData((d) => d.accounts);
  const mine = attention.filter((a) => a.run_id === s.id);

  const shown =
    (inspected && accounts.find((a) => a.provider === s.provider && a.name === inspected)) ||
    accountOf(accounts, s);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

    e.preventDefault();

    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];

    setTab(next.id);
    document.getElementById(`inspector-tab-${next.id}`)?.focus();
  };

  return (
    <div className="inspector">
      <header className="inspector__head">
        <AgentIcon provider={s.provider} size="md" />

        <div className="inspector__who">
          <span className="inspector__name">
            {s.providerName} <span className="mono">{s.account}</span>
          </span>
          <span className="inspector__task" title={sessionTask(s)}>
            {sessionTask(s)}
          </span>
          <span className="inspector__where">
            {s.project}
            {s.branch ? ` · ${s.branch}` : ''}
          </span>
          <StatusText tone={statusTone(s.status)} pulse={s.status === 'running'}>
            {s.label}
          </StatusText>
        </div>

        <button
          type="button"
          className="menubar-icon-btn"
          aria-label="Close agent details"
          onClick={onClose}
        >
          <Icon icon={Cancel01Icon} size="sm" />
        </button>
      </header>

      <div role="tablist" aria-label="Agent details" className="menubar-tabs" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`inspector-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="inspector-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className={`menubar-tabs__tab ${tab === t.id ? 'menubar-tabs__tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id="inspector-panel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab}`}
        className="inspector__body menubar-view"
        key={tab}
      >
        {tab === 'overview' ? (
          <InspectorOverview session={s} attention={mine} onAccount={() => setTab('account')} />
        ) : null}

        {tab === 'account' ? (
          <InspectorAccount
            session={s}
            accounts={accounts}
            inspected={inspected}
            onInspect={inspect}
          />
        ) : null}

        {tab === 'limits' ? (
          <>
            {inspected && shown && shown.name !== s.account ? (
              <p className="menubar-note">
                Showing <span className="mono">{shown.name}</span>, not the session&apos;s account.
              </p>
            ) : null}
            <InspectorLimits account={shown} />
          </>
        ) : null}

        {tab === 'actions' ? (
          <InspectorActions
            session={s}
            onInspectAccounts={() => setTab('account')}
            onOpenSession={onOpenSession}
          />
        ) : null}
      </div>
    </div>
  );
}
