import { create } from 'zustand';
import type { MenuBarState } from '@/types';

export const useMenuBar = create<MenuBarState>((set) => ({
  view: 'list',
  tab: 'overview',
  openInspector: (sessionId, tab = 'overview') =>
    set({ view: 'inspector', selectedId: sessionId, tab, inspectedAccount: undefined }),
  setTab: (tab) => set({ tab }),
  inspectAccount: (name) => set({ inspectedAccount: name }),
  openSettings: () => set({ view: 'settings' }),
  back: () => set({ view: 'list', inspectedAccount: undefined }),
}));
