import { duration, offset, stepDuration } from '@/lib/timeline';
import type { Build } from '@/types';

const OUTCOMES = new Set(['Ready for your approval', 'Pull request opened', 'Completed']);

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

            <span className="tl__dur mono">
              {p.steps.every((s) => s.state === 'point') ? '' : duration(p.end - p.start)}
            </span>
          </div>

          {p.steps.map((s) => {
            const d = stepDuration(s, tl);
            const tall = s.state !== 'point' && d / total >= 0.08;
            const outcome = s.state === 'point' && OUTCOMES.has(s.label);

            return (
              <div
                key={s.id}
                className={`tl__row tl__row--${s.state} ${outcome ? 'tl__row--outcome' : ''}`}
                style={
                  tall ? { minHeight: `${Math.min(150, 34 + (d / total) * 260)}px` } : undefined
                }
              >
                <span className="tl__time mono">{offset(s.start - tl.origin)}</span>

                <span className="tl__rail">
                  <TimelineMarker s={s} tall={tall} />
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
                  {outcome ? (
                    <strong>{duration(s.start - tl.origin)}</strong>
                  ) : s.state === 'skipped' ? (
                    'skipped'
                  ) : s.state === 'point' ? (
                    ''
                  ) : s.state === 'running' ? (
                    `${duration(d)}…`
                  ) : (
                    duration(d)
                  )}
                </span>
              </div>
            );
          })}
        </li>
      ))}
    </ol>
  );
}

import { useTimeline } from '@/hooks/useTimeline';
import { TimelineMarker } from './TimelineMarker';
