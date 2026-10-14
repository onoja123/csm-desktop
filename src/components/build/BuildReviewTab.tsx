import { Alert02Icon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import { FINDING_STATUS_LABEL, severityTone } from '@/lib/build';
import { plural, PROVIDER_LONG_NAMES } from '@/lib/format';
import type { Build } from '@/types';

export function BuildReviewTab({ build }: { build: Build }) {
  const reviews = build.reviews ?? [];
  const findings = build.findings ?? [];
  if (!reviews.length && !findings.length) return <p className="muted">{build.policy.review ? 'The review runs after the tasks are integrated and checked.' : 'Agent review is off for this run.'}</p>;
  return (
    <div className="build-review">
      {reviews.map((r) => (
        <div key={r.cycle} className="build-review__round">
          <div className="build-review__head">
            <AgentIcon provider={r.provider} size="md" />
            <strong>Round {r.cycle}</strong>
            <span className="muted">
              {PROVIDER_LONG_NAMES[r.provider]}
              {r.account ? ` (${r.account})` : ''} · {r.status === 'running' ? 'reviewing' : r.verdict?.replace(/_/g, ' ') || r.status}
            </span>
          </div>
          {!r.independent && r.note ? (
            <p className="build-note">
              <Icon icon={Alert02Icon} size="sm" className="tone-warn" /> {r.note}
            </p>
          ) : null}
          {r.summary ? <p className="selectable">{r.summary}</p> : null}
          {r.ignored_edits?.length ? <p className="muted">The reviewer edited {plural(r.ignored_edits.length, 'file')} in its review copy; those edits were not used.</p> : null}
        </div>
      ))}
      {findings.length ? (
        <div className="build-findings">
          {findings.map((f) => (
            <div key={f.id} className="build-finding">
              <div className="build-finding__head">
                <StatusText tone={severityTone(f)}>{f.severity}</StatusText>
                <strong>{f.title}</strong>
                {f.blocking ? <span className="build-finding__tag">blocking</span> : null}
                <span className="muted">
                  round {f.cycle} · {FINDING_STATUS_LABEL[f.status]}
                </span>
              </div>
              {f.file ? (
                <p className="mono muted">
                  {f.file}
                  {f.line ? `:${f.line}` : ''}
                  {f.task_id ? ` · task ${f.task_id}` : ''}
                </p>
              ) : null}
              {f.explanation ? <pre className="build-finding__text selectable">{f.explanation}</pre> : null}
              {f.reasoning ? <p className="selectable muted">{f.reasoning}</p> : null}
              {f.recommendation ? <p className="selectable">Suggested fix: {f.recommendation}</p> : null}
              <p className="build-finding__source">Source: {f.source}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
