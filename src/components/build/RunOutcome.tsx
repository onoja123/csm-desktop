import { OutcomeCheckCircle } from './OutcomeCheckCircle';
import { useTimeline } from '@/hooks/useTimeline';
import { BUILD_STATUS_LABEL, buildTone, VERDICT_LABEL, verdictTone } from '@/lib/build';
import { duration } from '@/lib/timeline';
import type { Build, OutcomeFactState } from '@/types';

// RunOutcome is the run's answer in one line, with the total time under it.
export function RunOutcome({ build, children }: { build: Build; children?: React.ReactNode }) {
  const tl = useTimeline(build);

  const verdict =
    build.kind === 'autofix' &&
    build.verification?.verdict &&
    build.verification.verdict !== 'not_run'
      ? build.verification.verdict
      : undefined;

  const tone = buildTone(build.status);
  const s = build.check_summary;
  const checksRun = s.Passed + s.Failed + s.Baseline + s.Blocked + s.NotRun + s.Skipped;
  const reviews = build.reviews ?? [];

  const facts: { label: string; state: OutcomeFactState; value: string }[] = [
    {
      label: 'Tasks',
      state:
        build.tasks.length && build.summary.tasks_completed === build.tasks.length
          ? 'done'
          : build.summary.tasks_failed
            ? 'failed'
            : 'current',
      value: build.tasks.length ? `${build.summary.tasks_completed}/${build.tasks.length}` : '—',
    },
    {
      label: 'Checks',
      state: !checksRun ? 'current' : build.verified ? 'done' : 'failed',
      value: checksRun ? `${s.Passed} passed${s.Failed ? ` · ${s.Failed} failed` : ''}` : 'not run',
    },
    {
      label: 'Review',
      state: !build.policy.review
        ? 'skipped'
        : reviews.some((r) => r.status === 'completed')
          ? 'done'
          : 'current',
      value: build.policy.review ? `${reviews.length}/${build.policy.max_review_cycles}` : 'off',
    },
  ];

  return (
    <div className="outcome">
      <ul className="outcome__facts">
        {facts.map((f) => (
          <li key={f.label} className={`outcome__fact outcome__fact--${f.state}`}>
            <OutcomeCheckCircle state={f.state} />
            <span>{f.label}</span>
            <span className="mono">{f.value}</span>
          </li>
        ))}
      </ul>

      {children}

      <p className={`outcome__status tone-${verdict ? verdictTone(verdict) : tone}`}>
        <span className="outcome__dot" />
        {verdict ? VERDICT_LABEL[verdict] : BUILD_STATUS_LABEL[build.status]}
      </p>

      <p className="outcome__total">{duration(tl.end - tl.origin)}</p>
      {verdict ? <p className="muted outcome__sub">{BUILD_STATUS_LABEL[build.status]}</p> : null}
    </div>
  );
}
