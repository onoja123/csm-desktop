import type { FailoverPolicy } from '../enums/account.enum';
import type { ProviderInfo } from './agent.interface';

export interface ServiceStatus {
  service: ServiceProcess;
  failover_policy: FailoverPolicy;
  providers: ProviderInfo[];
  accounts: number;
  live_runs: number;
  pending_approvals: number;
  approvals_enabled: boolean;
}

export interface ServiceInfo {
  home: string;
  socket: string;
  csm_path?: string;
  csm_version?: string;
  socket_present: boolean;
}

export interface ServiceProcess {
  version: string;
  pid: number;
  started_at: string;
  socket: string;
  home: string;
}
