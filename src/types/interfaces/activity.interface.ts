import type { ProviderID } from '../enums/agent.enum';

export interface Activity {
  id: string;
  at: string;
  kind: string;
  provider?: ProviderID;
  account?: string;
  title: string;
  detail?: string;
  run_id?: string;
  refs?: Record<string, string>;
}
