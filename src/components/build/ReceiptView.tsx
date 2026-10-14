import { useEffect, useState } from 'react';
import { ErrorState, LoadingState, Row, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { CLAIM_LABEL, EVIDENCE_LABEL, OUTCOME_LABEL, claimTone, evidenceTone, outcomeTone, testsLine } from '@/lib/receipt';
import type { Build, Receipt, ReceiptCheck } from '@/lib/types';

function ReceiptCheckRow({ c }: { c: ReceiptCheck }) {
  return (
    <details className="build-check receipt-check" open={c.status === 'failed' || c.status === 'timed_out'}>
      <summary>
        <span className="build-check__name">{c.command || c.name}</span>
        <StatusText tone={evidenceTone(c.status)}>{EVIDENCE_LABEL[c.status]}</StatusText>
        <span className="muted mono">{testsLine(c.tests)}</span>
        <span className="muted mono">{c.exit_code !== undefined ? `exit ${c.exit_code}` : ''}</span>
        <span className="muted mono">{c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)}s` : ''}</span>
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

export function ReceiptView({ build }: { build: Build }) {
  const [receipt, setReceipt] = useState<Receipt>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    api
      .buildReceipt(build.id)
      .then((r) => {
        if (!live) return;
        setReceipt(r);
        setError(undefined);
      })
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [build.id, build.updated_at]);

  if (error && !receipt) {
    return <ErrorState title="The receipt could not be read" body="The run record may be damaged, or the CSM service is not running." detail={error} />;
  }
  if (!receipt) return <LoadingState label="Reading the receipt" />;

  const r = receipt;
  const contradicted = r.claims.filter((c) => c.status === 'contradicted').length;
  const drift = r.drift;

  return (
    <div className="receipt">
      <div className="receipt__head">
        <StatusText tone={outcomeTone(r.outcome)}>{OUTCOME_LABEL[r.outcome]}</StatusText>
        <span className="receipt__headline">{r.headline}</span>
        <span className="muted">{r.final ? (r.partial ? 'Final, partial evidence' : 'Final') : r.status === 'awaiting_final_approval' ? 'Awaiting your approval' : 'In progress'}</span>
      </div>

      <div className="receipt__facts">
        <Row label="Verified revision" mono>
          {r.revision.commit ? r.revision.commit : r.revision.mixed ? 'checks ran on different revisions' : 'none yet'}
        </Row>
        {drift ? (
          <Row label="Current branch">
            <StatusText tone={drift.same_as_verified ? 'ok' : 'warn'}>{drift.note}</StatusText>
          </Row>
        ) : null}
        {r.revision.branch ? (
          <Row label="Changes" mono>
            {r.revision.branch} · {r.revision.files?.length ?? 0} file(s)
          </Row>
        ) : null}
        <Row label="Review">
          {!r.review.enabled
            ? 'Turned off for this run'
            : r.review.rounds?.length
              ? `${r.review.rounds[r.review.rounds.length - 1].agent}${r.review.independent ? ', a different agent' : ', not independent'}: ${r.review.rounds[r.review.rounds.length - 1].verdict || r.review.rounds[r.review.rounds.length - 1].status} · ${r.review.open_blocking} blocking open`
              : 'Not run yet'}
        </Row>
        <Row label="Acceptance">
          <StatusText tone={r.acceptance.passed ? 'ok' : 'warn'}>{r.acceptance.passed ? 'Met' : 'Not met'}</StatusText> <span className="muted">{r.acceptance.reasons.join('; ')}</span>
        </Row>
        <Row label="Pull request">{r.pull_request.url ? r.pull_request.url : r.pull_request.pushed ? 'Branch pushed' : r.pull_request.state === 'not_prepared' ? 'Not prepared' : `${r.pull_request.state.replace(/_/g, ' ')}, not pushed`}</Row>
      </div>

      {r.partial_reasons?.length ? (
        <div className="receipt__section">
          <h4 className="panel__h4">Missing evidence</h4>
          <ul className="receipt__list">
            {r.partial_reasons.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="receipt__section build-checks">
        <h4 className="panel__h4">Checks CSM ran on the integrated branch</h4>
        {r.checks.length ? r.checks.map((c, i) => <ReceiptCheckRow key={`c-${i}`} c={c} />) : <p className="muted">No checks have run on the integrated branch yet.</p>}
        {r.baseline?.length ? (
          <>
            <h4 className="panel__h4 build-checks__sub">Base commit {r.base_commit?.slice(0, 8)}</h4>
            {r.baseline.map((c, i) => (
              <ReceiptCheckRow key={`b-${i}`} c={c} />
            ))}
          </>
        ) : null}
      </div>

      <div className="receipt__section">
        <h4 className="panel__h4">
          Agent claims {contradicted ? <span className="muted">· {contradicted} contradicted by what CSM measured</span> : null}
        </h4>
        {r.claims.length ? (
          <ul className="receipt__claims">
            {r.claims.map((c, i) => (
              <li key={i}>
                <StatusText tone={claimTone(c.status)}>{CLAIM_LABEL[c.status]}</StatusText>
                <span className="receipt__claim selectable">
                  {c.task_id ? <span className="mono">{c.task_id} </span> : null}
                  {c.claim}
                </span>
                <span className="muted receipt__evidence">{c.evidence}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No agent has reported on its work yet.</p>
        )}
      </div>

      <div className="receipt__section">
        <h4 className="panel__h4">Limitations</h4>
        <ul className="receipt__list muted">
          {r.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="muted">
          Terminal: <code className="selectable">csm build receipt {r.build_id}</code>
        </p>
      </div>
    </div>
  );
}
