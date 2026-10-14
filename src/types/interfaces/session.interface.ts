import type { ProviderID } from '../enums/agent.enum';
import type { SessionEntryKind } from '../enums/session.enum';

export interface SessionEntry {
  id: string;
  kind: SessionEntryKind;
  provider: ProviderID;
  account: string;
  session_id?: string;
  project_dir: string;
  branch?: string;
  started_at?: string;
  checkpointed_at?: string;
  reason?: string;
  reason_text?: string;
  detail?: string;
  live: boolean;
  can_resume: boolean;
}
