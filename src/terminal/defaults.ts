import type { TerminalSettings } from '@/types';

export const DEFAULT_SETTINGS: TerminalSettings = {
  fontFamily: "'Geist Mono Variable', 'Geist Mono', 'SF Mono', ui-monospace, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.3,
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 25000,
  shell: '',
  defaultCwd: '',
  copyOnSelect: false,
  confirmCloseRunning: true,
};
