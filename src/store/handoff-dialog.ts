import { create } from 'zustand';
import type { HandoffDialogState } from '@/types';

export const useHandoffDialog = create<HandoffDialogState>((set) => ({
  isOpen: false,
  open: (opts) => set({ isOpen: true, fromProvider: undefined, fromAccount: undefined, checkpointId: undefined, ...opts }),
  close: () => set({ isOpen: false }),
}));
