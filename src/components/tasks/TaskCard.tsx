import { Link } from 'react-router-dom';
import { ArrowRight01Icon, Folder02Icon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { Icon } from '@/components/ui';
import type { AnyRun } from '@/types';
import { ago, baseName, duration, liveSeconds, PROVIDER_NAMES } from '@/lib/format';
import { useNow } from '@/hooks/useNow';

export function TaskCard({ run }: { run: AnyRun }) {
  const task = 'task' in run ? run.task : undefined;
  const now = useNow();
  const seconds = liveSeconds(run.started_at, 'ended_at' in run ? run.ended_at : undefined, now);
  const last = 'last_output_at' in run ? run.last_output_at : undefined;
  const to = run.kind === 'external' ? '/mission' : `/agents/${run.id}`;
  return (
    <Link to={to} className="task-card">
      <AgentIcon provider={run.provider} size="md" />
      <div className="task-card__main">
        <span className="task-card__title">{task?.summary || (run.kind === 'handoff' ? 'Handoff' : 'No request recorded yet')}</span>
        <span className="task-card__meta">
          {PROVIDER_NAMES[run.provider]} · <span className="mono">{run.account}</span> · <Icon icon={Folder02Icon} size="sm" /> {baseName(run.project_dir)}
        </span>
      </div>
      <div className="task-card__status">
        <AgentStatus run={run} />
        <span className="task-card__time">
          {duration(seconds)}
          {run.status === 'running' && last ? ` · last activity ${ago(last, now)}` : ''}
        </span>
      </div>
      <Icon icon={ArrowRight01Icon} size="md" className="agent-card__chevron" />
    </Link>
  );
}
