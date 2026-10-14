import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { Alert02Icon, Folder02Icon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Button, ErrorState, Field, Icon, LoadingState, PageHeader, Toggle } from '@/components/ui';
import { api } from '@/lib/api';
import { plural, PROVIDER_LONG_NAMES } from '@/lib/format';
import { useData } from '@/store/data';
import type { BuildPreflight, ProviderID } from '@/types';

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
              <Button icon={Folder02Icon} onClick={() => void browse()}>
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
                  <Icon icon={Alert02Icon} size="sm" className="tone-warn" />
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
