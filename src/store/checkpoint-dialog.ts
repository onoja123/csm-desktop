import { create } from 'zustand';
import type { CheckpointDialogState } from '@/types';

export const useCheckpointDialog = create<CheckpointDialogState>((set) => ({
  isOpen: false,
  open: (opts) => set({ isOpen: true, projectDir: opts?.projectDir }),
  close: () => set({ isOpen: false }),
}));
