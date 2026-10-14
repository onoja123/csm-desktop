import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import { BUILD_STATUS_LABEL, buildTone, groupOf } from '@/lib/build';
import { ago } from '@/lib/format';
import type { BuildSummary } from '@/types';

export function BuildRow({ build: b }: { build: BuildSummary }) {
  const pct = b.tasks ? Math.round((b.tasks_completed / b.tasks) * 100) : 0;
  return (
    <Link to={`/build/${b.id}`} className="build-row">
      <div className="build-row__main">
        <span className="build-row__title">{b.title}</span>
        <span className="build-row__meta">
          <Icon icon={GitBranch} size="sm" />
          {b.repo_name} · {b.base_branch} · {ago(b.updated_at)}
        </span>
        {b.attention ? <span className="build-row__attention">{b.attention}</span> : null}
      </div>
      <div className="build-row__agents">
        {b.agents.map((p) => (
          <AgentIcon key={p} provider={p} size="md" />
        ))}
      </div>
      <div className="build-row__progress" title={`${b.tasks_completed} of ${b.tasks} tasks completed`}>
        {b.tasks ? (
          <>
            <span className="build-row__bar">
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="build-row__count">
              {b.tasks_completed}/{b.tasks} tasks
            </span>
          </>
        ) : (
          <span className="build-row__count muted">No plan yet</span>
        )}
      </div>
      <StatusText tone={buildTone(b.status)} pulse={groupOf(b) === 'active'}>
        {b.paused ? 'Paused' : BUILD_STATUS_LABEL[b.status]}
      </StatusText>
    </Link>
  );
}
