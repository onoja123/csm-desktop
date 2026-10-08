import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { Icon } from '@/components/ui';
import type { ExternalRun, Run } from '@/lib/types';
import { PROVIDER_NAMES, ago, baseName, duration } from '@/lib/format';
import { liveSeconds, useNow } from '@/lib/use-now';

export function TaskCard({ run }: { run: Run | ExternalRun }) {
  const task = 'task' in run ? run.task : undefined;
  const now = useNow();
  const seconds = liveSeconds(run.started_at, 'ended_at' in run ? run.ended_at : undefined, now);
  const last = 'last_output_at' in run ? run.last_output_at : undefined;
  const to = run.kind === 'external' ? '/agents' : `/agents/${run.id}`;
  return (
    <Link to={to} className="task-card">
      <AgentIcon provider={run.provider} size="md" />
      <div className="task-card__main">
        <span className="task-card__title">{task?.summary || (run.kind === 'handoff' ? 'Handoff' : 'No request recorded yet')}</span>
        <span className="task-card__meta">
          {PROVIDER_NAMES[run.provider]} · <span className="mono">{run.account}</span> · <Icon icon={FolderOpen} size="sm" /> {baseName(run.project_dir)}
        </span>
      </div>
      <div className="task-card__status">
        <AgentStatus run={run} />
        <span className="task-card__time">
          {duration(seconds)}
          {run.status === 'running' && last ? ` · last activity ${ago(last, now)}` : ''}
        </span>
      </div>
      <Icon icon={ChevronRight} size="md" className="agent-card__chevron" />
    </Link>
  );
}

export function TaskList({ runs, empty }: { runs: (Run | ExternalRun)[]; empty: React.ReactNode }) {
  if (runs.length === 0) return <>{empty}</>;
  return (
    <div className="list">
      {runs.map((r) => (
        <TaskCard key={r.id} run={r} />
      ))}
    </div>
  );
}
