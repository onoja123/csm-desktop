import { clock } from '@/lib/format';
import type { Build } from '@/types';

export function BuildEventHistory({ build }: { build: Build }) {
  const events = [...build.events].reverse();
  return (
    <ol className="build-history">
      {events.map((e, i) => (
        <li key={i}>
          <span className="build-history__time mono" title={clock(e.at)}>
            {new Date(e.at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span className="build-history__msg selectable">{e.message}</span>
          {e.task_id ? <span className="build-history__task mono">{e.task_id}</span> : null}
        </li>
      ))}
    </ol>
  );
}
