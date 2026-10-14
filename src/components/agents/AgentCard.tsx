import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen, GitBranch } from 'lucide-react';
import { AgentIcon } from './AgentIcon';
import { AgentStatus } from './AgentStatus';
import { Icon } from '@/components/ui';
import type { AnyRun } from '@/types';
import { baseName, duration, liveSeconds, plural, PROVIDER_LONG_NAMES } from '@/lib/format';
import { useNow } from '@/hooks/useNow';

export function AgentCard({ run, compact = false }: { run: AnyRun; compact?: boolean }) {
  const task = 'task' in run ? run.task : undefined;
  const now = useNow();
  const seconds = liveSeconds(run.started_at, 'ended_at' in run ? run.ended_at : undefined, now);
  const files = task?.files_modified?.length ?? 0;
  const to = run.kind === 'external' ? '/mission' : `/agents/${run.id}`;

  return (
    <Link to={to} className={`agent-card ${compact ? 'agent-card--compact' : ''}`}>
      <AgentIcon provider={run.provider} size={compact ? 'lg' : 'xl'} />
      <div className="agent-card__body">
        <div className="agent-card__top">
          <span className="agent-card__name">{PROVIDER_LONG_NAMES[run.provider] ?? run.provider}</span>
          <AgentStatus run={run} />
        </div>
        <p className="agent-card__task">{task?.summary || (run.status === 'running' ? 'Waiting for the first request' : 'No task recorded')}</p>
        <div className="agent-card__meta">
          <span className="mono">{run.account}</span>
          <span className="agent-card__sep" />
          <span>
            <Icon icon={FolderOpen} size="sm" /> {baseName(run.project_dir)}
          </span>
          {'branch' in run && run.branch ? (
            <span>
              <Icon icon={GitBranch} size="sm" /> {run.branch}
            </span>
          ) : null}
          <span className="agent-card__sep" />
          <span>{duration(seconds)}</span>
          {files > 0 ? <span>{plural(files, 'file')} touched</span> : null}
        </div>
      </div>
      {run.kind !== 'external' ? <Icon icon={ChevronRight} size="md" className="agent-card__chevron" /> : null}
    </Link>
  );
}
