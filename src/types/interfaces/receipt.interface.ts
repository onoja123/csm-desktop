import type { BuildStatus } from '../enums/build.enum';
import type { ClaimStatus, EvidenceStatus, ReceiptOutcome } from '../enums/receipt.enum';

export interface TestCounts {
  unit: string;
  passed: number;
  failed: number;
  skipped?: number;
  total: number;
  from: string;
}

export interface ReceiptCheck {
  name: string;
  command: string;
  source?: string;
  stage: string;
  status: EvidenceStatus;
  exit_code?: number;
  duration_ms: number;
  commit?: string;
  reason?: string;
  tests?: TestCounts;
  output?: string;
  at?: string;
}

export interface ReceiptClaim {
  task_id?: string;
  agent?: string;
  kind: string;
  claim: string;
  status: ClaimStatus;
  evidence: string;
}

export interface ReceiptAgentSwitch {
  at: string;
  from: string;
  to: string;
  reason?: string;
  commit?: string;
}

export interface ReceiptAgent {
  role: string;
  task_id?: string;
  agent: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  note?: string;
  switches?: ReceiptAgentSwitch[];
}

export interface ReceiptReview {
  enabled: boolean;
  rounds?: ReceiptReviewRound[];
  independent: boolean;
  open_blocking: number;
  open_non_blocking: number;
  fix_requested: number;
  rechecked: number;
  accepted_by_user: number;
  check_findings: number;
  open_findings?: string[];
}

export interface ReceiptDrift {
  checked_at: string;
  where: string;
  head?: string;
  uncommitted?: string[];
  same_as_verified: boolean;
  note: string;
  unreadable?: boolean;
}

export interface Receipt {
  version: number;
  generated_at: string;
  build_id: string;
  kind?: string;
  title: string;
  status: BuildStatus;
  final: boolean;
  partial: boolean;
  partial_reasons?: string[];
  repo: string;
  repo_name: string;
  base_branch?: string;
  base_commit?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  outcome: ReceiptOutcome;
  headline: string;
  revision: ReceiptRevision;
  checks: ReceiptCheck[];
  baseline?: ReceiptCheck[];
  claims: ReceiptClaim[];
  agents: ReceiptAgent[];
  review: ReceiptReview;
  acceptance: ReceiptAcceptance;
  pull_request: ReceiptPullRequest;
  drift?: ReceiptDrift;
  skills?: ReceiptSkill[];
  limitations: string[];
}

export interface ReceiptSkillAgent {
  agent: string;
  state: string;
  compatibility?: string;
  adaptations?: string[];
  problem?: string;
  evidence?: string[];
}

export interface ReceiptSkill {
  task_id: string;
  id: string;
  name: string;
  source: string;
  revision?: string;
  hash: string;
  origin: string;
  adapter: string;
  usage: 'verified' | 'unverified' | 'not placed';
  agents?: ReceiptSkillAgent[];
}

export interface ReceiptReviewRound {
  cycle: number;
  agent: string;
  independent: boolean;
  verdict?: string;
  status: string;
  findings: number;
  commit?: string;
}

export interface ReceiptRevision {
  branch?: string;
  commit?: string;
  head?: string;
  dirty_at_check?: boolean;
  files?: string[];
  diff_stat?: string;
  mixed?: boolean;
}

export interface ReceiptAcceptance {
  passed: boolean;
  reasons: string[];
}

export interface ReceiptPullRequest {
  state: string;
  url?: string;
  pushed: boolean;
  error?: string;
}
