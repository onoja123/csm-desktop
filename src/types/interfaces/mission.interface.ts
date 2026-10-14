import type { PaneMap } from '../aliases/terminal-pane.alias';
import type { Health } from '../enums/account.enum';
import type { ProviderID } from '../enums/agent.enum';
import type {
  AgentSessionKind,
  AttentionKind,
  SessionGroupBy,
  SessionStatus,
  SessionStatusFilter,
} from '../enums/mission.enum';
import type { PaneKind } from '../enums/terminal.enum';
import type { Account } from './account.interface';
import type { Activity } from './activity.interface';
import type { ExternalRun, Run } from './agent.interface';
import type { Approval } from './approval.interface';
import type { ServiceStatus } from './service.interface';
import type { TerminalTab } from './terminal.interface';

export interface SessionAttention {
  kind: AttentionKind;
  reason: string;
  detail?: string;
}

export interface SessionSwitch {
  from: string;
  to: string;
  reason: string;
  at: string;
}

export interface TerminalLink {
  tabId: string;
  tabIndex: number;
  paneId: string;
  kind: PaneKind;
}

export interface AgentSession {
  id: string;
  kind: AgentSessionKind;
  runId?: string;
  provider: ProviderID;
  providerName: string;
  account: string;
  accountHealth?: Health;
  projectDir: string;
  project: string;
  branch?: string;
  title?: string;
  buildId?: string;
  sessionId?: string;
  status: SessionStatus;
  label: string;
  detail?: string;
  attention?: SessionAttention;
  approval?: Approval;
  switched?: SessionSwitch;
  terminal?: TerminalLink;
  startedAt: string;
  endedAt?: string;
  lastOutputAt?: string;
  exitCode?: number;
  live: boolean;
  observable: boolean;
  note?: string;
  filesModified: number;
  messages?: number;
  canResume: boolean;
}

export interface MissionInput {
  runs: Run[];
  external: ExternalRun[];
  approvals: Approval[];
  activity: Activity[];
  accounts: Account[];
  status?: ServiceStatus;
  tabs: TerminalTab[];
  panes: PaneMap;
  connected: boolean;
  now: number;
}

export interface ProjectActivityEvents {
  usageLimit?: Activity;
  switched?: Activity;
  handoffFailed?: Activity;
}

export interface SessionGroup {
  key: string;
  title: string;
  meta?: string;
  sessions: AgentSession[];
}

export interface MissionView {
  group: SessionGroupBy;
  filter: SessionStatusFilter;
}
