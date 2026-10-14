import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useData } from '@/store/data';
import { useConnection } from '@/store/connection';
import { useTerminal } from '@/terminal/store';
import { useNow } from '@/lib/use-now';
import { normalizeSessions, type AgentSession } from '@/lib/mission';

// Status derivation only needs a coarse clock; rows show elapsed time from their own one-second tick.
const COARSE_MS = 5000;

export function useSessions(): AgentSession[] {
  const { runs, approvals, activity, accounts, status } = useData(
    useShallow((s) => ({ runs: s.runs, approvals: s.approvals.pending, activity: s.activity, accounts: s.accounts, status: s.status })),
  );
  const connected = useConnection((s) => s.phase === 'connected');
  const { tabs, panes } = useTerminal(useShallow((s) => ({ tabs: s.tabs, panes: s.panes })));
  const tick = Math.floor(useNow(COARSE_MS) / COARSE_MS);

  return useMemo(
    () => normalizeSessions({ runs: runs.runs, external: runs.external, approvals, activity, accounts, status, tabs, panes, connected, now: tick * COARSE_MS }),
    [runs, approvals, activity, accounts, status, tabs, panes, connected, tick],
  );
}
