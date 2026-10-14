import { StatusText } from '@/components/ui';
import type { AnyRun, StatusTone } from '@/types';
import { ago } from '@/lib/format';

function runTone(run: AnyRun): StatusTone {
  if (run.status === 'running') return 'ok';

  const code = 'exit_code' in run ? run.exit_code : undefined;

  return code && code !== 0 ? 'err' : 'idle';
}

function runLabel(run: AnyRun): string {
  if (run.status === 'running')
    return run.kind === 'external' ? 'Running in a terminal' : 'Running';

  const code = 'exit_code' in run ? run.exit_code : undefined;

  if (code === undefined) return 'Exited';

  return code === 0 ? 'Exited' : `Exited (${code})`;
}

export function AgentStatus({
  run,
  withActivity = false,
}: {
  run: AnyRun;
  withActivity?: boolean;
}) {
  const tone = runTone(run);
  const last = 'last_output_at' in run ? run.last_output_at : undefined;

  return (
    <span className="agent-status">
      <StatusText tone={tone} pulse={run.status === 'running'}>
        {runLabel(run)}
      </StatusText>

      {withActivity && run.status === 'running' && last ? (
        <span className="agent-status__meta">Last activity {ago(last)}</span>
      ) : null}
    </span>
  );
}
