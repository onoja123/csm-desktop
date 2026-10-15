import { useState } from 'react';
import { Button } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { PROVIDER_LONG_NAMES, ago } from '@/lib/format';
import { sessionTask } from '@/lib/mission';
import { useData } from '@/store/data';
import type { AgentSession, Approval, ApprovalDecision } from '@/types';

const STALE_REFRESH_MS = 2500;

export function MenuBarApproval({
  approval,
  session,
}: {
  approval: Approval;
  session?: AgentSession;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState<ApprovalDecision>();
  const [error, setError] = useState<string>();
  const agent = PROVIDER_LONG_NAMES[approval.provider] ?? approval.provider;

  const decide = async (decision: ApprovalDecision) => {
    setBusy(decision);
    setError(undefined);

    try {
      await api.decide(approval.id, decision);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? 'This request was already answered or it expired.'
          : (e as Error).message,
      );

      // Long enough to read why the card is about to disappear.
      setTimeout(() => void useData.getState().refresh('approvals'), STALE_REFRESH_MS);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div
      className={`menubar-approval ${approval.destructive ? 'menubar-approval--destructive' : ''}`}
      role="alertdialog"
      aria-label="Approval required"
    >
      <div className="menubar-approval__head">
        <span>
          {agent} wants to run{approval.destructive ? ' a destructive command' : ''}
        </span>
        <span className="menubar-approval__when">{ago(approval.requested_at)}</span>
      </div>

      {session ? (
        <div className="menubar-approval__context">
          {session.project}
          {session.title ? ` · ${sessionTask(session)}` : ''}
        </div>
      ) : null}

      <pre className="menubar-approval__command selectable">
        {approval.command || JSON.stringify(approval.input, null, 2)}
      </pre>

      {approval.description ? (
        <p className="menubar-approval__desc">{approval.description}</p>
      ) : null}

      <div className="menubar-approval__meta mono">{approval.account}</div>

      {error ? <p className="menubar-approval__error">{error}</p> : null}

      <div className="menubar-approval__actions">
        <Button
          size="sm"
          onClick={() => void decide('deny')}
          disabled={!!busy}
          loading={busy === 'deny'}
        >
          Reject
        </Button>

        {approval.destructive && !armed ? (
          <Button size="sm" variant="danger" onClick={() => setArmed(true)} disabled={!!busy}>
            Approve anyway…
          </Button>
        ) : (
          <Button
            size="sm"
            variant={approval.destructive ? 'danger' : 'primary'}
            onClick={() => void decide('allow')}
            disabled={!!busy}
            loading={busy === 'allow'}
          >
            {approval.destructive ? 'Yes, approve' : 'Approve'}
          </Button>
        )}
      </div>
    </div>
  );
}
