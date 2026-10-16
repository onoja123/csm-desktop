import { useEffect, useState } from 'react';
import { Button, Dialog, Field, LoadingState } from '@/components/ui';
import { CompatList } from '@/components/skills/CompatList';
import { FindingList } from '@/components/skills/FindingList';
import { OutcomeList } from '@/components/skills/OutcomeList';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import { licenseText, sourceLabel } from '@/lib/skills';
import { useData } from '@/store/data';
import type { ProviderID, SkillInspectView, SkillInstallReport } from '@/types';

type Scope = 'global' | 'project' | 'both';

export function SkillInstallDialog({
  source,
  open,
  onClose,
}: {
  source: string;
  open: boolean;
  onClose: () => void;
}) {
  const projects = useData((s) => s.projects).filter((p) => p.exists);
  const refresh = useData((s) => s.refresh);
  const [view, setView] = useState<SkillInspectView>();
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<Scope>('global');
  const [project, setProject] = useState('');
  const [agents, setAgents] = useState<ProviderID[]>([]);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [approve, setApprove] = useState(false);
  const [conflict, setConflict] = useState<'' | 'replace' | 'keep_both'>('');
  const [reports, setReports] = useState<SkillInstallReport[]>();

  useEffect(() => {
    if (!open) return;

    setView(undefined);
    setReports(undefined);
    setError(undefined);
    setPicked([]);
    setAcceptRisk(false);
    setApprove(false);
    setConflict('');
    setProject(projects[0]?.dir ?? '');

    api
      .inspectSkill({ source })
      .then(setView)
      .catch((e: Error) => setError(e.message));
    // Re-inspect only when the dialog opens for a new source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  const inspectPicked = async () => {
    setView(undefined);
    setError(undefined);

    try {
      setView(await api.inspectSkill({ source, skills: picked }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const candidates = view?.candidates ?? [];
  const risky = candidates.some((c) => c.candidate.inspection.status === 'risky');

  const asksPermissions = candidates.some(
    (c) => (c.candidate.skill?.allowed_tools?.length ?? 0) > 0 || !!c.candidate.skill?.extra?.hooks,
  );

  const installable = candidates.some((c) => !c.candidate.error && c.candidate.skill);

  const install = async () => {
    setBusy(true);
    setError(undefined);

    try {
      const res = await api.installSkill({
        source,
        skills: picked.length ? picked : undefined,
        global: scope !== 'project',
        project_dir: scope !== 'global' ? project : undefined,
        providers: agents.length ? agents : undefined,
        accept_risk: acceptRisk,
        approve_permissions: approve,
        replace: conflict === 'replace',
        keep_both: conflict === 'keep_both',
      });

      setReports(res.reports);
      void refresh('skills');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const failedConflict = reports?.some((r) => r.error?.includes('already installed from'));

  return (
    <Dialog open={open} onClose={onClose} title="Install a skill" width={720}>
      <p className="muted mono selectable">{source}</p>

      {!view && !error ? <LoadingState label="Reading the skill" /> : null}
      {error ? <p className="form-error selectable">{error}</p> : null}

      {view?.error && (view.listing.dirs?.length ?? 0) > 1 ? (
        <div className="skill-pick">
          <p>{view.error.split('\n')[0]}</p>

          <div className="chips">
            {(view.listing.dirs ?? []).map((d) => {
              const name = view.listing.names?.[d] || d.split('/').pop() || d;
              const on = picked.includes(name);

              return (
                <button
                  key={d}
                  className={`chip ${on ? 'chip--active' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    setPicked((p) => (on ? p.filter((x) => x !== name) : [...p, name]))
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>

          <Button size="sm" disabled={!picked.length} onClick={() => void inspectPicked()}>
            Read {picked.length || ''} selected
          </Button>
        </div>
      ) : view?.error ? (
        <p className="form-error selectable">{view.error}</p>
      ) : null}

      {candidates.map((c) => {
        const s = c.candidate.skill;

        return (
          <div key={c.candidate.id} className="skill-candidate">
            <h3>{s?.name ?? c.candidate.id}</h3>
            {s ? <p className="selectable">{s.description}</p> : null}

            <div className="build-task__rows">
              <div className="row">
                <span className="row__label">Source</span>
                <span className="row__value mono selectable">{sourceLabel(c.candidate)}</span>
              </div>

              {c.candidate.revision ? (
                <div className="row">
                  <span className="row__label">Revision</span>
                  <span className="row__value mono selectable">{c.candidate.revision}</span>
                </div>
              ) : null}

              <div className="row">
                <span className="row__label">License</span>
                <span className="row__value">
                  {licenseText(s?.license, c.candidate.repo_license)}
                </span>
              </div>

              <div className="row">
                <span className="row__label">Files</span>
                <span className="row__value">
                  {s?.files.length ?? 0} ({c.candidate.inspection.scripts?.length ?? 0} script
                  {(c.candidate.inspection.scripts?.length ?? 0) === 1 ? '' : 's'}; CSM never runs
                  them)
                </span>
              </div>

              {s?.allowed_tools?.length ? (
                <div className="row">
                  <span className="row__label">Asks for tools</span>
                  <span className="row__value mono">{s.allowed_tools.join(', ')}</span>
                </div>
              ) : null}
            </div>

            {c.candidate.error ? (
              <p className="form-error selectable">{c.candidate.error}</p>
            ) : null}

            {(c.candidate.problems ?? []).map((p) => (
              <p key={p.message} className={p.fatal ? 'form-error' : 'muted'}>
                {p.message}
              </p>
            ))}

            <FindingList inspection={c.candidate.inspection} />
            <CompatList items={c.compatibility} />

            {c.preview ? (
              <details className="skill-preview">
                <summary>SKILL.md</summary>
                <pre className="code-block selectable">{c.preview}</pre>
              </details>
            ) : null}

            {s?.files.length ? (
              <details className="skill-preview">
                <summary>All {s.files.length} files</summary>

                <ul className="mono skill-files">
                  {s.files.map((f) => (
                    <li key={f.path}>
                      {f.executable ? 'x ' : '  '}
                      {f.path} <span className="muted">{f.size} B</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        );
      })}

      {installable && !reports ? (
        <div className="skill-install-options">
          <Field label="Where">
            <select
              className="input input--sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="global">Every project (global)</option>
              <option value="project">One project</option>
              <option value="both">Global and one project</option>
            </select>
          </Field>

          {scope !== 'global' ? (
            <Field
              label="Project"
              hint="Copies go in the project's skill folders, where your team can commit them."
            >
              <select
                className="input input--sm"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.dir} value={p.dir}>
                    {p.display}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Agents" hint="None selected means every agent that can use it.">
            <div className="chips">
              {PROVIDERS.map((p) => {
                const on = agents.includes(p);

                return (
                  <button
                    key={p}
                    className={`chip ${on ? 'chip--active' : ''}`}
                    aria-pressed={on}
                    onClick={() => setAgents((a) => (on ? a.filter((x) => x !== p) : [...a, p]))}
                  >
                    {PROVIDER_LONG_NAMES[p]}
                  </button>
                );
              })}
            </div>
          </Field>

          {asksPermissions ? (
            <label className="skill-check">
              <input
                type="checkbox"
                checked={approve}
                onChange={(e) => setApprove(e.target.checked)}
              />
              Let agents use the tool permissions and hooks it asks for. Unticked, CSM removes them
              from the copies agents load.
            </label>
          ) : null}

          {risky ? (
            <label className="skill-check tone-err">
              <input
                type="checkbox"
                checked={acceptRisk}
                onChange={(e) => setAcceptRisk(e.target.checked)}
              />
              I read the serious findings above and want to install it anyway.
            </label>
          ) : null}

          {failedConflict ? (
            <Field label="A different skill with this name is installed">
              <select
                className="input input--sm"
                value={conflict}
                onChange={(e) => setConflict(e.target.value as '' | 'replace' | 'keep_both')}
              >
                <option value="">Keep the installed one and stop</option>
                <option value="replace">
                  Replace it (CSM removes only its own unchanged copies)
                </option>
                <option value="keep_both">Install this one disabled beside it</option>
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {reports ? (
        <div className="skill-reports">
          {reports.map((r) => (
            <div key={r.id} className="skill-report">
              <h4>
                {r.name || r.id}: {r.error ? 'not installed' : r.action}
              </h4>

              {r.error ? <p className="form-error selectable">{r.error}</p> : null}
              {r.record ? <OutcomeList outcomes={r.placements} /> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="dialog__actions dialog__actions--sticky">
        <Button onClick={onClose}>{reports ? 'Close' : 'Cancel'}</Button>

        {installable && (!reports || failedConflict) ? (
          <Button
            variant="primary"
            loading={busy}
            disabled={(risky && !acceptRisk) || (scope !== 'global' && !project)}
            onClick={() => void install()}
          >
            {failedConflict ? 'Try again' : 'Install'}
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
}
