import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { TaskList } from '@/components/tasks/TaskCard';
import { EmptyState, PageHeader, Tabs } from '@/components/ui';
import type { ExternalRun, Run } from '@/lib/types';
import { useData } from '@/store/data';

type Bucket = 'running' | 'waiting' | 'completed' | 'failed' | 'stopped';

const STOP_CODES = new Set([130, 143, 129]);

export function bucketOf(run: Run | ExternalRun, waitingIds: Set<string>): Bucket {
  if (run.status === 'running') return waitingIds.has(run.id) ? 'waiting' : 'running';
  const code = 'exit_code' in run ? run.exit_code : undefined;
  if (code === 0 || code === undefined) return 'completed';
  return STOP_CODES.has(code) ? 'stopped' : 'failed';
}

export function Tasks() {
  const { runs, approvals } = useData();
  const [tab, setTab] = useState<Bucket>('running');
  const waiting = new Set(approvals.pending.map((a) => a.run_id).filter(Boolean) as string[]);
  const all: (Run | ExternalRun)[] = [...runs.runs, ...runs.external];
  const buckets: Record<Bucket, (Run | ExternalRun)[]> = { running: [], waiting: [], completed: [], failed: [], stopped: [] };
  for (const r of all) buckets[bucketOf(r, waiting)].push(r);

  return (
    <Page>
      <PageHeader title="Tasks" subtitle="What each agent is working on, according to its own session record." />
      <Tabs<Bucket>
        tabs={[
          { id: 'running', label: 'Running', count: buckets.running.length },
          { id: 'waiting', label: 'Waiting', count: buckets.waiting.length },
          { id: 'completed', label: 'Completed', count: buckets.completed.length },
          { id: 'failed', label: 'Failed', count: buckets.failed.length },
          { id: 'stopped', label: 'Stopped', count: buckets.stopped.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <TaskList runs={buckets[tab]} empty={<EmptyState icon={ListTodo} title={`Nothing ${tab}`} body={tab === 'waiting' ? 'Agents waiting for an approval show up here.' : 'Tasks are the sessions CSM runs; start one from Agents.'} />} />
    </Page>
  );
}
