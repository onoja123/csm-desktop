export type PaneKind = 'shell' | 'agent';

export interface ShellPane {
  kind: 'shell';
  id: string;
  sessionId?: string;
  cwd: string;
  shell?: string;
  title: string;
  exited?: { code: number | null };
}

export interface AgentPane {
  kind: 'agent';
  id: string;
  runId: string;
  title: string;
}

export type Pane = ShellPane | AgentPane;

export type SplitDirection = 'row' | 'column';

export type LayoutNode = { type: 'leaf'; paneId: string } | { type: 'split'; direction: SplitDirection; children: LayoutNode[]; sizes: number[] };

export interface Tab {
  id: string;
  layout: LayoutNode;
  activePaneId: string;
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: 10000 | 25000 | 50000 | 100000;
  shell: string;
  defaultCwd: string;
  copyOnSelect: boolean;
  confirmCloseRunning: boolean;
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.3,
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 25000,
  shell: '',
  defaultCwd: '',
  copyOnSelect: false,
  confirmCloseRunning: true,
};

export interface PersistedState {
  version: 1;
  tabs: { panes: { kind: 'shell'; cwd: string; shell?: string }[]; layout: LayoutNode; activeIndex: number }[];
  activeTab: number;
}
