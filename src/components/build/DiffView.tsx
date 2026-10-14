import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ErrorState, Icon, LoadingState } from '@/components/ui';
import { api } from '@/lib/api';
import type { BuildDiff } from '@/lib/types';

interface FileDiff {
  path: string;
  lines: string[];
  added: number;
  removed: number;
}

const MAX_LINES_OPEN = 400;

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

function lineClass(line: string): string {
  if (line.startsWith('@@')) return 'diff__line diff__line--hunk';
  if (line.startsWith('+')) return 'diff__line diff__line--add';
  if (line.startsWith('-')) return 'diff__line diff__line--del';
  if (line.startsWith('new file') || line.startsWith('deleted file') || line.startsWith('similarity') || line.startsWith('rename')) return 'diff__line diff__line--meta';
  return 'diff__line';
}

function FileBlock({ file, startOpen }: { file: FileDiff; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [all, setAll] = useState(false);
  const shown = all ? file.lines : file.lines.slice(0, MAX_LINES_OPEN);
  return (
    <div className="diff__file">
      <button className="diff__file-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon icon={open ? ChevronDown : ChevronRight} size="sm" />
        <span className="mono diff__path">{file.path}</span>
        <span className="diff__count diff__count--add">+{file.added}</span>
        <span className="diff__count diff__count--del">−{file.removed}</span>
      </button>
      {open ? (
        <pre className="diff__body selectable">
          {shown.map((l, i) => (
            <div key={i} className={lineClass(l)}>
              {l || ' '}
            </div>
          ))}
          {!all && file.lines.length > MAX_LINES_OPEN ? (
            <button className="link diff__more" onClick={() => setAll(true)}>
              Show {file.lines.length - MAX_LINES_OPEN} more lines
            </button>
          ) : null}
        </pre>
      ) : null}
    </div>
  );
}

export function DiffView({ buildId, target, stamp }: { buildId: string; target: string; stamp?: string }) {
  const [diff, setDiff] = useState<BuildDiff>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    setError(undefined);
    api
      .buildDiff(buildId, target)
      .then((d) => live && setDiff(d))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [buildId, target, stamp]);

  const files = useMemo(() => (diff ? parseDiff(diff.diff) : []), [diff]);

  if (error) return <ErrorState title="No diff yet" body={error} />;
  if (!diff) return <LoadingState label="Reading the diff" />;
  if (!files.length) return <p className="muted">No changes on this branch yet.</p>;

  return (
    <div className="diff">
      <p className="diff__summary muted">
        {files.length} file{files.length === 1 ? '' : 's'} changed from <span className="mono">{diff.base.slice(0, 8)}</span> to <span className="mono">{diff.head.slice(0, 8)}</span>, read from git by CSM
      </p>
      {files.map((f, i) => (
        <FileBlock key={f.path} file={f} startOpen={files.length <= 6 || i < 2} />
      ))}
      {diff.truncated ? <p className="muted">The diff is larger than 400 KB and was cut off; open the worktree to see all of it.</p> : null}
    </div>
  );
}
