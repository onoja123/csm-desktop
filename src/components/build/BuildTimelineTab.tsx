import { RunTimeline } from '@/components/build/RunTimeline';
import { BuildEventHistory } from './BuildEventHistory';
import type { Build } from '@/types';

export function BuildTimelineTab({ build }: { build: Build }) {
  return (
    <div className="build-timeline">
      <RunTimeline build={build} />

      <details className="build-timeline__raw">
        <summary>All events ({build.events.length})</summary>
        <BuildEventHistory build={build} />
      </details>
    </div>
  );
}
