import { useTimeline } from '@/hooks/useTimeline';
import { duration, offset, stepDuration } from '@/lib/timeline';
import type { Build } from '@/types';

// RunBar is the run at a glance: one segment per step, as wide as it took, grouped and labelled by phase.
export function RunBar({ build }: { build: Build }) {
  const tl = useTimeline(build);
  const total = Math.max(1, tl.end - tl.origin);

  if (!tl.steps.length) return null;

  const pct = (ms: number) => `${((ms - tl.origin) / total) * 100}%`;

  const labelled = tl.phases.filter(
    (p, i) => p.current || i === 0 || (p.end - p.start) / total >= 0.14,
  );

  return (
    <div className="runbar" aria-label="Run timeline">
      <div className="runbar__labels mono">
        {labelled.map((p) => (
          <span
            key={`${p.name}-${p.start}`}
            className={`runbar__label ${p.current ? 'runbar__label--current' : ''}`}
            style={{ left: pct(p.start) }}
          >
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
                style={{
                  left: pct(s.start),
                  width: `max(4px, calc(${(stepDuration(s, tl) / total) * 100}% - 3px))`,
                }}
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
