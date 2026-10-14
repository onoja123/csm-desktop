import type { SearchAddon } from '@xterm/addon-search';
import type { Terminal } from '@xterm/xterm';
import type { LayoutNode } from '../aliases/terminal-layout.alias';
import type { CursorStyle, ScrollbackSize } from '../enums/terminal.enum';

export interface ShellPane {
  kind: 'shell';
  id: string;
  sessionId?: string;
  cwd: string;
  shell?: string;
  title: string;
  exited?: ShellExit;
}

export interface AgentPane {
  kind: 'agent';
  id: string;
  runId: string;
  title: string;
}

export interface TerminalTab {
  id: string;
  layout: LayoutNode;
  activePaneId: string;
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: ScrollbackSize;
  shell: string;
  defaultCwd: string;
  copyOnSelect: boolean;
  confirmCloseRunning: boolean;
}

export interface TerminalHandle {
  term: Terminal;
  search: SearchAddon;
  fit: () => void;
}

export interface ShellExit {
  code: number | null;
}
