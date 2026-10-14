import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui';
import type { FileDiff } from '@/types';

const MAX_LINES_OPEN = 400;

function lineClass(line: string): string {
  if (line.startsWith('@@')) return 'diff__line diff__line--hunk';
  if (line.startsWith('+')) return 'diff__line diff__line--add';
  if (line.startsWith('-')) return 'diff__line diff__line--del';
  if (line.startsWith('new file') || line.startsWith('deleted file') || line.startsWith('similarity') || line.startsWith('rename')) return 'diff__line diff__line--meta';
  return 'diff__line';
}

export function DiffFileBlock({ file, startOpen }: { file: FileDiff; startOpen: boolean }) {
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
