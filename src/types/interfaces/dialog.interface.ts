import type { ProviderID } from '../enums/agent.enum';

export interface StartAgentDialogState {
  isOpen: boolean;
  provider?: ProviderID;
  projectDir?: string;
  open: (opts?: { provider?: ProviderID; projectDir?: string }) => void;
  close: () => void;
}

export interface HandoffDialogState {
  isOpen: boolean;
  projectDir?: string;
  fromProvider?: ProviderID;
  fromAccount?: string;
  checkpointId?: string;
  open: (opts: { projectDir: string; fromProvider?: ProviderID; fromAccount?: string; checkpointId?: string }) => void;
  close: () => void;
}

export interface CheckpointDialogState {
  isOpen: boolean;
  projectDir?: string;
  open: (opts?: { projectDir?: string }) => void;
  close: () => void;
}
