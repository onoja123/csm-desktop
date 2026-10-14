import type { ProviderID } from '../enums/agent.enum';
import type { ApprovalDecision } from '../enums/approval.enum';

export interface Approval {
  id: string;
  run_id?: string;
  provider: ProviderID;
  account: string;
  session_id?: string;
  tool_name: string;
  command?: string;
  description?: string;
  input?: unknown;
  destructive: boolean;
  requested_at: string;
  decision?: ApprovalDecision | '';
  decided_at?: string;
}

export interface ApprovalsView {
  pending: Approval[];
  recent: Approval[];
}
