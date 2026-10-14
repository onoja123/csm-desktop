import { AgentIcon } from '@/components/agents/AgentIcon';
import { StatusText } from '@/components/ui';
import { currentAgent, TASK_STATUS_LABEL, taskTone } from '@/lib/build';
import { PROVIDER_LONG_NAMES } from '@/lib/format';
import type { Build, BuildTask } from '@/types';

export function TaskNode({
  build,
  task: t,
  selected,
  onSelect,
}: {
  build: Build;
  task: BuildTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const agent = currentAgent(build, t);

  return (
    <button
      className={`build-node ${selected ? 'build-node--selected' : ''} build-node--${t.status}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="build-node__top">
        <span className="build-node__title">{t.title}</span>
        {agent.provider ? <AgentIcon provider={agent.provider} size="md" /> : null}
      </span>

      <span className="build-node__meta mono">
        {t.id}
        {t.depends_on?.length ? ` · after ${t.depends_on.join(', ')}` : ''}
      </span>

      <span className="build-node__foot">
        <StatusText tone={taskTone(t.status)} pulse={t.status === 'running'}>
          {TASK_STATUS_LABEL[t.status]}
        </StatusText>

        {agent.provider ? (
          <span className="muted">
            {agent.account ??
              PROVIDER_LONG_NAMES[agent.provider as keyof typeof PROVIDER_LONG_NAMES]}
          </span>
        ) : null}
      </span>

      {t.switches?.length ? (
        <span className="build-node__switch">
          {t.switches.map((s) => `${s.from} → ${s.to}`).join(', ')}
        </span>
      ) : null}
    </button>
  );
}
