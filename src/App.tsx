import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { ConnectionGate } from '@/components/shell/ConnectionGate';
import { CommandPalette } from '@/components/palette/CommandPalette';
import { StartAgentDialog } from '@/components/agents/StartAgentDialog';
import { HandoffDialog } from '@/components/handoffs/HandoffDialog';
import { CheckpointDialog } from '@/components/handoffs/CheckpointDialog';
import { Home } from '@/screens/Home';
import { MissionControl } from '@/screens/MissionControl';
import { BuildRoom, NewBuildRun } from '@/screens/BuildRoom';
import { BuildRun } from '@/screens/BuildRun';
import { AutoFix } from '@/screens/AutoFix';
import { AgentDetail } from '@/screens/AgentDetail';
import { Accounts } from '@/screens/Accounts';
import { AccountDetail } from '@/screens/AccountDetail';
import { MCP } from '@/screens/MCP';
import { Sessions } from '@/screens/Sessions';
import { Handoffs, HandoffDetail } from '@/screens/Handoffs';
import { Tasks } from '@/screens/Tasks';
import { ActivityScreen } from '@/screens/ActivityScreen';
import { Settings } from '@/screens/Settings';
import { TerminalScreen } from '@/screens/TerminalScreen';
import { useTerminalShortcuts } from '@/terminal/shortcuts';

function Shortcuts() {
  useTerminalShortcuts();
  return null;
}

// Development only: open on a given screen so a dev session can land on the terminal directly.
function DevStart() {
  const nav = useNavigate();
  useEffect(() => {
    const route = import.meta.env.DEV ? (import.meta.env.VITE_START_ROUTE as string | undefined) : undefined;
    if (route) nav(route, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function App() {
  return (
    <HashRouter>
      <Shortcuts />
      <DevStart />
      <AppShell>
        <ConnectionGate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/terminal" element={<TerminalScreen />} />
            <Route path="/mission" element={<MissionControl />} />
            <Route path="/build" element={<BuildRoom />} />
            <Route path="/build/new" element={<NewBuildRun />} />
            <Route path="/build/:id" element={<BuildRun />} />
            <Route path="/autofix" element={<AutoFix />} />
            <Route path="/agents" element={<Navigate to="/mission" replace />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:name" element={<AccountDetail />} />
            <Route path="/mcp" element={<MCP />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/handoffs" element={<Handoffs />} />
            <Route path="/handoffs/:project/:id" element={<HandoffDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/activity" element={<ActivityScreen />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <StartAgentDialog />
          <HandoffDialog />
          <CheckpointDialog />
        </ConnectionGate>
        <CommandPalette />
      </AppShell>
    </HashRouter>
  );
}
