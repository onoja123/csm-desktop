import { NavLink } from 'react-router-dom';
import { Activity, ArrowLeftRight, Bot, History, Home, ListTodo, Plug, Settings, TerminalSquare, UserRound, type LucideIcon } from 'lucide-react';
import { Icon, StatusDot } from '@/components/ui';
import { useConnection } from '@/store/connection';
import { useData } from '@/store/data';

export const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/terminal', label: 'Terminal', icon: TerminalSquare },
  { to: '/agents', label: 'Agents', icon: Bot },
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
  const live = useData((s) => s.runs.runs.filter((r) => r.status === 'running').length + s.runs.external.length);

  const badge = (to: string) => {
    if (to === '/agents' && live) return live;
    if (to === '/tasks' && pending) return pending;
    return 0;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand" data-tauri-drag-region>
        <span className="sidebar__logo">CSM</span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Icon icon={item.icon} size="lg" />
            <span>{item.label}</span>
            {badge(item.to) ? <span className="nav-item__badge">{badge(item.to)}</span> : null}
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
