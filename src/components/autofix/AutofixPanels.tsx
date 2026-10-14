import { Check, Minus, X } from 'lucide-react';
import { Icon, Panel, Row, StatusText } from '@/components/ui';
import { REPRO_LABEL, VERDICT_LABEL, reproTone, severityToneOf, verdictTone } from '@/lib/build';
import { ago } from '@/lib/format';
import type { Build, SandboxResult, Signal } from '@/lib/types';

export function IncidentPanel({ signal, hub }: { signal: Signal; hub?: Build['hub'] }) {
  const s = signal.evidence.sentry;
  const ex = s?.exceptions?.[s.exceptions.length - 1];
  const frames = [...(ex?.frames ?? [])].reverse();
  return (
    <Panel className="af-incident">
      <div className="af-incident__head">
        <span className="af-source">{signal.source}</span>
        <StatusText tone={severityToneOf(signal.severity)}>{signal.severity}</StatusText>
        {signal.environment ? <span className="muted">{signal.environment}</span> : null}
        {s?.count ? <span className="muted">{s.count} occurrences</span> : null}
        <span className="muted af-incident__when">{ago(signal.occurred_at)}</span>
      </div>
      <h3 className="af-incident__title selectable">{signal.title}</h3>
      {signal.culprit ? <p className="mono muted">{signal.culprit}</p> : null}
      {ex ? (
        <div className="af-trace" aria-label="Stack trace">
          <p className="af-trace__ex selectable">
            <strong>{ex.type}</strong>
            {ex.value ? `: ${ex.value}` : ''}
          </p>
          {frames.slice(0, 8).map((f, i) => (
            <div key={i} className={`af-frame ${f.in_app ? 'af-frame--app' : ''}`}>
              <span className="mono">
                {f.file}
                {f.line ? `:${f.line}` : ''}
              </span>
              <span className="muted"> in {f.function}</span>
              {f.in_app && f.context ? <code className="af-frame__code">{f.context}</code> : null}
            </div>
          ))}
        </div>
      ) : null}
      <p className="af-note">Evidence from {signal.source === 'sentry' ? 'Sentry' : signal.source}, redacted by CSM. Agents receive it as untrusted data, never as instructions.</p>
      {hub ? <p className="muted af-note">Tracked in CSM Hub as run {hub.run_id.slice(0, 8)}</p> : null}
    </Panel>
  );
}

export function InvestigationPanel({ build: b }: { build: Build }) {
  const inv = b.investigation;
  if (!inv || !inv.classification) {
    return (
      <Panel>
        <h4 className="panel__h4">Investigation</h4>
        <p className="muted">{b.status === 'investigating' ? 'An agent is reading the code the evidence points to.' : 'Not started.'}</p>
      </Panel>
    );
  }
  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Investigation</h3>
          <span className="panel__meta">{inv.source}'s analysis, not verified</span>
        </div>
        <StatusText tone={inv.classification === 'code_defect' ? 'warn' : 'idle'}>{inv.classification.replace(/_/g, ' ')}</StatusText>
      </div>
      {inv.summary ? <p className="selectable">{inv.summary}</p> : null}
      {inv.root_cause ? (
        <p className="selectable af-rootcause">
          <span className="muted">Suspected root cause: </span>
          {inv.root_cause}
        </p>
      ) : null}
      {inv.test ? (
        <Row label="Regression test" mono>
          {inv.test.name} in {inv.test.files.join(', ')}
        </Row>
      ) : null}
      {inv.ignored_edits?.length ? <p className="muted">The investigator also changed {inv.ignored_edits.length} non-test file(s); CSM did not use those changes.</p> : null}
    </Panel>
  );
}

function Step({ ok, label, text }: { ok?: boolean; label: string; text: string }) {
  const icon = ok === undefined ? Minus : ok ? Check : X;
  return (
    <div className="checklist__row">
      <Icon icon={icon} size="sm" className={ok === undefined ? 'tone-idle' : ok ? 'tone-ok' : 'tone-err'} />
      <span className="checklist__label">{label}</span>
      <span className="checklist__text">{text}</span>
    </div>
  );
}

function RunOutput({ title, r }: { title: string; r?: SandboxResult }) {
  if (!r) return null;
  return (
    <details className="build-check">
      <summary>
        <span className="build-check__name">{title}</span>
        <span className="muted">{r.sandboxed ? `sandbox · ${r.image ?? ''}` : r.runner}</span>
        <span className="muted mono">{r.error ? 'did not run' : r.timed_out ? 'timed out' : `exit ${r.exit_code}`}</span>
      </summary>
      <div className="build-check__body">
        <code className="selectable">{r.command.join(' ')}</code>
        {r.limits ? <p className="muted">{r.limits}</p> : null}
        {r.error ? <p className="form-error">{r.error}</p> : null}
        {r.output ? <pre className="code-block code-block--tall selectable">{r.output}</pre> : null}
      </div>
    </details>
  );
}

export function VerificationPanel({ build: b }: { build: Build }) {
  const v = b.verification;
  if (!v) return null;
  const reproduced = v.reproduction === 'reproduced' ? true : v.reproduction === 'not_attempted' ? undefined : false;
  return (
    <Panel className="af-verify">
      <div className="panel__header">
        <div className="panel__title">
          <h3>Reproduction and verification</h3>
          <span className="panel__meta">measured by CSM</span>
        </div>
        <StatusText tone={verdictTone(v.verdict)}>{VERDICT_LABEL[v.verdict]}</StatusText>
      </div>
      <div className="checklist">
        <Step ok={reproduced} label="Failure reproduced before the fix" text={`${REPRO_LABEL[v.reproduction]}${v.reproduction_reason ? `: ${v.reproduction_reason}` : ''}`} />
        <Step ok={v.failure_gone} label="Failure gone after the fix" text={v.failure_gone === undefined ? 'not checked yet' : v.failure_gone ? 'the regression test passes' : 'the regression test still fails'} />
        <Step ok={v.test_unchanged} label="Regression test unchanged" text={v.test_unchanged === undefined ? 'not checked yet' : v.test_unchanged ? 'identical to the reproducing commit' : 'the fix modified it'} />
        <Step ok={v.checks_passed} label="Repository checks" text={v.checks_passed === undefined ? 'none run yet' : v.checks_passed ? 'passed' : `${v.new_failures?.length ? 'new failures: ' + v.new_failures.join(', ') : 'did not all pass'}`} />
      </div>
      {v.notes?.length ? (
        <ul className="outcome-problems">
          {v.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <RunOutput title="Before the fix" r={v.before} />
      <RunOutput title="After the fix" r={v.after} />
      <p className="muted af-note">
        <StatusText tone={reproTone(v.reproduction)}>{REPRO_LABEL[v.reproduction]}</StatusText> A passing test suite alone is never reported as a verified fix.
      </p>
    </Panel>
  );
}
