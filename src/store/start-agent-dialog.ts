import { create } from 'zustand';
import type { StartAgentDialogState } from '@/types';

export const useStartAgent = create<StartAgentDialogState>((set) => ({
  isOpen: false,
  open: (opts) => set({ isOpen: true, provider: opts?.provider, projectDir: opts?.projectDir }),
  close: () => set({ isOpen: false }),
}));
