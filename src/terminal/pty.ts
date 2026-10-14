import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { decodeBase64, encodeBase64 } from '@/lib/output-bus';

export interface SessionInfo {
  id: string;
  pid: number;
  shell: string;
  cwd: string;
  cols: number;
  rows: number;
}

export interface ShellInfo {
  path: string;
  name: string;
  is_default: boolean;
}

export interface Foreground {
  pid: number;
  name: string;
  is_shell: boolean;
}

const encoder = new TextEncoder();

export const pty = {
  spawn: (opts: { shell?: string; cwd?: string; cols?: number; rows?: number }) => invoke<SessionInfo>('pty_spawn', opts),
  writeText: (id: string, text: string) => invoke<void>('pty_write', { id, data: encodeBase64(encoder.encode(text)) }),
  writeBytes: (id: string, bytes: Uint8Array) => invoke<void>('pty_write', { id, data: encodeBase64(bytes) }),
  attach: async (id: string) => decodeBase64(await invoke<string>('pty_attach', { id })),
  resize: (id: string, cols: number, rows: number) => invoke<void>('pty_resize', { id, cols, rows }),
  kill: (id: string) => invoke<void>('pty_kill', { id }),
  list: () => invoke<SessionInfo[]>('pty_list'),
  foreground: (id: string) => invoke<Foreground>('pty_foreground', { id }),
  shells: () => invoke<ShellInfo[]>('pty_shells'),
  defaultCwd: () => invoke<string>('pty_default_cwd'),
  onOutput: (id: string, fn: (bytes: Uint8Array) => void): Promise<UnlistenFn> =>
    listen<{ id: string; data: string }>(`pty://out/${id}`, (ev) => fn(decodeBase64(ev.payload.data))),
  onExit: (fn: (id: string, code: number | null) => void): Promise<UnlistenFn> => listen<{ id: string; code: number | null }>('pty://exit', (ev) => fn(ev.payload.id, ev.payload.code)),
};
