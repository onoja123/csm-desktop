import { useEffect, useState } from 'react';
import { Button, Field, LoadingState, Panel, PanelHeader } from '@/components/ui';
import { OutcomeList } from '@/components/skills/OutcomeList';
import { api } from '@/lib/api';
import { useData } from '@/store/data';
import type { SkillPackInstallResult, SkillPacksView } from '@/types';

export function SkillPacks() {
  const refresh = useData((s) => s.refresh);
  const [view, setView] = useState<SkillPacksView>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [result, setResult] = useState<SkillPackInstallResult>();

  const load = () =>
    api
      .skillPacks()
      .then(setView)
      .catch((e: Error) => setError(e.message));

  useEffect(() => void load(), []);

  const install = async (id: string) => {
    setBusy(id);
    setError(undefined);
    setResult(undefined);

    try {
      setResult(await api.installPack(id, { global: true, accept_risk: acceptRisk }));
      await refresh('skills');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  if (!view && !error) return <LoadingState label="Loading packs" />;

  return (
    <div className="skill-packs">
      {view ? <p className="muted">{view.disclaimer}</p> : null}
      {error ? <p className="form-error selectable">{error}</p> : null}

      <Field label="Serious inspection findings">
        <label className="skill-check">
          <input
            type="checkbox"
            checked={acceptRisk}
            onChange={(e) => setAcceptRisk(e.target.checked)}
          />
          Install members even when the inspection finds something serious
        </label>
      </Field>

      {result ? (
        <Panel>
          <PanelHeader
            title={`Pack ${result.pack}`}
            meta={`${result.installed?.length ?? 0} installed`}
          />
          {result.failures.map((f) => (
            <p key={f} className="form-error selectable">
              {f}
            </p>
          ))}
          {result.reports.map((r) => (
            <div key={r.id} className="skill-report">
              <h4>
                {r.name || r.id}: {r.error ? 'not installed' : r.action}
              </h4>
              {r.error ? (
                <p className="muted selectable">{r.error}</p>
              ) : (
                <OutcomeList outcomes={r.placements} />
              )}
            </div>
          ))}
        </Panel>
      ) : null}

      <div className="list">
        {(view?.packs ?? []).map((p) => {
          const have = p.members.filter((m) => m.installed).length;

          return (
            <Panel key={p.id}>
              <PanelHeader
                title={p.name}
                meta={`version ${p.version} · ${have} of ${p.members.length} installed`}
                action={
                  <Button
                    size="sm"
                    loading={busy === p.id}
                    disabled={have === p.members.length}
                    onClick={() => void install(p.id)}
                  >
                    {have === p.members.length ? 'Installed' : 'Install pack'}
                  </Button>
                }
              />

              <p className="muted">{p.description}</p>

              <ul className="skill-members">
                {p.members.map((m) => (
                  <li key={m.source}>
                    <span className={m.installed ? 'tone-ok' : ''}>{m.name}</span>
                    <span className="mono muted">{m.source}</span>
                    {m.optional ? <span className="muted">optional</span> : null}
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
