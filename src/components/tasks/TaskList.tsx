import { TaskCard } from './TaskCard';
import type { AnyRun } from '@/types';

export function TaskList({ runs, empty }: { runs: AnyRun[]; empty: React.ReactNode }) {
  if (runs.length === 0) return <>{empty}</>;

  return (
    <div className="list">
      {runs.map((r) => (
        <TaskCard key={r.id} run={r} />
      ))}
    </div>
  );
}
