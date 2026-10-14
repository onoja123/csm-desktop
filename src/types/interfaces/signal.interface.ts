export interface SignalFrame {
  file?: string;
  function?: string;
  line?: number;
  in_app: boolean;
  context?: string;
}

export interface Signal {
  id?: string;
  source: string;
  event_type: string;
  external_id: string;
  issue_id?: string;
  fingerprint: string;
  title: string;
  message?: string;
  culprit?: string;
  severity: string;
  environment?: string;
  release?: string;
  repository: SignalRepository;
  occurred_at: string;
  received_at: string;
  link?: string;
  evidence: SignalEvidence;
}

export interface SignalRepository {
  project?: string;
  name?: string;
  branch?: string;
  commit?: string;
}

export interface SentryException {
  type: string;
  value?: string;
  module?: string;
  frames?: SignalFrame[];
}

export interface SentryEvidence {
  platform?: string;
  exceptions?: SentryException[];
  tags?: Record<string, string>;
  count?: number;
  user_count?: number;
  request?: string;
}

export interface SignalEvidence {
  kind: string;
  sentry?: SentryEvidence;
}
