import { DiffView } from '@/components/build/DiffView';
import { Panel, Row } from '@/components/ui';
import { shortPath } from '@/lib/format';
import { useTerminal } from '@/terminal/store';
import type { Build } from '@/types';

export function BuildIntegrationTab({ build }: { build: Build }) {
  const ig = build.integration;
  const home = useTerminal((s) => s.homeDir);
  return (
    <div className="build-integration">
      <Panel>
        <Row label="Branch" mono>
          {ig.branch ?? 'Not created yet'}
        </Row>
        {ig.worktree ? (
          <Row label="Worktree" mono>
            <span className="selectable">{shortPath(ig.worktree, home)}</span>
          </Row>
        ) : null}
        <Row label="Merged">{ig.merged?.length ? ig.merged.join(', ') : 'Nothing yet'}</Row>
        {ig.overlaps?.length ? (
          <Row label="Shared files">
            {ig.overlaps.map((o) => (
              <span key={o.file} className="mono">
                {o.file} ({o.tasks.join(', ')})
              </span>
            ))}
          </Row>
        ) : null}
        {ig.conflicts?.map((c) => (
          <Row key={c.task_id + c.at} label={`Conflict · ${c.task_id}`}>
            <span>
              {c.files.join(', ')} with {c.tasks?.join(', ') || 'earlier work'}: {c.status.replace(/_/g, ' ')}
              {c.resolution ? <span className="muted"> · {c.resolution}</span> : null}
            </span>
          </Row>
        ))}
        <Row label="Pull request">
          {build.pr.url ? (
            <a className="link" href={build.pr.url} target="_blank" rel="noreferrer">
              {build.pr.url}
            </a>
          ) : build.pr.state === 'prepared' ? (
            <span>
              Description ready at <span className="mono selectable">{shortPath(build.pr.body_file ?? '', home)}</span>
              {build.pr.blocker ? (
                <span className="muted"> · cannot push from here: {build.pr.blocker}</span>
              ) : !build.policy.allow_remote ? (
                <span className="muted"> · remote operations are off for this run</span>
              ) : null}
            </span>
          ) : (
            <span className="muted">Prepared once checks and review are done</span>
          )}
        </Row>
        {build.pr.error ? (
          <Row label="Last error">
            <span className="form-error">{build.pr.error}</span>
          </Row>
        ) : null}
      </Panel>
      {ig.head ? (
        <>
          <h4 className="panel__h4 build-checks__sub">Integrated diff</h4>
          <DiffView buildId={build.id} target="integration" stamp={ig.head} />
        </>
      ) : null}
    </div>
  );
}
