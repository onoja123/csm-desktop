import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusSignIcon, WorkflowSquare03Icon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { Button, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { BuildRow } from '@/components/build/BuildRow';
import { GROUP_ORDER, GROUP_TITLE, groupOf } from '@/lib/build';
import { useData } from '@/store/data';

export function BuildRoom() {
  const nav = useNavigate();
  const all = useData((s) => s.builds);
  const builds = useMemo(() => all.filter((b) => b.kind !== 'autofix'), [all]);
  const loaded = useData((s) => s.loaded.builds);
  const error = useData((s) => s.errors.builds);
  const refresh = useData((s) => s.refresh);

  useEffect(() => {
    void refresh('builds');
  }, [refresh]);

  const groups = useMemo(() => GROUP_ORDER.map((g) => ({ key: g, runs: builds.filter((b) => groupOf(b) === g) })).filter((g) => g.runs.length), [builds]);

  const header = (
    <PageHeader
      title="Build Room"
      subtitle="Give CSM a task. It plans the work, runs agents in isolated worktrees, checks and reviews the result, and prepares a pull request for you."
      action={
        <Button variant="primary" icon={PlusSignIcon} onClick={() => nav('/build/new')}>
          New build run
        </Button>
      }
    />
  );

  if (!loaded && !error) {
    return (
      <Page>
        {header}
        <LoadingState label="Reading build runs" />
      </Page>
    );
  }

  return (
    <Page>
      {header}
      {error ? (
        <div className="mc-notice" role="alert">
          <span>
            Build runs could not be loaded: <span className="selectable">{error}</span>
          </span>
          <Button size="sm" onClick={() => void refresh('builds')}>
            Retry
          </Button>
        </div>
      ) : null}
      {builds.length === 0 && !error ? (
        <EmptyState
          icon={WorkflowSquare03Icon}
          title="No build runs yet"
          body="Describe a change in a repository. CSM drafts a plan for you to approve, then coordinates your agents, runs the repository's checks and asks another agent to review the result."
          action={
            <Button variant="primary" icon={PlusSignIcon} onClick={() => nav('/build/new')}>
              New build run
            </Button>
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.key} className="build-group">
            <header className="build-group__head">
              <span>{GROUP_TITLE[g.key]}</span>
              <span className="build-group__count">{g.runs.length}</span>
            </header>
            <div className="list list--tight">
              {g.runs.map((b) => (
                <BuildRow key={b.id} build={b} />
              ))}
            </div>
          </section>
        ))
      )}
    </Page>
  );
}
