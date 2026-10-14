import { NavLink, useLocation } from 'react-router-dom';
import { Activity, ArrowLeftRight, History, Home, LayoutList, ListTodo, Plug, Settings, TerminalSquare, Siren, UserRound, Workflow, type LucideIcon } from 'lucide-react';
import { Icon, StatusDot } from '@/components/ui';
import { useConnection } from '@/store/connection';
import { useData } from '@/store/data';
import { useSessions } from '@/components/mission/useSessions';
import { needsAttention } from '@/lib/mission';
import { Logo } from './Logo';

export const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/terminal', label: 'Terminal', icon: TerminalSquare },
  { to: '/mission', label: 'Mission Control', icon: LayoutList },
  { to: '/build', label: 'Build Room', icon: Workflow },
  { to: '/autofix', label: 'AutoFix', icon: Siren },
  { to: '/accounts', label: 'Accounts', icon: UserRound },
  { to: '/mcp', label: 'MCP', icon: Plug },
  { to: '/sessions', label: 'Sessions', icon: History },
  { to: '/handoffs', label: 'Handoffs', icon: ArrowLeftRight },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/activity', label: 'Activity', icon: Activity },
];

export function Sidebar() {
  const phase = useConnection((s) => s.phase);
  const status = useData((s) => s.status);
  const pending = useData((s) => s.approvals.pending.length);
  const sessions = useSessions();
  const attention = sessions.filter(needsAttention).length;
  const live = sessions.filter((s) => s.live).length;
  const waiting = (b: { status: string }) => b.status === 'needs_attention' || b.status === 'awaiting_plan_approval' || b.status === 'awaiting_final_approval';
  const buildsWaiting = useData((s) => s.builds.filter((b) => b.kind !== 'autofix' && waiting(b)).length);
  const { pathname } = useLocation();
  const runID = /^\/build\/([^/]+)/.exec(pathname)?.[1];
  const inAutofixRun = useData((s) => !!runID && s.builds.some((b) => b.id === runID && b.kind === 'autofix'));
  const fixesWaiting = useData((s) => s.builds.filter((b) => b.kind === 'autofix' && waiting(b)).length + s.signals.filter((i) => i.status === 'unmapped').length);

  const badge = (to: string) => {
    if (to === '/mission') return attention || live;
    if (to === '/tasks' && pending) return pending;
    if (to === '/build') return buildsWaiting;
    if (to === '/autofix') return fixesWaiting;
    return 0;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand" data-tauri-drag-region>
        <span className="sidebar__logo"><Logo /></span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${(inAutofixRun ? item.to === '/autofix' : isActive) ? 'nav-item--active' : ''}`}>
            <Icon icon={item.icon} size="lg" />
            <span>{item.label}</span>
            {badge(item.to) ? <span className={`nav-item__badge ${(item.to === '/mission' && attention) || item.to === '/build' || item.to === '/autofix' ? 'nav-item__badge--attention' : ''}`}>{badge(item.to)}</span> : null}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
          <Icon icon={Settings} size="lg" />
          <span>Settings</span>
        </NavLink>
        <div className="sidebar__status">
          <StatusDot tone={phase === 'connected' ? 'ok' : phase === 'starting' || phase === 'connecting' ? 'warn' : 'err'} pulse={phase === 'starting'} />
          <span>
            {phase === 'connected' ? 'CSM running' : phase === 'starting' ? 'Starting CSM' : phase === 'connecting' || phase === 'booting' ? 'Connecting' : 'CSM not connected'}
          </span>
          {phase === 'connected' && status ? <span className="sidebar__version mono">{status.service.version}</span> : null}
        </div>
      </div>
    </aside>
  );
}
