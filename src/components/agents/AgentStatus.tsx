import { StatusText } from '@/components/ui';
import type { Tone } from '@/design/tokens';
import type { Run, ExternalRun } from '@/lib/types';
import { ago } from '@/lib/format';

export function runTone(run: Run | ExternalRun): Tone {
  if (run.status === 'running') return 'ok';
  const code = 'exit_code' in run ? run.exit_code : undefined;
  return code && code !== 0 ? 'err' : 'idle';
}

export function runLabel(run: Run | ExternalRun): string {
  if (run.status === 'running') return run.kind === 'external' ? 'Running in a terminal' : 'Running';
  const code = 'exit_code' in run ? run.exit_code : undefined;
  if (code === undefined) return 'Exited';
  return code === 0 ? 'Exited' : `Exited (${code})`;
}

export function AgentStatus({ run, withActivity = false }: { run: Run | ExternalRun; withActivity?: boolean }) {
  const tone = runTone(run);
  const last = 'last_output_at' in run ? run.last_output_at : undefined;
  return (
    <span className="agent-status">
      <StatusText tone={tone} pulse={run.status === 'running'}>
        {runLabel(run)}
      </StatusText>
      {withActivity && run.status === 'running' && last ? <span className="agent-status__meta">Last activity {ago(last)}</span> : null}
    </span>
  );
}
