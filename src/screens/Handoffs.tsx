import { ArrowDataTransferHorizontalIcon, Bookmark02Icon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { HandoffCard } from '@/components/handoffs/HandoffCard';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { useCheckpointDialog } from '@/store/checkpoint-dialog';
import { Button, EmptyState, PageHeader, Section } from '@/components/ui';
import { isCheckpoint } from '@/lib/checkpoint';
import { useData } from '@/store/data';

export function Handoffs() {
  const { handoffs } = useData();
  const openHandoff = useHandoffDialog((s) => s.open);
  const openCheckpoint = useCheckpointDialog((s) => s.open);
  const projects = useData((s) => s.projects);
  const lastProject = projects.find((p) => p.exists)?.dir;
  const checkpoints = handoffs.filter(isCheckpoint);
  const history = handoffs.filter((h) => !isCheckpoint(h));

  return (
    <Page>
      <PageHeader
        title="Handoffs"
        subtitle="Save what an agent is working on, check it, and continue with another agent without explaining it again."
        action={
          <div className="page__actions">
            {lastProject ? (
              <Button icon={ArrowDataTransferHorizontalIcon} onClick={() => openHandoff({ projectDir: lastProject })}>
                New handoff
              </Button>
            ) : null}
            <Button variant="primary" icon={Bookmark02Icon} onClick={() => openCheckpoint()}>
              Save checkpoint
            </Button>
          </div>
        }
      />
      {handoffs.length === 0 ? (
        <EmptyState
          icon={Bookmark02Icon}
          title="No checkpoints yet"
          body="Save a checkpoint while an agent works on a task. CSM records the task, the files it touched and the repository state, so another agent can pick it up."
          action={
            <Button variant="primary" icon={Bookmark02Icon} onClick={() => openCheckpoint()}>
              Save checkpoint
            </Button>
          }
        />
      ) : (
        <>
          <Section title="Checkpoints" meta={checkpoints.length ? String(checkpoints.length) : undefined}>
            {checkpoints.length ? (
              <div className="list">
                {checkpoints.map((h) => (
                  <HandoffCard key={h.project + h.id} handoff={h} />
                ))}
              </div>
            ) : (
              <p className="muted">No saved checkpoints. Handoffs below were captured at the moment of the switch.</p>
            )}
          </Section>
          {history.length ? (
            <Section title="Handoffs" meta={String(history.length)}>
              <div className="list">
                {history.map((h) => (
                  <HandoffCard key={h.project + h.id} handoff={h} />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </Page>
  );
}
