import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder02Icon } from '@hugeicons/core-free-icons';
import { Button, Dialog, Field } from '@/components/ui';
import { useStartAgent } from '@/store/start-agent-dialog';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import type { ProviderID } from '@/types';
import { useData } from '@/store/data';

export function StartAgentDialog() {
  const { isOpen, close, provider: preset, projectDir: presetDir } = useStartAgent();
  const nav = useNavigate();
  const { status, accounts, projects, refresh } = useData();
  const [provider, setProvider] = useState<ProviderID>('claude');
  const [dir, setDir] = useState('');
  const [args, setArgs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const available = useMemo(
    () =>
      PROVIDERS.filter(
        (p) =>
          status?.providers.find((i) => i.id === p)?.installed &&
          accounts.some((a) => a.provider === p),
      ),
    [status, accounts],
  );

  useEffect(() => {
    if (!isOpen) return;

    setError(undefined);
    setArgs('');
    setProvider(preset && available.includes(preset) ? preset : (available[0] ?? 'claude'));
    setDir(presetDir ?? projects.find((p) => p.exists)?.dir ?? '');
    void refresh('projects');
  }, [isOpen, preset, presetDir, available, projects, refresh]);

  const browse = async () => {
    const picked = await open({
      directory: true,
      multiple: false,
      title: 'Choose the project directory',
    });

    if (typeof picked === 'string') setDir(picked);
  };

  const start = async () => {
    setBusy(true);
    setError(undefined);

    try {
      const run = await api.startRun({
        provider,
        project_dir: dir,
        args: args.trim() ? args.trim().split(/\s+/) : undefined,
      });

      close();
      nav(`/agents/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const activeAccount = accounts.find((a) => a.provider === provider && a.active)?.name;

  return (
    <Dialog open={isOpen} onClose={close} title="Start agent">
      {available.length === 0 ? (
        <p className="dialog__note">
          No agent is both installed and set up with an account. Add one with{' '}
          <code>csm account add &lt;name&gt; --provider &lt;agent&gt;</code>.
        </p>
      ) : (
        <>
          <Field
            label="Agent"
            hint={
              activeAccount ? (
                <>
                  Runs as the active account <span className="mono">{activeAccount}</span>
                </>
              ) : (
                'No active account for this agent'
              )
            }
          >
            <div className="segmented">
              {available.map((p) => (
                <button
                  key={p}
                  className={`segmented__item ${p === provider ? 'segmented__item--active' : ''}`}
                  onClick={() => setProvider(p)}
                >
                  {PROVIDER_LONG_NAMES[p]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Project directory">
            <div className="input-row">
              <input
                className="input mono"
                value={dir}
                onChange={(e) => setDir(e.target.value)}
                placeholder="~/Projects/my-project"
                spellCheck={false}
              />

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
                  <button
                    key={p.dir}
                    className={`chip ${p.dir === dir ? 'chip--active' : ''}`}
                    onClick={() => setDir(p.dir)}
                    title={p.dir}
                  >
                    {p.display}
                  </button>
                ))}
            </div>
          ) : null}

          <Field
            label="Extra arguments"
            hint="Passed to the agent as typed. Leave empty for an interactive session."
          >
            <input
              className="input mono"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="optional"
              spellCheck={false}
            />
          </Field>

          {error ? <p className="form-error selectable">{error}</p> : null}

          <div className="dialog__actions">
            <Button onClick={close}>Cancel</Button>

            <Button
              variant="primary"
              onClick={() => void start()}
              loading={busy}
              disabled={!dir || !activeAccount}
            >
              Start {PROVIDER_LONG_NAMES[provider]}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
