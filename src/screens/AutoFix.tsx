import { useEffect, useState } from 'react';
import { Page } from '@/components/shell/Page';
import { PageHeader, Tabs } from '@/components/ui';
import { IncidentList } from '@/components/autofix/IncidentList';
import { AutofixSettings } from '@/components/autofix/AutofixSettings';
import type { AutofixTab } from '@/types';
import { useData } from '@/store/data';

export function AutoFix() {
  const [tab, setTab] = useState<AutofixTab>('incidents');
  const refresh = useData((s) => s.refresh);

  useEffect(() => {
    void refresh('signals');
    void refresh('builds');
  }, [refresh]);

  return (
    <Page>
      <PageHeader
        title="AutoFix"
        subtitle="Production errors become engineering runs: CSM investigates, reproduces the failure in a sandbox, fixes it with your agents, verifies the fix and prepares a pull request for you to review."
      />

      <Tabs<AutofixTab>
        tabs={[
          { id: 'incidents', label: 'Incidents' },
          { id: 'settings', label: 'Settings' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'incidents' ? (
        <IncidentList onSetup={() => setTab('settings')} />
      ) : (
        <AutofixSettings />
      )}
    </Page>
  );
}
