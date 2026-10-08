import { useState } from 'react';
import { Activity as ActivityIcon } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { ActivityItem } from '@/components/activity/ActivityItem';
import { EmptyState, PageHeader, Tabs } from '@/components/ui';
import { useData } from '@/store/data';

type Filter = 'all' | 'agents' | 'accounts' | 'approvals' | 'handoffs';

function matches(kind: string, f: Filter): boolean {
  switch (f) {
    case 'agents':
      return kind.startsWith('run.') || kind === 'session.resumed';
    case 'accounts':
      return kind === 'switch' || kind === 'switch.requested' || kind === 'account.activated' || kind === 'usage_limit' || kind === 'checkpoint' || kind === 'failover.policy';
    case 'approvals':
      return kind.startsWith('approval.');
    case 'handoffs':
      return kind.startsWith('handoff.');
    default:
      return true;
  }
}

export function ActivityScreen() {
  const activity = useData((s) => s.activity);
  const [filter, setFilter] = useState<Filter>('all');
  const shown = activity.filter((a) => matches(a.kind, filter));
  return (
    <Page>
      <PageHeader title="Activity" subtitle="What CSM did and why, newest first." />
      <Tabs<Filter>
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'agents', label: 'Agents' },
          { id: 'accounts', label: 'Accounts' },
          { id: 'approvals', label: 'Approvals' },
          { id: 'handoffs', label: 'Handoffs' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {shown.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="Nothing here yet" body="Agent starts, switches, approvals and handoffs appear as they happen." />
      ) : (
        <div className="list list--tight">
          {shown.map((a) => (
            <ActivityItem key={a.id} activity={a} />
          ))}
        </div>
      )}
    </Page>
  );
}
