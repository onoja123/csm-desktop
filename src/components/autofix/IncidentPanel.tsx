import { Panel, StatusText } from '@/components/ui';
import { severityToneOf } from '@/lib/build';
import { ago } from '@/lib/format';
import type { BuildHubLink, Signal } from '@/types';

export function IncidentPanel({ signal, hub }: { signal: Signal; hub?: BuildHubLink }) {
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
