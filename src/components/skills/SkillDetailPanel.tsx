import { useEffect, useState } from 'react';
import { Button, Panel, PanelHeader, Row, StatusText, Toggle } from '@/components/ui';
import { DiffFileBlock } from '@/components/build/DiffFileBlock';
import { CompatList } from '@/components/skills/CompatList';
import { FindingList } from '@/components/skills/FindingList';
import { OutcomeList } from '@/components/skills/OutcomeList';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES, ago, shortPath } from '@/lib/format';
import { licenseText, placementStateTone, scopeLabel, sourceLabel, toFileDiff } from '@/lib/skills';
import { useData } from '@/store/data';
import { useHomeDir } from '@/hooks/useHomeDir';
import type {
  ProviderID,
  SkillAction,
  SkillActionRequest,
  SkillDiffView,
  SkillOutcome,
  SkillRecord,
  SkillUpdateReport,
} from '@/types';

export function SkillDetailPanel({
  skill: r,
  projectDir,
}: {
  skill: SkillRecord;
  projectDir?: string;
}) {
  const home = useHomeDir();
  const refresh = useData((s) => s.refresh);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>();
  const [update, setUpdate] = useState<SkillUpdateReport>();
  const [edits, setEdits] = useState<SkillDiffView[]>();
  const [preview, setPreview] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const edited = Object.entries(r.placement_states).filter(([, s]) => s.startsWith('edited'));

  useEffect(() => {
    setOutcomes(undefined);
    setUpdate(undefined);
    setEdits(undefined);
    setError(undefined);
    setConfirmRemove(false);

    api
      .skillDetail(r.id)
      .then((d) => setPreview(d.preview))
      .catch(() => setPreview(undefined));
  }, [r.id]);

  const act = async (action: SkillAction, req: SkillActionRequest = {}) => {
    setBusy(action);
    setError(undefined);

    try {
      const res = await api.skillAction(action, { id: r.id, ...req });

      setOutcomes(res.placements);
      await refresh('skills');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const check = async () => {
    setBusy('check');
    setError(undefined);

    try {
      setUpdate((await api.checkSkills([r.id]))[0]);
      await refresh('skills');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const showEdits = async () => {
    setBusy('diff');

    try {
      setEdits(await api.skillDiff(r.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const limited = r.providers ?? [];

  const toggleAgent = (p: ProviderID) => {
    const on = limited.length === 0 || limited.includes(p);

    void act(on ? 'disable' : 'enable', { providers: [p] });
  };

  const inProject = !!projectDir && (r.projects ?? []).includes(projectDir);

  return (
    <Panel className="skill-detail">
      <PanelHeader
        title={r.name}
        meta={r.enabled ? scopeLabel(r) : 'Disabled'}
        action={
          <Toggle
            checked={r.enabled}
            label={r.enabled ? 'Disable' : 'Enable'}
            onChange={(v) => void act(v ? 'enable' : 'disable')}
          />
        }
      />

      <p className="selectable">{r.description}</p>
      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="build-task__rows">
        <Row label="Source" mono>
          {sourceLabel(r)}
        </Row>
        <Row label="Version" mono>
          {r.revision ?? `content ${r.hash.slice(0, 12)}`}
          {r.pinned ? ' · pinned' : ''}
        </Row>
        {r.upstream_hash && r.upstream_hash !== r.hash ? (
          <Row label="Local changes">Kept over upstream {r.upstream_hash.slice(0, 12)}</Row>
        ) : null}
        <Row label="License">{licenseText(r.license, r.repo_license)}</Row>
        <Row label="Installed">{ago(r.installed_at)}</Row>
        {r.upstream ? (
          <Row label="Upstream">
            {r.upstream.error
              ? `Unreachable: ${r.upstream.error}`
              : r.upstream.hash === r.upstream_hash
                ? `Up to date (checked ${ago(r.upstream.checked_at)})`
                : `A newer version exists (checked ${ago(r.upstream.checked_at)})`}
          </Row>
        ) : null}
        {r.skill.allowed_tools?.length ? (
          <Row label="Tool permissions">
            {r.permissions_approved
              ? `Approved: ${r.skill.allowed_tools.join(', ')}`
              : 'Asked for, removed from the copies agents load'}
          </Row>
        ) : null}
      </div>

      <div className="skill-detail__actions">
        <Button size="sm" loading={busy === 'check'} onClick={() => void check()}>
          Check for update
        </Button>

        {r.history && r.history.length > 1 ? (
          <Button size="sm" loading={busy === 'rollback'} onClick={() => void act('rollback')}>
            Roll back
          </Button>
        ) : null}

        {projectDir ? (
          <Button
            size="sm"
            loading={busy === 'scope'}
            onClick={() => void act('scope', { project_dir: projectDir, add_project: !inProject })}
          >
            {inProject ? 'Remove from this project' : 'Add to this project'}
          </Button>
        ) : null}

        <Button
          size="sm"
          loading={busy === 'scope'}
          onClick={() => void act('scope', { global: !r.global })}
        >
          {r.global ? 'Stop using everywhere' : 'Use in every project'}
        </Button>

        {confirmRemove ? (
          <>
            <Button
              size="sm"
              variant="danger"
              loading={busy === 'remove'}
              onClick={() => void act('remove')}
            >
              Remove CSM's copies
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
            Remove…
          </Button>
        )}
      </div>

      {confirmRemove ? (
        <p className="muted">
          CSM deletes only the copies it placed and can prove nobody changed. Edited copies stop the
          removal so nothing of yours is lost.
        </p>
      ) : null}

      {update ? (
        <div className="handoff-list">
          <h4>Update check</h4>
          <p>
            {update.status}
            {update.error ? `: ${update.error}` : ''}
          </p>

          {update.plan && !update.plan.up_to_date ? (
            <>
              {update.plan.risk_increase ? (
                <p className="tone-warn">The new version's inspection is worse; read it first.</p>
              ) : null}
              {update.plan.new_permissions ? (
                <p className="tone-warn">It asks for different tool permissions; they stay off.</p>
              ) : null}
              {(update.plan.local_changes ?? []).map((d) => (
                <p key={d} className="tone-warn">
                  Your edits in {shortPath(d, home)} are kept; that copy keeps its version.
                </p>
              ))}

              <div className="diff">
                {(update.plan.changes ?? []).map((c) => (
                  <DiffFileBlock key={c.path} file={toFileDiff(c)} startOpen={false} />
                ))}
              </div>

              <Button
                size="sm"
                variant="primary"
                loading={busy === 'update'}
                onClick={() => void act('update', { unpin: r.pinned })}
              >
                Update to {update.plan.candidate.revision?.slice(0, 12) ?? 'the new version'}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {outcomes ? (
        <div className="handoff-list">
          <h4>Result</h4>
          <OutcomeList outcomes={outcomes} />
        </div>
      ) : null}

      <div className="handoff-list">
        <h4>Agents</h4>

        <div className="chips">
          {PROVIDERS.map((p) => {
            const on = r.enabled && (limited.length === 0 || limited.includes(p));

            return (
              <button
                key={p}
                className={`chip ${on ? 'chip--active' : ''}`}
                aria-pressed={on}
                disabled={!!busy}
                onClick={() => toggleAgent(p)}
              >
                {PROVIDER_LONG_NAMES[p]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="handoff-list">
        <h4>
          Placed copies<span className="handoff-list__note">checked on disk now</span>
        </h4>

        {r.projections?.length ? (
          <ul className="skill-outcomes">
            {r.projections.map((p) => (
              <li key={p.dir}>
                <span className="skill-outcomes__who">
                  {PROVIDER_LONG_NAMES[p.provider]}
                  {p.account ? ` · ${p.account}` : ` · ${p.scope}`}
                </span>
                <StatusText tone={placementStateTone(r.placement_states[p.dir] ?? 'ok')}>
                  {r.placement_states[p.dir] ?? 'ok'}
                </StatusText>
                <span className="mono muted selectable">{shortPath(p.dir, home)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            None yet. CSM places it when an account of a matching agent starts.
          </p>
        )}

        {edited.length ? (
          <Button size="sm" loading={busy === 'diff'} onClick={() => void showEdits()}>
            Review {edited.length} edited cop{edited.length === 1 ? 'y' : 'ies'}
          </Button>
        ) : null}

        {(edits ?? []).map((d) => (
          <div key={d.dir} className="skill-edit">
            <p className="mono selectable">{shortPath(d.dir, home)}</p>

            <div className="diff">
              {d.changes.map((c) => (
                <DiffFileBlock key={c.path} file={toFileDiff(c)} startOpen />
              ))}
            </div>

            <div className="skill-detail__actions">
              <Button
                size="sm"
                loading={busy === 'keep'}
                onClick={() => void act('keep', { dir: d.dir })}
              >
                Keep my edits as the installed version
              </Button>
              <Button
                size="sm"
                loading={busy === 'revert'}
                onClick={() => void act('revert', { dir: d.dir })}
              >
                Restore CSM's copy (mine is backed up)
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="handoff-list">
        <h4>Compatibility</h4>
        <CompatList items={r.compatibility} />
      </div>

      <div className="handoff-list">
        <h4>Inspection</h4>
        <FindingList inspection={r.inspection} />
      </div>

      {preview ? (
        <details className="skill-preview">
          <summary>SKILL.md</summary>
          <pre className="code-block selectable">{preview}</pre>
        </details>
      ) : null}

      {r.history?.length ? (
        <div className="handoff-list">
          <h4>History</h4>

          <ul>
            {[...r.history].reverse().map((h, i) => (
              <li key={i}>
                <span className="mono">{(h.revision ?? h.hash).slice(0, 12)}</span>{' '}
                <span className="muted">
                  {h.note} · {ago(h.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
