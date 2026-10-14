import type { LayoutNode } from '../aliases/terminal-layout.alias';

export interface PersistedTerminalState {
  version: 1;
  tabs: PersistedTerminalTab[];
  activeTab: number;
}

export interface PersistedShellPane {
  kind: 'shell';
  cwd: string;
  shell?: string;
}

export interface PersistedTerminalTab {
  panes: PersistedShellPane[];
  layout: LayoutNode;
  activeIndex: number;
}
