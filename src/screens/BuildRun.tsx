import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, CircleSlash, Pause, Pencil, Play } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { DiffView } from '@/components/build/DiffView';
import { IncidentPanel, InvestigationPanel, VerificationPanel } from '@/components/autofix/AutofixPanels';
import { PlanEditor } from '@/components/build/PlanEditor';
import { ReceiptView } from '@/components/build/ReceiptView';
import { TaskDetail } from '@/components/build/TaskDetail';
import { RunBar, RunOutcome, RunTimeline } from '@/components/build/RunTimeline';
import { Button, ErrorState, Icon, LoadingState, PageHeader, Panel, Row, StatusText, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import {
  BUILD_STATUS_LABEL,
  FINDING_STATUS_LABEL,
  TASK_STATUS_LABEL,
  buildTone,
  currentAgent,
  graphColumns,
  isTerminal,
  primaryAction,
  severityTone,
  stageSteps,
  taskTone,
} from '@/lib/build';
import { PROVIDER_LONG_NAMES, ago, clock, plural, shortPath } from '@/lib/format';
import type { Build, BuildAction, BuildRecovery, BuildTask } from '@/lib/types';
import { useData } from '@/store/data';
import { useTerminal } from '@/terminal/store';

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

type Tab = 'timeline' | 'plan' | 'checks' | 'review' | 'integration';

export function useBuild(id: string) {
  const [build, setBuild] = useState<Build>();
  const [error, setError] = useState<string>();
  const stamp = useData((s) => s.buildStamps[id] ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(() => {
    api
      .build(id)
      .then((b) => {
        setBuild(b);
        setError(undefined);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, stamp ? 150 : 0);
    return () => clearTimeout(timer.current);
  }, [load, stamp]);

  const live = build && !isTerminal(build.status);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [live, load]);

  return { build, setBuild, error, reload: load };
}

export function BuildRun() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { build, setBuild, error, reload } = useBuild(id);
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<Tab>('timeline');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const act = async (action: BuildAction, req: { task?: string; provider?: string } = {}) => {
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
                <Button icon={Play} onClick={() => void act('resume')} loading={busy === 'resume'}>
                  Resume
                </Button>
              ) : (
                <Button icon={Pause} onClick={() => void act('pause')} loading={busy === 'pause'}>
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
                <Button variant="ghost" icon={CircleSlash} onClick={() => setConfirmCancel(true)}>
                  Cancel run
                </Button>
              )
            ) : null}
            {primary ? (
              <Button variant="primary" icon={Check} onClick={() => void act(primary.action)} loading={busy === primary.action} disabled={build.ops.includes('push')}>
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

          <Tabs<Tab>
            tabs={[
              { id: 'timeline', label: 'Timeline' },
              ...(build.kind === 'autofix' ? [] : [{ id: 'plan' as Tab, label: 'Plan' }]),
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
                <PlanTab build={build} onEdit={() => setEditing(true)} />
              )
            ) : null}
            {tab === 'checks' ? <ReceiptView build={build} /> : null}
            {tab === 'review' ? <ReviewTab build={build} /> : null}
            {tab === 'integration' ? <IntegrationTab build={build} /> : null}
            {tab === 'timeline' ? <TimelineTab build={build} /> : null}
          </div>
        </div>

        <aside className="build-ws__side">{focus ? <TaskDetail key={focus.id} build={build} task={focus} busy={busy} onAct={act} /> : <RunFacts build={build} blockingOpen={blockingOpen} />}</aside>
      </div>
    </Page>
  );
}

function TaskNode({ build, task: t, selected, onSelect }: { build: Build; task: BuildTask; selected: boolean; onSelect: () => void }) {
  const agent = currentAgent(build, t);
  return (
    <button className={`build-node ${selected ? 'build-node--selected' : ''} build-node--${t.status}`} onClick={onSelect} aria-pressed={selected}>
      <span className="build-node__top">
        <span className="build-node__title">{t.title}</span>
        {agent.provider ? <AgentIcon provider={agent.provider} size="md" /> : null}
      </span>
      <span className="build-node__meta mono">
        {t.id}
        {t.depends_on?.length ? ` · after ${t.depends_on.join(', ')}` : ''}
      </span>
      <span className="build-node__foot">
        <StatusText tone={taskTone(t.status)} pulse={t.status === 'running'}>
          {TASK_STATUS_LABEL[t.status]}
        </StatusText>
        {agent.provider ? <span className="muted">{agent.account ?? PROVIDER_LONG_NAMES[agent.provider as keyof typeof PROVIDER_LONG_NAMES]}</span> : null}
      </span>
      {t.switches?.length ? <span className="build-node__switch">{t.switches.map((s) => `${s.from} → ${s.to}`).join(', ')}</span> : null}
    </button>
  );
}

function RunFacts({ build, blockingOpen }: { build: Build; blockingOpen: number }) {
  return (
    <Panel className="build-facts">
      <RunOutcome build={build}>
        {blockingOpen ? <p className="tone-err build-facts__line">{plural(blockingOpen, 'blocking finding')} open</p> : null}
        {build.integration.branch ? <p className="mono muted build-facts__line">{build.integration.branch}</p> : null}
        {build.pr.url ? (
          <a className="link build-facts__line" href={build.pr.url} target="_blank" rel="noreferrer">
            {build.pr.url}
          </a>
        ) : null}
      </RunOutcome>
      <p className="muted build-facts__note">Select a task to see its agent, worktree, attempts and diff.</p>
    </Panel>
  );
}

function TimelineTab({ build }: { build: Build }) {
  return (
    <div className="build-timeline">
      <RunTimeline build={build} />
      <details className="build-timeline__raw">
        <summary>All events ({build.events.length})</summary>
        <HistoryTab build={build} />
      </details>
    </div>
  );
}

function PlanTab({ build, onEdit }: { build: Build; onEdit: () => void }) {
  const p = build.plan;
  const editable = build.status === 'awaiting_plan_approval';
  if (!build.tasks.length && !p.summary) return <p className="muted">{build.status === 'planning' ? 'Waiting for the planner.' : 'No plan.'}</p>;
  return (
    <div className="build-plan">
      <div className="build-plan__head">
        <span className="muted">{p.source ? `Drafted by ${p.source}${p.edited_by_user ? ', edited by you' : ''}` : ''}</span>
        {editable ? (
          <Button size="sm" icon={Pencil} onClick={onEdit}>
            Edit plan
          </Button>
        ) : null}
      </div>
      {p.summary ? <p className="selectable">{p.summary}</p> : null}
      {p.layers?.length ? <PlainList title="Parts of the codebase" items={p.layers} /> : null}
      {p.considerations?.length ? <PlainList title="Considerations" items={p.considerations} /> : null}
      {p.suggested_checks?.length ? <PlainList title="Checks the planner suggested" note="shown only; CSM runs the repository's own commands" items={p.suggested_checks} mono /> : null}
      <div className="build-plan__tasks">
        {build.tasks.map((t) => (
          <div key={t.id} className="build-plan__task">
            <div className="build-plan__task-head">
              <span className="mono muted">{t.id}</span>
              <strong>{t.title}</strong>
              <span className="muted">{t.provider ? PROVIDER_LONG_NAMES[t.provider] : 'any ready agent'}</span>
            </div>
            <p className="selectable">{t.objective}</p>
            {t.acceptance?.length ? (
              <ul className="build-plan__criteria">
                {t.acceptance.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {t.depends_on?.length ? <p className="muted">After {t.depends_on.join(', ')}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlainList({ title, items, note, mono }: { title: string; items: string[]; note?: string; mono?: boolean }) {
  return (
    <div className="handoff-list">
      <h4>
        {title}
        {note ? <span className="handoff-list__note">{note}</span> : null}
      </h4>
      <ul>
        {items.map((i) => (
          <li key={i} className={`selectable ${mono ? 'mono' : ''}`}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewTab({ build }: { build: Build }) {
  const reviews = build.reviews ?? [];
  const findings = build.findings ?? [];
  if (!reviews.length && !findings.length) return <p className="muted">{build.policy.review ? 'The review runs after the tasks are integrated and checked.' : 'Agent review is off for this run.'}</p>;
  return (
    <div className="build-review">
      {reviews.map((r) => (
        <div key={r.cycle} className="build-review__round">
          <div className="build-review__head">
            <AgentIcon provider={r.provider} size="md" />
            <strong>Round {r.cycle}</strong>
            <span className="muted">
              {PROVIDER_LONG_NAMES[r.provider]}
              {r.account ? ` (${r.account})` : ''} · {r.status === 'running' ? 'reviewing' : r.verdict?.replace(/_/g, ' ') || r.status}
            </span>
          </div>
          {!r.independent && r.note ? (
            <p className="build-note">
              <Icon icon={AlertTriangle} size="sm" className="tone-warn" /> {r.note}
            </p>
          ) : null}
          {r.summary ? <p className="selectable">{r.summary}</p> : null}
          {r.ignored_edits?.length ? <p className="muted">The reviewer edited {plural(r.ignored_edits.length, 'file')} in its review copy; those edits were not used.</p> : null}
        </div>
      ))}
      {findings.length ? (
        <div className="build-findings">
          {findings.map((f) => (
            <div key={f.id} className="build-finding">
              <div className="build-finding__head">
                <StatusText tone={severityTone(f)}>{f.severity}</StatusText>
                <strong>{f.title}</strong>
                {f.blocking ? <span className="build-finding__tag">blocking</span> : null}
                <span className="muted">
                  round {f.cycle} · {FINDING_STATUS_LABEL[f.status]}
                </span>
              </div>
              {f.file ? (
                <p className="mono muted">
                  {f.file}
                  {f.line ? `:${f.line}` : ''}
                  {f.task_id ? ` · task ${f.task_id}` : ''}
                </p>
              ) : null}
              {f.explanation ? <pre className="build-finding__text selectable">{f.explanation}</pre> : null}
              {f.reasoning ? <p className="selectable muted">{f.reasoning}</p> : null}
              {f.recommendation ? <p className="selectable">Suggested fix: {f.recommendation}</p> : null}
              <p className="build-finding__source">Source: {f.source}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IntegrationTab({ build }: { build: Build }) {
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

function HistoryTab({ build }: { build: Build }) {
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
