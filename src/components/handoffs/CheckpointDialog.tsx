import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, Field } from '@/components/ui';
import { useCheckpointDialog } from '@/store/checkpoint-dialog';
import { api } from '@/lib/api';
import { PROVIDER_NAMES, baseName } from '@/lib/format';
import { useData } from '@/store/data';

// Saving needs only the project: the context comes from the agent's session record and git, and is edited afterwards.
export function CheckpointDialog() {
  const { isOpen, close, projectDir: preset } = useCheckpointDialog();
  const nav = useNavigate();
  const { runs, projects, refresh } = useData();
  const [dir, setDir] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const options = useMemo(() => {
    const live = [...runs.runs.filter((r) => r.status === 'running'), ...runs.external].map(
      (r) => ({
        dir: r.project_dir,
        label: `${baseName(r.project_dir)} · ${PROVIDER_NAMES[r.provider]} ${r.account} running`,
      }),
    );

    const seen = new Set(live.map((o) => o.dir));

    const rest = projects
      .filter((p) => p.exists && !seen.has(p.dir))
      .map((p) => ({ dir: p.dir, label: `${p.display}${p.branch ? ` · ${p.branch}` : ''}` }));

    return [...live, ...rest];
  }, [runs, projects]);

  useEffect(() => {
    if (!isOpen) return;

    setError(undefined);
    setDir(preset ?? options[0]?.dir ?? '');
    void refresh('projects');
  }, [isOpen, preset]);

  const save = async () => {
    setBusy(true);
    setError(undefined);

    try {
      const cp = await api.createCheckpoint(dir);

      close();
      nav(`/handoffs/${encodeURIComponent(cp.project)}/${encodeURIComponent(cp.id)}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={close} title="Save checkpoint" width={480}>
      <Field
        label="Project"
        hint="CSM reads the agent's session record and the repository. Nothing is stopped or changed."
      >
        <select className="input" value={dir} onChange={(e) => setDir(e.target.value)}>
          {preset && !options.some((o) => o.dir === preset) ? (
            <option value={preset}>{baseName(preset)}</option>
          ) : null}

          {options.map((o) => (
            <option key={o.dir} value={o.dir}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="dialog__actions">
        <Button onClick={close}>Cancel</Button>

        <Button variant="primary" onClick={() => void save()} loading={busy} disabled={!dir}>
          Save checkpoint
        </Button>
      </div>
    </Dialog>
  );
}
