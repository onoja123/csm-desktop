import { Link } from 'react-router-dom';
import { Button, StatusText } from '@/components/ui';
import { BUILD_STATUS_LABEL, buildTone, severityToneOf, VERDICT_LABEL, verdictTone } from '@/lib/build';
import { ago } from '@/lib/format';
import type { BuildSummary, Incident } from '@/types';

export function IncidentRow({ incident: i, runs, busy, onStart }: { incident: Incident; runs: BuildSummary[]; busy: boolean; onStart: () => void }) {
  const latest = runs[0];
  return (
    <div className="af-row">
      <div className="af-row__main">
        <span className="af-row__title">{i.title}</span>
        <span className="af-row__meta">
          <span className="af-source">{i.source}</span> {i.project} · {i.count} occurrence{i.count === 1 ? '' : 's'} · last {ago(i.last_seen)}
          {i.environment ? ` · ${i.environment}` : ''}
        </span>
        {i.note ? <span className="build-row__attention">{i.note}</span> : null}
      </div>
      <StatusText tone={severityToneOf(i.severity)}>{i.severity}</StatusText>
      {latest ? (
        <Link to={`/build/${latest.id}`} className="af-row__run">
          <StatusText tone={buildTone(latest.status)} pulse={!['completed', 'failed', 'cancelled', 'awaiting_final_approval', 'needs_attention'].includes(latest.status)}>
            {BUILD_STATUS_LABEL[latest.status]}
          </StatusText>
          {latest.verdict && latest.verdict !== 'not_run' ? <StatusText tone={verdictTone(latest.verdict)}>{VERDICT_LABEL[latest.verdict]}</StatusText> : null}
        </Link>
      ) : i.status === 'unmapped' ? (
        <span className="muted">Not mapped</span>
      ) : (
        <Button size="sm" onClick={onStart} loading={busy}>
          Start run
        </Button>
      )}
    </div>
  );
}
