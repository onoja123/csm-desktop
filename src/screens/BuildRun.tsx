import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PauseIcon, PlayIcon, Tick02Icon, UnavailableIcon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { IncidentPanel } from '@/components/autofix/IncidentPanel';
import { InvestigationPanel } from '@/components/autofix/InvestigationPanel';
import { VerificationPanel } from '@/components/autofix/VerificationPanel';
import { PlanEditor } from '@/components/build/PlanEditor';
import { ReceiptView } from '@/components/build/ReceiptView';
import { TaskDetail } from '@/components/build/TaskDetail';
import { RunBar } from '@/components/build/RunBar';
import { Button, ErrorState, LoadingState, PageHeader, Panel, StatusText, Tabs } from '@/components/ui';
import { useBuild } from '@/hooks/useBuild';
import { TaskNode } from '@/components/build/TaskNode';
import { BuildPlanTab } from '@/components/build/BuildPlanTab';
import { BuildReviewTab } from '@/components/build/BuildReviewTab';
import { BuildIntegrationTab } from '@/components/build/BuildIntegrationTab';
import { BuildTimelineTab } from '@/components/build/BuildTimelineTab';
import { RunFacts } from '@/components/build/RunFacts';
import { api } from '@/lib/api';
import { BUILD_STATUS_LABEL, buildTone, graphColumns, isTerminal, primaryAction, stageSteps } from '@/lib/build';
import { ago, plural } from '@/lib/format';
import type { BuildAction, BuildActionRequest, BuildRecovery, BuildRunTab } from '@/types';

const RECOVERY: Record<BuildRecovery, { action?: BuildAction; label: string }> = {
  retry: { action: 'retry', label: 'Try again' },
  retry_plan: { action: 'retry-plan', label: 'Plan again' },
  write_plan: { label: 'Write the plan yourself' },
  retry_task: { label: 'Open the task to retry it' },
  continue_integration: {
    action: 'continue-integration',
    label: 'Continue integration',
  },
  retry_resolve: { action: 'retry-resolve', label: 'Ask an agent again' },
  accept_findings: {
    action: 'accept-findings',
    label: 'Accept findings and continue',
  },
  retry_review: { action: 'retry-review', label: 'Review again' },
  skip_review: { action: 'skip-review', label: 'Continue without review' },
  retry_investigation: { action: 'retry-investigation', label: 'Investigate again' },
  retry_reproduction: { action: 'retry-reproduction', label: 'Run the reproduction again' },
  continue_unreproduced: { action: 'continue-unreproduced', label: 'Fix without a reproduction' },
};

export function BuildRun() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { build, setBuild, error, reload } = useBuild(id);
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<BuildRunTab>('timeline');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const act = async (action: BuildAction, req: BuildActionRequest = {}) => {
    setBusy(action);
    setActionError(undefined);
    try {
      setBuild(await api.buildAction(id, action, req));
    } catch (e) {
      setActionError((e as Error).message);
      reload();
    } finally {
      setBusy(undefined);
    }
  };

  const columns = useMemo(() => (build ? graphColumns(build.tasks) : []), [build]);
  const focus = useMemo(() => {
    if (!build) return undefined;
    const pick = build.tasks.find((t) => t.id === selected);
    if (pick) return pick;
    return build.tasks.find((t) => t.status === 'needs_attention') ?? build.tasks.find((t) => t.status === 'running') ?? undefined;
  }, [build, selected]);

  useEffect(() => {
    if (build?.status === 'awaiting_plan_approval') setTab('plan');
    else if (build?.kind === 'autofix') setTab((t) => (t === 'plan' ? 'timeline' : t));
  }, [build?.status, build?.kind]);

  if (error && !build) {
    return (
      <Page>
        <ErrorState
          title="Build run not found"
          body="It may have been removed, or the CSM service is not running."
          detail={error}
          action={<Button onClick={() => nav('/build')}>Back to Build Room</Button>}
        />
      </Page>
    );
  }

  if (!build) {
    return (
      <Page>
        <LoadingState label="Reading the build run" />
      </Page>
    );
  }

  const primary = primaryAction(build);
  const terminal = isTerminal(build.status);
  const finalChecks = (build.checks ?? []).filter((c) => c.stage === 'integration');
  const blockingOpen = (build.findings ?? []).filter((f) => f.blocking && f.status === 'open').length;

  return (
    <Page wide>
      <PageHeader
        title={build.title}
        subtitle={
          <>
            {build.repo_name} · {build.base_branch} at <span className="mono">{build.base_commit.slice(0, 8)}</span> · created {ago(build.created_at)}
          </>
        }
        action={
          <div className="page__actions">
            {!terminal && !build.cancel_requested && build.status !== 'awaiting_plan_approval' && build.status !== 'awaiting_final_approval' ? (
              build.paused ? (
                <Button icon={PlayIcon} onClick={() => void act('resume')} loading={busy === 'resume'}>
                  Resume
                </Button>
              ) : (
                <Button icon={PauseIcon} onClick={() => void act('pause')} loading={busy === 'pause'}>
                  Pause
                </Button>
              )
            ) : null}
            {!terminal && !build.cancel_requested ? (
              confirmCancel ? (
                <>
                  <Button variant="danger" onClick={() => void act('cancel').then(() => setConfirmCancel(false))} loading={busy === 'cancel'}>
                    Stop agents and cancel
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                    Keep running
                  </Button>
                </>
              ) : (
                <Button variant="ghost" icon={UnavailableIcon} onClick={() => setConfirmCancel(true)}>
                  Cancel run
                </Button>
              )
            ) : null}
            {primary ? (
              <Button variant="primary" icon={Tick02Icon} onClick={() => void act(primary.action)} loading={busy === primary.action} disabled={build.ops.includes('push')}>
                {primary.label}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="build-top">
        <div className="build-progress">
          <span className="build-progress__status">
            <StatusText
              tone={buildTone(build.status)}
              pulse={!terminal && build.status !== 'awaiting_plan_approval' && build.status !== 'awaiting_final_approval' && build.status !== 'needs_attention'}
            >
              {build.cancel_requested && !terminal ? 'Cancelling' : build.paused ? 'Paused' : BUILD_STATUS_LABEL[build.status]}
            </StatusText>
            <span className="muted">{stageSteps(build).find((x) => x.state === 'current')?.label}</span>
          </span>
          <RunBar build={build} />
        </div>

        {build.status === 'needs_attention' && build.attention ? (
          <div className="mc-attention build-attention" role="alert">
            <strong>Needs your attention</strong>
            <span className="selectable">{build.attention}</span>
            {build.recovery?.length ? (
              <div className="build-attention__actions">
                {build.recovery.map((r) => {
                  const rec = RECOVERY[r];
                  if (r === 'write_plan')
                    return (
                      <Button
                        key={r}
                        size="sm"
                        onClick={() => {
                          setTab('plan');
                          setEditing(true);
                        }}
                      >
                        {rec.label}
                      </Button>
                    );
                  if (!rec.action) return null;
                  return (
                    <Button key={r} size="sm" onClick={() => void act(rec.action!)} loading={busy === rec.action}>
                      {rec.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {build.paused && !terminal ? <div className="build-note">Paused. Agents already running continue; no new agent starts until you resume.</div> : null}
        {actionError ? <p className="form-error selectable">{actionError}</p> : null}
      </div>

      <div className="build-ws">
        <div className="build-ws__main">
          {build.kind === 'autofix' && build.signal ? (
            <>
              <IncidentPanel signal={build.signal} hub={build.hub} />
              <InvestigationPanel build={build} />
              <VerificationPanel build={build} />
            </>
          ) : (
            <Panel className="build-request">
              <h4 className="panel__h4">Request</h4>
              <p className="selectable build-request__text">{build.instruction}</p>
              {build.source_dirty ? <p className="muted">Uncommitted changes in your working tree are not part of this run and were left untouched.</p> : null}
            </Panel>
          )}

          <section className="build-graph" aria-label="Tasks and dependencies">
            <header className="build-section-head">
              <h3>Tasks</h3>
              <span className="muted">
                {build.tasks.length
                  ? `${build.summary.tasks_completed} of ${plural(build.tasks.length, 'task')} completed`
                  : build.status === 'planning'
                    ? 'The planner is reading the repository'
                    : 'No plan yet'}
              </span>
            </header>
            {build.tasks.length ? (
              <div className="build-graph__cols">
                {columns.map((col, i) => (
                  <div key={i} className="build-graph__col">
                    <span className="build-graph__label">{i === 0 ? 'Starts first' : col[0]?.kind === 'fix' ? 'Review fixes' : `After step ${i}`}</span>
                    {col.map((t) => (
                      <TaskNode key={t.id} build={build} task={t} selected={focus?.id === t.id} onSelect={() => setSelected(t.id)} />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted build-graph__empty">{build.status === 'planning' ? 'Tasks appear here once the planner reports.' : 'Write a plan or ask an agent to plan again.'}</p>
            )}
          </section>

          <Tabs<BuildRunTab>
            tabs={[
              { id: 'timeline', label: 'Timeline' },
              ...(build.kind === 'autofix' ? [] : [{ id: 'plan' as BuildRunTab, label: 'Plan' }]),
              {
                id: 'checks',
                label: 'Receipt',
                count: finalChecks.length || undefined,
              },
              {
                id: 'review',
                label: 'Review',
                count: (build.findings ?? []).length || undefined,
              },
              { id: 'integration', label: 'Integration' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="build-tab">
            {tab === 'plan' ? (
              editing ? (
                <PlanEditor
                  build={build}
                  onCancel={() => setEditing(false)}
                  onSaved={(b) => {
                    setBuild(b);
                    setEditing(false);
                  }}
                />
              ) : (
                <BuildPlanTab build={build} onEdit={() => setEditing(true)} />
              )
            ) : null}
            {tab === 'checks' ? <ReceiptView build={build} /> : null}
            {tab === 'review' ? <BuildReviewTab build={build} /> : null}
            {tab === 'integration' ? <BuildIntegrationTab build={build} /> : null}
            {tab === 'timeline' ? <BuildTimelineTab build={build} /> : null}
          </div>
        </div>

        <aside className="build-ws__side">{focus ? <TaskDetail key={focus.id} build={build} task={focus} busy={busy} onAct={act} /> : <RunFacts build={build} blockingOpen={blockingOpen} />}</aside>
      </div>
    </Page>
  );
}
