import { Alert02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon, Panel, Row } from '@/components/ui';
import { ago, shortPath } from '@/lib/format';
import { driftOf, shortSha } from '@/lib/checkpoint';
import type { Handoff } from '@/types';

export function RepoPanel({ handoff, home }: { handoff: Handoff; home: string }) {
  const g = handoff.git;
  const current = handoff.current;
  const drift = current ? driftOf(current) : [];

  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Repository</h3>
          <span className="panel__meta">verified by CSM</span>
        </div>
      </div>

      {g.root ? (
        <>
          <Row label="Path" mono>
            {shortPath(g.root, home)}
          </Row>

          <Row label="Branch" mono>
            {g.branch || '(detached HEAD)'}
          </Row>

          {g.head ? (
            <Row label="HEAD" mono>
              {shortSha(g.head)} <span className="muted">{g.head_subject}</span>
            </Row>
          ) : null}

          <Row label="Working tree">
            {g.staged} staged, {g.unstaged} unstaged, {g.untracked} untracked
          </Row>

          {current ? (
            <div className={`repo-now ${drift.length ? 'repo-now--drift' : ''}`} role="status">
              <Icon
                icon={drift.length ? Alert02Icon : Tick02Icon}
                size="sm"
                className={drift.length ? 'tone-warn' : 'tone-ok'}
              />

              <div>
                {drift.length ? (
                  drift.map((d) => <p key={d}>{d}</p>)
                ) : (
                  <p>The repository still matches this checkpoint.</p>
                )}

                <p className="muted">Checked {ago(current.checked_at)}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted">Not a git repository. Only the task context was saved.</p>
      )}
    </Panel>
  );
}
