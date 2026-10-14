import { useEffect, useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { Icon } from '@/components/ui';
import { BUILD_STATUS_LABEL, VERDICT_LABEL, buildTone, verdictTone } from '@/lib/build';
import { buildTimeline, duration, offset, type Timeline, type TimelineStep } from '@/lib/timeline';
import type { Build } from '@/lib/types';

const OUTCOMES = new Set(['Ready for your approval', 'Pull request opened', 'Completed']);

function useTimeline(build: Build): Timeline {
  const [now, setNow] = useState(() => Date.now());
  const tl = buildTimeline(build, now);
  useEffect(() => {
    if (!tl.live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tl.live]);
  return tl;
}

function stepDuration(s: TimelineStep, tl: Timeline): number {
  return (s.end ?? tl.end) - s.start;
}

// RunBar is the run at a glance: one segment per step, as wide as it took, grouped and labelled by phase.
export function RunBar({ build }: { build: Build }) {
  const tl = useTimeline(build);
  const total = Math.max(1, tl.end - tl.origin);
  if (!tl.steps.length) return null;
  const pct = (ms: number) => `${((ms - tl.origin) / total) * 100}%`;
  const labelled = tl.phases.filter((p, i) => p.current || i === 0 || (p.end - p.start) / total >= 0.14);

  return (
    <div className="runbar" aria-label="Run timeline">
      <div className="runbar__labels mono">
        {labelled.map((p) => (
          <span key={`${p.name}-${p.start}`} className={`runbar__label ${p.current ? 'runbar__label--current' : ''}`} style={{ left: pct(p.start) }}>
            {p.name.toLowerCase()} · {duration(p.end - p.start)}
          </span>
        ))}
      </div>
      <div className="runbar__track">
        {tl.phases.map((p) =>
          p.steps
            .filter((s) => !s.background)
            .map((s) => (
              <span
                key={s.id}
                className={`runbar__seg runbar__seg--${s.state} ${p.current ? 'runbar__seg--current' : ''}`}
                style={{ left: pct(s.start), width: `max(4px, calc(${(stepDuration(s, tl) / total) * 100}% - 3px))` }}
                title={`${s.label} · ${duration(stepDuration(s, tl))}`}
              />
            )),
        )}
      </div>
      <div className="runbar__ticks mono">
        {labelled.map((p) => (
          <span key={`${p.name}-${p.start}`} style={{ left: pct(p.start) }}>
            {offset(p.start - tl.origin)}
          </span>
        ))}
        <span className="runbar__tick--end">{offset(tl.end - tl.origin)}</span>
      </div>
    </div>
  );
}

function Marker({ s, tall }: { s: TimelineStep; tall: boolean }) {
  if (tall) return <span className={`tl__bar tl__bar--${s.state}`} />;
  return <span className={`tl__dot tl__dot--${s.state}`} />;
}

// RunTimeline lists every step with when it started, how long it took and, for checks, what the base commit measured.
export function RunTimeline({ build }: { build: Build }) {
  const tl = useTimeline(build);
  const total = Math.max(1, tl.end - tl.origin);
  if (!tl.steps.length) return <p className="muted">Nothing has happened yet.</p>;

  return (
    <ol className="tl">
      {tl.phases.map((p) => (
        <li key={`${p.name}-${p.start}`} className="tl__phase">
          <div className="tl__row tl__row--phase">
            <span />
            <span className="tl__rail" />
            <span className="tl__phase-name">{p.name}</span>
            <span className="tl__dur mono">{p.steps.every((s) => s.state === 'point') ? '' : duration(p.end - p.start)}</span>
          </div>
          {p.steps.map((s) => {
            const d = stepDuration(s, tl);
            const tall = s.state !== 'point' && d / total >= 0.08;
            const outcome = s.state === 'point' && OUTCOMES.has(s.label);
            return (
              <div key={s.id} className={`tl__row tl__row--${s.state} ${outcome ? 'tl__row--outcome' : ''}`} style={tall ? { minHeight: `${Math.min(150, 34 + (d / total) * 260)}px` } : undefined}>
                <span className="tl__time mono">{offset(s.start - tl.origin)}</span>
                <span className="tl__rail">
                  <Marker s={s} tall={tall} />
                </span>
                <span className="tl__main">
                  <span className="tl__label">
                    {s.label}
                    {s.agent ? <span className="tl__agent"> · {s.agent}</span> : null}
                  </span>
                  {s.notes.map((n, i) => (
                    <span key={i} className="tl__note mono">
                      {n.text}
                      {n.was ? <span className="tl__was"> · was {n.was}</span> : null}
                    </span>
                  ))}
                </span>
                <span className="tl__dur mono">
                  {outcome ? <strong>{duration(s.start - tl.origin)}</strong> : s.state === 'skipped' ? 'skipped' : s.state === 'point' ? '' : s.state === 'running' ? `${duration(d)}…` : duration(d)}
                </span>
              </div>
            );
          })}
        </li>
      ))}
    </ol>
  );
}

function CheckCircle({ state }: { state: 'done' | 'current' | 'skipped' | 'failed' }) {
  if (state === 'skipped')
    return (
      <span className="cc cc--skipped">
        <Icon icon={Minus} size="sm" />
      </span>
    );
  return (
    <span className={`cc cc--${state}`}>
      <Icon icon={state === 'failed' ? X : Check} size="sm" />
    </span>
  );
}

// RunOutcome is the run's answer in one line, with the total time under it.
export function RunOutcome({ build, children }: { build: Build; children?: React.ReactNode }) {
  const tl = useTimeline(build);
  const verdict = build.kind === 'autofix' && build.verification?.verdict && build.verification.verdict !== 'not_run' ? build.verification.verdict : undefined;
  const tone = buildTone(build.status);
  const s = build.check_summary;
  const checksRun = s.Passed + s.Failed + s.Baseline + s.Blocked + s.NotRun + s.Skipped;
  const reviews = build.reviews ?? [];
  const facts: { label: string; state: 'done' | 'current' | 'skipped' | 'failed'; value: string }[] = [
    {
      label: 'Tasks',
      state: build.tasks.length && build.summary.tasks_completed === build.tasks.length ? 'done' : build.summary.tasks_failed ? 'failed' : 'current',
      value: build.tasks.length ? `${build.summary.tasks_completed}/${build.tasks.length}` : '—',
    },
    { label: 'Checks', state: !checksRun ? 'current' : build.verified ? 'done' : 'failed', value: checksRun ? `${s.Passed} passed${s.Failed ? ` · ${s.Failed} failed` : ''}` : 'not run' },
    {
      label: 'Review',
      state: !build.policy.review ? 'skipped' : reviews.some((r) => r.status === 'completed') ? 'done' : 'current',
      value: build.policy.review ? `${reviews.length}/${build.policy.max_review_cycles}` : 'off',
    },
  ];

  return (
    <div className="outcome">
      <ul className="outcome__facts">
        {facts.map((f) => (
          <li key={f.label} className={`outcome__fact outcome__fact--${f.state}`}>
            <CheckCircle state={f.state} />
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
