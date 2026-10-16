import {
  ArrowDataTransferHorizontalIcon,
  BookOpen01Icon,
  CheckListIcon,
  ComputerTerminal01Icon,
  DashboardSquare02Icon,
  Home03Icon,
  Plug01Icon,
  Pulse01Icon,
  SirenIcon,
  TimeQuarter02Icon,
  UserIcon,
  WorkflowSquare03Icon,
} from '@hugeicons/core-free-icons';
import type { NavItem } from '@/types';

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home03Icon, end: true },
  { to: '/terminal', label: 'Terminal', icon: ComputerTerminal01Icon },
  { to: '/mission', label: 'Mission Control', icon: DashboardSquare02Icon },
  { to: '/build', label: 'Build Room', icon: WorkflowSquare03Icon },
  { to: '/autofix', label: 'AutoFix', icon: SirenIcon },
  { to: '/accounts', label: 'Accounts', icon: UserIcon },
  { to: '/skills', label: 'Skills', icon: BookOpen01Icon },
  { to: '/mcp', label: 'MCP', icon: Plug01Icon },
  { to: '/sessions', label: 'Sessions', icon: TimeQuarter02Icon },
  { to: '/handoffs', label: 'Handoffs', icon: ArrowDataTransferHorizontalIcon },
  { to: '/tasks', label: 'Tasks', icon: CheckListIcon },
  { to: '/activity', label: 'Activity', icon: Pulse01Icon },
];
