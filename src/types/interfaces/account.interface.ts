import type { AccountStatus, FailoverPolicy, Health, SwitchMode } from '../enums/account.enum';
import type { ProviderID } from '../enums/agent.enum';

export interface UsageWindow {
  used_percent: number;
  resets_at: string;
}

export interface Usage {
  five_hour?: UsageWindow;
  seven_day?: UsageWindow;
  spend_limit?: UsageWindow;
  limited?: boolean;
}

export interface Account {
  name: string;
  provider: ProviderID;
  provider_name: string;
  email?: string;
  active: boolean;
  enabled: boolean;
  health: Health;
  status: AccountStatus;
  priority: number;
  usage_label: string;
  usage?: Usage;
  usage_updated_at?: string;
  last_used_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_failure?: string;
  last_failure_text?: string;
  failures_24h: number;
  cooldown_until?: string;
  verified_at?: string;
  created_at: string;
  profile_dir: string;
  failover_eligible: boolean;
  advice?: string;
  running: boolean;
}

export interface SwitchResult {
  mode: SwitchMode;
  account: string;
  project?: string;
  message: string;
}

export interface Failover {
  policy: FailoverPolicy;
  description: string;
  providers: FailoverProvider[];
  handoff_to?: ProviderID[];
  handoff_description?: string;
}

export interface FailoverProvider {
  provider: ProviderID;
  provider_name: string;
  priority: string[];
  would_switch: string[];
}
