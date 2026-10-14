import type { Pane, PaneMap } from '../aliases/terminal-pane.alias';
import type { SplitDirection } from '../enums/terminal.enum';
import type { PersistedTerminalState } from './terminal-persistence.interface';
import type { TerminalSettings, TerminalTab } from './terminal.interface';
import type { ShellInfo } from './pty.interface';

export interface TerminalState {
  tabs: TerminalTab[];
  panes: PaneMap;
  activeTabId?: string;
  settings: TerminalSettings;
  shells: ShellInfo[];
  homeDir: string;
  hydrated: boolean;
  searchOpen: boolean;
  closedTabs: PersistedTerminalState['tabs'];

  hydrate: () => Promise<void>;
  newTab: (opts?: { cwd?: string; shell?: string }) => Promise<string>;
  openAgentTab: (runId: string, title: string) => string;
  closeTab: (tabId: string, force?: boolean) => Promise<boolean>;
  reopenTab: () => Promise<void>;
  activateTab: (tabId: string) => void;
  cycleTab: (step: 1 | -1) => void;
  split: (direction: SplitDirection, opts?: { cwd?: string }) => Promise<string | undefined>;
  closePane: (paneId: string, force?: boolean) => Promise<boolean>;
  focusPane: (paneId: string) => void;
  cycleFocus: (step: 1 | -1) => void;
  resize: (tabId: string, path: number[], index: number, delta: number) => void;
  restartShell: (paneId: string) => Promise<void>;
  killProcess: (paneId: string) => Promise<void>;
  markExited: (sessionId: string, code: number | null) => void;
  setPaneTitle: (paneId: string, title: string) => void;
  setPaneCwd: (paneId: string, cwd: string) => void;
  setSearchOpen: (open: boolean) => void;
  updateSettings: (patch: Partial<TerminalSettings>) => void;
  activeTab: () => TerminalTab | undefined;
  activePane: () => Pane | undefined;
  persist: () => void;
}
