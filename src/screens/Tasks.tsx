import { useState } from 'react';
import { CheckListIcon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { TaskList } from '@/components/tasks/TaskList';
import { EmptyState, PageHeader, Tabs } from '@/components/ui';
import { bucketOf } from '@/lib/runs';
import type { AnyRun, RunBucket } from '@/types';
import { useData } from '@/store/data';

export function Tasks() {
  const { runs, approvals } = useData();
  const [tab, setTab] = useState<RunBucket>('running');
  const waiting = new Set(approvals.pending.map((a) => a.run_id).filter(Boolean) as string[]);
  const all: AnyRun[] = [...runs.runs, ...runs.external];

  const buckets: Record<RunBucket, AnyRun[]> = {
    running: [],
    waiting: [],
    completed: [],
    failed: [],
    stopped: [],
  };

  for (const r of all) buckets[bucketOf(r, waiting)].push(r);

  return (
    <Page>
      <PageHeader
        title="Tasks"
        subtitle="What each agent is working on, according to its own session record."
      />

      <Tabs<RunBucket>
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

      <TaskList
        runs={buckets[tab]}
        empty={
          <EmptyState
            icon={CheckListIcon}
            title={`Nothing ${tab}`}
            body={
              tab === 'waiting'
                ? 'Agents waiting for an approval show up here.'
                : 'Tasks are the sessions CSM runs; start one from Agents.'
            }
          />
        }
      />
    </Page>
  );
}
