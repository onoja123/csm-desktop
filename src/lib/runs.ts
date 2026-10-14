import type { AnyRun, RunBucket } from '@/types';

const STOP_CODES = new Set([130, 143, 129]);

export function bucketOf(run: AnyRun, waitingIds: Set<string>): RunBucket {
  if (run.status === 'running') return waitingIds.has(run.id) ? 'waiting' : 'running';
  const code = 'exit_code' in run ? run.exit_code : undefined;
  if (code === 0 || code === undefined) return 'completed';
  return STOP_CODES.has(code) ? 'stopped' : 'failed';
}
