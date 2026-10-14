import { StatusText } from '@/components/ui';
import { EVIDENCE_LABEL, evidenceTone, testsLine } from '@/lib/receipt';
import type { ReceiptCheck } from '@/types';

export function ReceiptCheckRow({ c }: { c: ReceiptCheck }) {
  return (
    <details
      className="build-check receipt-check"
      open={c.status === 'failed' || c.status === 'timed_out'}
    >
      <summary>
        <span className="build-check__name">{c.command || c.name}</span>
        <StatusText tone={evidenceTone(c.status)}>{EVIDENCE_LABEL[c.status]}</StatusText>
        <span className="muted mono">{testsLine(c.tests)}</span>
        <span className="muted mono">{c.exit_code !== undefined ? `exit ${c.exit_code}` : ''}</span>

        <span className="muted mono">
          {c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)}s` : ''}
        </span>
      </summary>

      <div className="build-check__body">
        <span className="muted">
          {c.commit ? (
            <>
              ran on <code className="selectable">{c.commit.slice(0, 8)}</code>
            </>
          ) : (
            'revision not recorded'
          )}

          {c.source ? ` · from ${c.source}` : ''}
        </span>

        {c.reason ? <p className="muted">{c.reason}</p> : null}
        {c.output ? <pre className="code-block code-block--tall selectable">{c.output}</pre> : null}
      </div>
    </details>
  );
}
