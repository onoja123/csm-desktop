import type { ProviderID } from '../enums/agent.enum';
import type { FindingSeverity, FindingStatus, ReviewRoundStatus } from '../enums/review.enum';

export interface Finding {
  id: string;
  cycle: number;
  severity: FindingSeverity;
  file?: string;
  line?: number;
  title: string;
  explanation?: string;
  reasoning?: string;
  recommendation?: string;
  blocking: boolean;
  task_id?: string;
  status: FindingStatus;
  source: string;
}

export interface ReviewRound {
  cycle: number;
  provider: ProviderID;
  account?: string;
  independent: boolean;
  note?: string;
  verdict?: string;
  summary?: string;
  commit?: string;
  ignored_edits?: string[];
  status: ReviewRoundStatus;
  at: string;
  blocking_open: number;
  findings: number;
}
