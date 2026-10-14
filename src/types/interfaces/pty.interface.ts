export interface PtySession {
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

export interface ForegroundProcess {
  pid: number;
  name: string;
  is_shell: boolean;
}

export interface PtyOutputPayload {
  id: string;
  data: string;
}

export interface PtyExitPayload {
  id: string;
  code: number | null;
}
