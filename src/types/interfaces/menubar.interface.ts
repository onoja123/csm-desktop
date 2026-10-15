import type { ProviderID } from '../enums/agent.enum';
import type { InspectorTab, MenuAttentionKind, MenuBarView } from '../enums/menubar.enum';

export interface QuietHours {
  start_minute: number;
  end_minute: number;
}

export interface NotificationPrefs {
  enabled: boolean;
  approvals: boolean;
  failures: boolean;
  rate_limits: boolean;
  auth: boolean;
  handoffs: boolean;
  recovery: boolean;
  completed: boolean;
  quiet_hours: QuietHours | null;
}

export interface MenuBarPrefs {
  show_in_dock: boolean;
  recent_limit: number;
  notifications: NotificationPrefs;
}

export interface MenuBarPrefsView {
  prefs: MenuBarPrefs;
  dock_supported: boolean;
}

export interface LoginItem {
  supported: boolean;
  enabled: boolean;
  error?: string | null;
}

export interface MenuBarState {
  view: MenuBarView;
  selectedId?: string;
  tab: InspectorTab;
  inspectedAccount?: string;
  openInspector: (sessionId: string, tab?: InspectorTab) => void;
  setTab: (tab: InspectorTab) => void;
  inspectAccount: (name?: string) => void;
  openSettings: () => void;
  back: () => void;
}

export interface MenuAttention {
  key: string;
  kind: MenuAttentionKind;
  provider: ProviderID;
  account: string;
  run_id?: string | null;
  project_dir?: string | null;
  title: string;
  reason: string;
  detail?: string | null;
}

export interface MenuState {
  connected: boolean;
  live: number;
  waiting: number;
  attention: MenuAttention[];
}

export interface MenuTarget {
  open: 'panel' | 'main';
  session?: string;
  route?: string;
}
