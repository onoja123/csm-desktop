import type { AgentPane, ShellPane } from '../interfaces/terminal.interface';

export type Pane = ShellPane | AgentPane;

export type PaneMap = Record<string, Pane>;
