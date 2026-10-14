import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { AlertTriangle, FolderOpen, GitBranch, Plus, Workflow } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Button, EmptyState, ErrorState, Field, Icon, LoadingState, PageHeader, StatusText, Toggle } from '@/components/ui';
import { api } from '@/lib/api';
import { BUILD_STATUS_LABEL, GROUP_ORDER, GROUP_TITLE, buildTone, groupOf } from '@/lib/build';
import { PROVIDER_LONG_NAMES, ago, plural } from '@/lib/format';
import type { BuildPreflight, BuildSummary, ProviderID } from '@/lib/types';
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
        <Button variant="primary" icon={Plus} onClick={() => nav('/build/new')}>
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
          icon={Workflow}
          title="No build runs yet"
          body="Describe a change in a repository. CSM drafts a plan for you to approve, then coordinates your agents, runs the repository's checks and asks another agent to review the result."
          action={
            <Button variant="primary" icon={Plus} onClick={() => nav('/build/new')}>
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

function BuildRow({ build: b }: { build: BuildSummary }) {
  const pct = b.tasks ? Math.round((b.tasks_completed / b.tasks) * 100) : 0;
  return (
    <Link to={`/build/${b.id}`} className="build-row">
      <div className="build-row__main">
        <span className="build-row__title">{b.title}</span>
        <span className="build-row__meta">
          <Icon icon={GitBranch} size="sm" />
          {b.repo_name} · {b.base_branch} · {ago(b.updated_at)}
        </span>
        {b.attention ? <span className="build-row__attention">{b.attention}</span> : null}
      </div>
      <div className="build-row__agents">
        {b.agents.map((p) => (
          <AgentIcon key={p} provider={p} size="md" />
        ))}
      </div>
      <div className="build-row__progress" title={`${b.tasks_completed} of ${b.tasks} tasks completed`}>
        {b.tasks ? (
          <>
            <span className="build-row__bar">
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="build-row__count">
              {b.tasks_completed}/{b.tasks} tasks
            </span>
          </>
        ) : (
          <span className="build-row__count muted">No plan yet</span>
        )}
      </div>
      <StatusText tone={buildTone(b.status)} pulse={groupOf(b) === 'active'}>
        {b.paused ? 'Paused' : BUILD_STATUS_LABEL[b.status]}
      </StatusText>
    </Link>
  );
}

export function NewBuildRun() {
  const nav = useNavigate();
  const projects = useData((s) => s.projects);
  const refresh = useData((s) => s.refresh);
  const [instruction, setInstruction] = useState('');
  const [dir, setDir] = useState('');
  const [pre, setPre] = useState<BuildPreflight>();
  const [preError, setPreError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [base, setBase] = useState('');
  const [agents, setAgents] = useState<ProviderID[]>([]);
  const [parallel, setParallel] = useState(2);
  const [approvePlan, setApprovePlan] = useState(true);
  const [review, setReview] = useState(true);
  const [rounds, setRounds] = useState(2);
  const [baseline, setBaseline] = useState(true);
  const [remote, setRemote] = useState(true);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void refresh('projects');
  }, [refresh]);

  useEffect(() => {
    if (!dir && projects.length) setDir(projects.find((p) => p.exists)?.dir ?? '');
  }, [projects, dir]);

  useEffect(() => {
    if (!dir) return;
    let live = true;
    setChecking(true);
    setPreError(undefined);
    const t = setTimeout(() => {
      api
        .buildPreflight(dir)
        .then((p) => {
          if (!live) return;
          setPre(p);
          setBase(p.branch);
          setAgents(p.defaults.agents ?? []);
        })
        .catch((e) => {
          if (!live) return;
          setPre(undefined);
          setPreError((e as Error).message);
        })
        .finally(() => live && setChecking(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [dir]);

  const browse = async () => {
    const picked = await open({ directory: true, multiple: false, title: 'Choose the repository' });
    if (typeof picked === 'string') setDir(picked);
  };

  const toggleAgent = (id: ProviderID) => setAgents((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const create = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const b = await api.createBuild({
        instruction,
        project_dir: dir,
        base_branch: base,
        policy: { max_parallel: parallel, require_plan_approval: approvePlan, review, max_review_cycles: rounds, agents, run_baseline: baseline, allow_remote: remote },
        custom_checks: custom
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      void refresh('builds');
      nav(`/build/${b.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const eligible = pre?.agents.filter((a) => a.eligible) ?? [];
  const canCreate = !!instruction.trim() && !!pre && agents.length > 0 && !busy;

  return (
    <Page>
      <PageHeader title="New build run" subtitle="CSM plans first. Nothing changes in your repository: every task works on its own branch in a separate worktree." />
      <div className="build-new">
        <div className="build-new__main">
          <Field label="What should be built?" hint="Describe the outcome, the parts involved and anything the change must not break.">
            <textarea
              className="input input--area build-new__task"
              rows={6}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Add team invitations: backend endpoints, the invite screen, tests, and a pull request."
              autoFocus
            />
          </Field>
          <Field label="Repository">
            <div className="input-row">
              <input className="input mono" value={dir} onChange={(e) => setDir(e.target.value)} placeholder="~/Projects/my-project" spellCheck={false} />
              <Button icon={FolderOpen} onClick={() => void browse()}>
                Browse
              </Button>
            </div>
          </Field>
          {projects.length > 0 ? (
            <div className="chips">
              {projects
                .filter((p) => p.exists)
                .slice(0, 6)
                .map((p) => (
                  <button key={p.dir} className={`chip ${p.dir === dir ? 'chip--active' : ''}`} onClick={() => setDir(p.dir)} title={p.dir}>
                    {p.display}
                  </button>
                ))}
            </div>
          ) : null}
          {checking ? <LoadingState label="Inspecting the repository" /> : null}
          {preError ? <ErrorState title="This folder cannot be used" body={preError} /> : null}
          {pre && !checking ? (
            <>
              <Field label="Base branch" hint={`Tasks branch from ${pre.branch === base ? 'the current' : 'this'} commit. Your branch is never changed.`}>
                <select className="input" value={base} onChange={(e) => setBase(e.target.value)}>
                  {(pre.branches ?? []).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
              {pre.dirty?.length && base === pre.branch ? (
                <div className="build-note" role="status">
                  <Icon icon={AlertTriangle} size="sm" className="tone-warn" />
                  <span>
                    {plural(pre.dirty.length, 'uncommitted change')} in your working tree {pre.dirty.length === 1 ? 'is' : 'are'} not part of the run. CSM leaves {pre.dirty.length === 1 ? 'it' : 'them'} untouched; commit first if the agents need {pre.dirty.length === 1 ? 'it' : 'them'}.
                  </span>
                </div>
              ) : null}
              <Field label="Agents" hint="CSM assigns tasks to these agents and uses another one for review when it can.">
                <div className="build-agents">
                  {pre.agents.map((a) => (
                    <label key={a.id} className={`build-agent ${a.eligible ? '' : 'build-agent--off'}`} title={a.reason}>
                      <input type="checkbox" checked={agents.includes(a.id)} disabled={!a.eligible} onChange={() => toggleAgent(a.id)} />
                      <AgentIcon provider={a.id} size="md" />
                      <span className="build-agent__name">{PROVIDER_LONG_NAMES[a.id]}</span>
                      <span className="build-agent__meta">{a.eligible ? a.account : a.reason}</span>
                    </label>
                  ))}
                </div>
              </Field>
              {eligible.length === 0 ? <p className="form-error">No agent is installed with a ready account. Add one under Accounts first.</p> : null}
            </>
          ) : null}
        </div>
        <aside className="build-new__side">
          <div className="panel">
            <h4 className="panel__h4">How it runs</h4>
            <div className="build-option">
              <span>Agents at once</span>
              <div className="segmented">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} className={`segmented__item ${parallel === n ? 'segmented__item--active' : ''}`} onClick={() => setParallel(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="build-option">
              <span>
                Approve the plan first
                <small>Recommended. Otherwise work starts as soon as the plan is valid.</small>
              </span>
              <Toggle checked={approvePlan} onChange={setApprovePlan} label="Approve the plan first" />
            </div>
            <div className="build-option">
              <span>
                Independent review
                <small>Another agent reviews the integrated diff; blocking findings go back for a fix.</small>
              </span>
              <Toggle checked={review} onChange={setReview} label="Independent review" />
            </div>
            {review ? (
              <div className="build-option">
                <span>Review rounds at most</span>
                <div className="segmented">
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={`segmented__item ${rounds === n ? 'segmented__item--active' : ''}`} onClick={() => setRounds(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="build-option">
              <span>
                Check the base commit too
                <small>Separates failures the change caused from ones that already existed.</small>
              </span>
              <Toggle checked={baseline} onChange={setBaseline} label="Check the base commit" />
            </div>
            <div className="build-option">
              <span>
                Offer to push and open a PR
                <small>Always asks you first. Only the run's own branch is pushed.</small>
              </span>
              <Toggle checked={remote} onChange={setRemote} label="Offer to push" />
            </div>
          </div>
          <div className="panel">
            <h4 className="panel__h4">Checks</h4>
            {pre?.checks.length ? (
              <ul className="build-checks-list">
                {pre.checks.map((c) => (
                  <li key={c.name}>
                    <code>{c.command.join(' ')}</code>
                    <span className="muted">from {c.source}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{pre ? 'No test or build commands were found in the repository.' : 'Choose a repository to see its checks.'}</p>
            )}
            <Field label="More commands" hint="One per line, run with your shell in the integration worktree.">
              <textarea className="input input--area mono" rows={2} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="make lint" spellCheck={false} />
            </Field>
          </div>
        </aside>
      </div>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="build-new__actions">
        <Button onClick={() => nav('/build')}>Cancel</Button>
        <Button variant="primary" onClick={() => void create()} loading={busy} disabled={!canCreate}>
          {approvePlan ? 'Draft plan' : 'Plan and start'}
        </Button>
      </div>
    </Page>
  );
}
