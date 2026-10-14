import type { FileDiff } from '@/types';

export function parseDiff(text: string): FileDiff[] {
  const files: FileDiff[] = [];
  let cur: FileDiff | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const m = / b\/(.+)$/.exec(line);
      cur = { path: m ? m[1] : line.slice(11), lines: [], added: 0, removed: 0 };
      files.push(cur);
      continue;
    }
    if (!cur || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) continue;
    cur.lines.push(line);
    if (line.startsWith('+')) cur.added++;
    else if (line.startsWith('-')) cur.removed++;
  }
  return files;
}
