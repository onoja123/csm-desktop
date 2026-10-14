import { Activity, ArrowLeftRight, History, Home, LayoutList, ListTodo, Plug, Siren, TerminalSquare, UserRound, Workflow } from 'lucide-react';
import type { NavItem } from '@/types';

export const NAV: NavItem[] = [
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
