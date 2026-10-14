import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ComputerTerminal01Icon } from '@hugeicons/core-free-icons';
import { TerminalTabs } from '@/components/terminal/TerminalTabs';
import { PaneLayout } from '@/components/terminal/PaneLayout';
import { TerminalSearch } from '@/components/terminal/TerminalSearch';
import { TerminalStatus } from '@/components/terminal/TerminalStatus';
import { Button, EmptyState } from '@/components/ui';
import { useTerminal } from '@/terminal/store';
import { useData } from '@/store/data';

// The terminal keeps living while other screens are shown: this screen only mounts the view over the manager's state.
export function TerminalScreen() {
  const { hydrated, hydrate, newTab, openAgentTab, activeTab } = useTerminal();
  const loc = useLocation();
  const nav = useNavigate();
  const runs = useData((s) => s.runs.runs);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const cwd = params.get('cwd');
    const runId = params.get('run');

    if (!hydrated) return;

    if (runId) {
      const run = runs.find((r) => r.id === runId);

      openAgentTab(runId, run ? `${run.provider} · ${run.account}` : 'agent');
      nav('/terminal', { replace: true });
    } else if (cwd) {
      void newTab({ cwd }).then(() => nav('/terminal', { replace: true }));
    }
  }, [loc.search, hydrated, runs, openAgentTab, newTab, nav]);

  const tab = activeTab();

  return (
    <div className="term-screen">
      <TerminalTabs />
      <TerminalSearch />

      <div className="term-screen__body">
        {tab ? (
          <PaneLayout key={tab.id} tab={tab} />
        ) : (
          <div className="term-screen__empty">
            <EmptyState
              icon={ComputerTerminal01Icon}
              title="No terminal open"
              body="Open a shell in your home directory, or start one in a project from an agent's page."
              action={
                <Button variant="primary" onClick={() => void newTab()}>
                  New terminal
                </Button>
              }
            />
          </div>
        )}
      </div>

      <TerminalStatus />
    </div>
  );
}
