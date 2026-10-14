import type { ConnectionPhase } from '../enums/connection.enum';
import type { ServiceInfo } from './service.interface';

export interface ConnectionState {
  phase: ConnectionPhase;
  error?: string;
  info?: ServiceInfo;
  lastEventAt?: number;
  bootstrap: () => Promise<void>;
  retry: () => Promise<void>;
  startService: () => Promise<void>;
  setConnected: (connected: boolean, error?: string) => void;
}
