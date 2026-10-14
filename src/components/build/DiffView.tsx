import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '@/components/ui';
import { parseDiff } from '@/lib/diff';
import { DiffFileBlock } from './DiffFileBlock';
import { api } from '@/lib/api';
import type { BuildDiff } from '@/types';

export function DiffView({
  buildId,
  target,
  stamp,
}: {
  buildId: string;
  target: string;
  stamp?: string;
}) {
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
        {files.length} file{files.length === 1 ? '' : 's'} changed from{' '}
        <span className="mono">{diff.base.slice(0, 8)}</span> to{' '}
        <span className="mono">{diff.head.slice(0, 8)}</span>, read from git by CSM
      </p>

      {files.map((f, i) => (
        <DiffFileBlock key={f.path} file={f} startOpen={files.length <= 6 || i < 2} />
      ))}

      {diff.truncated ? (
        <p className="muted">
          The diff is larger than 400 KB and was cut off; open the worktree to see all of it.
        </p>
      ) : null}
    </div>
  );
}
