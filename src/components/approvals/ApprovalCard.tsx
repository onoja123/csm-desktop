import { useState } from 'react';
import { ShieldAlert, TerminalSquare } from 'lucide-react';
import { Button, IconTile } from '@/components/ui';
import type { Approval, ApprovalDecision } from '@/types';
import { PROVIDER_LONG_NAMES, ago } from '@/lib/format';

export function ApprovalCard({ approval, onDecide, busy }: { approval: Approval; onDecide: (decision: ApprovalDecision) => void; busy?: boolean }) {
  const [armed, setArmed] = useState(false);
  const agent = PROVIDER_LONG_NAMES[approval.provider] ?? approval.provider;
  return (
    <div className={`approval-card ${approval.destructive ? 'approval-card--destructive' : ''}`} role="alertdialog" aria-label="Approval required">
      <IconTile icon={approval.destructive ? ShieldAlert : TerminalSquare} size="xl" tone={approval.destructive ? 'err' : undefined} />
      <div className="approval-card__main">
        <div className="approval-card__eyebrow">Approval required · {ago(approval.requested_at)}</div>
        <h3 className="approval-card__title">
          {agent} wants to run{approval.destructive ? ' a destructive command' : ''}:
        </h3>
        <pre className="approval-card__command selectable">{approval.command || JSON.stringify(approval.input, null, 2)}</pre>
        {approval.description ? <p className="approval-card__desc">{approval.description}</p> : null}
        <div className="approval-card__meta">
          <span className="mono">{approval.account}</span>
          {approval.destructive ? <span className="tone-err">Check this one carefully before approving.</span> : null}
        </div>
        <div className="approval-card__actions">
          <Button variant="default" onClick={() => onDecide('deny')} disabled={busy}>
            Reject
          </Button>
          {approval.destructive && !armed ? (
            <Button variant="danger" onClick={() => setArmed(true)} disabled={busy}>
              Approve anyway…
            </Button>
          ) : (
            <Button variant={approval.destructive ? 'danger' : 'primary'} onClick={() => onDecide('allow')} disabled={busy}>
              {approval.destructive ? 'Yes, approve' : 'Approve'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
