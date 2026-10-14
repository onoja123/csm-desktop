import { RunOutcome } from '@/components/build/RunOutcome';
import { Panel } from '@/components/ui';
import { plural } from '@/lib/format';
import type { Build } from '@/types';

export function RunFacts({ build, blockingOpen }: { build: Build; blockingOpen: number }) {
  return (
    <Panel className="build-facts">
      <RunOutcome build={build}>
        {blockingOpen ? (
          <p className="tone-err build-facts__line">
            {plural(blockingOpen, 'blocking finding')} open
          </p>
        ) : null}

        {build.integration.branch ? (
          <p className="mono muted build-facts__line">{build.integration.branch}</p>
        ) : null}

        {build.pr.url ? (
          <a
            className="link build-facts__line"
            href={build.pr.url}
            target="_blank"
            rel="noreferrer"
          >
            {build.pr.url}
          </a>
        ) : null}
      </RunOutcome>

      <p className="muted build-facts__note">
        Select a task to see its agent, worktree, attempts and diff.
      </p>
    </Panel>
  );
}
