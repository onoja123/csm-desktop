import { Panel, StatusText } from '@/components/ui';
import { VerificationStep } from './VerificationStep';
import { SandboxRunOutput } from './SandboxRunOutput';
import { REPRO_LABEL, reproTone, VERDICT_LABEL, verdictTone } from '@/lib/build';
import type { Build } from '@/types';

export function VerificationPanel({ build: b }: { build: Build }) {
  const v = b.verification;

  if (!v) return null;

  const reproduced =
    v.reproduction === 'reproduced' ? true : v.reproduction === 'not_attempted' ? undefined : false;

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
        <VerificationStep
          ok={reproduced}
          label="Failure reproduced before the fix"
          text={`${REPRO_LABEL[v.reproduction]}${v.reproduction_reason ? `: ${v.reproduction_reason}` : ''}`}
        />

        <VerificationStep
          ok={v.failure_gone}
          label="Failure gone after the fix"
          text={
            v.failure_gone === undefined
              ? 'not checked yet'
              : v.failure_gone
                ? 'the regression test passes'
                : 'the regression test still fails'
          }
        />

        <VerificationStep
          ok={v.test_unchanged}
          label="Regression test unchanged"
          text={
            v.test_unchanged === undefined
              ? 'not checked yet'
              : v.test_unchanged
                ? 'identical to the reproducing commit'
                : 'the fix modified it'
          }
        />

        <VerificationStep
          ok={v.checks_passed}
          label="Repository checks"
          text={
            v.checks_passed === undefined
              ? 'none run yet'
              : v.checks_passed
                ? 'passed'
                : `${v.new_failures?.length ? 'new failures: ' + v.new_failures.join(', ') : 'did not all pass'}`
          }
        />
      </div>

      {v.notes?.length ? (
        <ul className="outcome-problems">
          {v.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <SandboxRunOutput title="Before the fix" r={v.before} />
      <SandboxRunOutput title="After the fix" r={v.after} />

      <p className="muted af-note">
        <StatusText tone={reproTone(v.reproduction)}>{REPRO_LABEL[v.reproduction]}</StatusText> A
        passing test suite alone is never reported as a verified fix.
      </p>
    </Panel>
  );
}
