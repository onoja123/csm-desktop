import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTerminal } from '@/terminal/store';
import { handles } from '@/terminal/handles';

// Keyboard control for the terminal. Shortcuts that only make sense with a terminal in view are limited to that route, so
// Cmd+W elsewhere keeps its usual meaning.
export function useTerminalShortcuts() {
  const nav = useNavigate();
  const loc = useLocation();
  const onTerminal = loc.pathname.startsWith('/terminal');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const t = useTerminal.getState();
      const key = e.key.toLowerCase();

      if (key === 't' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (!onTerminal) nav('/terminal');
        void t.newTab();
        return;
      }
      if (!onTerminal) return;

      if (key === 't' && e.shiftKey) {
        e.preventDefault();
        void t.reopenTab();
      } else if (key === 'w' && !e.shiftKey) {
        e.preventDefault();
        const tab = t.activeTab();
        if (tab) void t.closePane(tab.activePaneId);
      } else if (key === 'w' && e.shiftKey) {
        e.preventDefault();
        const tab = t.activeTab();
        if (tab) void t.closeTab(tab.id);
      } else if (key === 'd' && !e.shiftKey) {
        e.preventDefault();
        void t.split('row');
      } else if (key === 'd' && e.shiftKey) {
        e.preventDefault();
        void t.split('column');
      } else if (key === 'f' && !e.shiftKey) {
        e.preventDefault();
        t.setSearchOpen(true);
      } else if (key === ']' && e.shiftKey) {
        e.preventDefault();
        t.cycleTab(1);
      } else if (key === '[' && e.shiftKey) {
        e.preventDefault();
        t.cycleTab(-1);
      } else if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        t.cycleTab(e.shiftKey ? -1 : 1);
      } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault();
        t.cycleFocus(1);
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        t.cycleFocus(-1);
      } else if (/^[1-9]$/.test(e.key) && !e.shiftKey && !e.altKey) {
        const tab = t.tabs[Number(e.key) - 1];
        if (tab) {
          e.preventDefault();
          t.activateTab(tab.id);
        }
      } else if (key === 'k' && e.shiftKey) {
        e.preventDefault();
        const tab = t.activeTab();
        if (tab) handles.get(tab.activePaneId)?.term.clear();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [nav, onTerminal]);
}
