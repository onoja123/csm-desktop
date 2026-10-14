export interface BuildDiff {
  target: string;
  base: string;
  head: string;
  files: string[];
  stat: string;
  diff: string;
  truncated: boolean;
}

export interface FileDiff {
  path: string;
  lines: string[];
  added: number;
  removed: number;
}
