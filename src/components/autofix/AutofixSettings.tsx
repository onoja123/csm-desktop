import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Delete02Icon, Folder02Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { SentryConnectPanel } from '@/components/autofix/SentryConnectPanel';
import { Button, ErrorState, Field, Icon, LoadingState, Panel, Section, Toggle } from '@/components/ui';
import { api } from '@/lib/api';
import type { AutofixConfig, AutofixConfigPatch, RepoMapping } from '@/types';

export function AutofixSettings() {
  const [cfg, setCfg] = useState<AutofixConfig>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [secret, setSecret] = useState('');
  const [hubURL, setHubURL] = useState('');
  const [hubToken, setHubToken] = useState('');
  const [mappings, setMappings] = useState<RepoMapping[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () =>
      api
        .autofixConfig()
        .then((c) => {
          setCfg(c);
          setMappings(c.mappings);
          setHubURL(c.hub?.url ?? '');
        })
        .catch((e) => setError((e as Error).message)),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async (patch: AutofixConfigPatch, what: string) => {
    setBusy(true);
    setError(undefined);
    setSaved(undefined);
    try {
      const c = await api.updateAutofixConfig(patch);
      setCfg(c);
      setMappings(c.mappings);
      setSaved(what);
      setSecret('');
      setHubToken('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!cfg) return error ? <ErrorState title="Settings could not be loaded" body={error} /> : <LoadingState label="Reading settings" />;

  const update = (i: number, patch: Partial<RepoMapping>) => setMappings((ms) => ms.map((m, n) => (n === i ? { ...m, ...patch } : m)));
  const browse = async (i: number) => {
    const picked = await open({ directory: true, multiple: false, title: 'Choose the repository' });
    if (typeof picked === 'string') update(i, { repo: picked });
  };

  return (
    <div className="af-settings">
      {error ? <p className="form-error selectable">{error}</p> : null}
      {saved ? <p className="form-ok">{saved} saved.</p> : null}
      <Section title="Connect Sentry" meta={cfg.hub?.connected ? `connected${cfg.hub.workspace ? ` · ${cfg.hub.workspace}` : ''}` : 'not connected'}>
        <SentryConnectPanel connected={!!cfg.hub?.connected} hubURL={cfg.hub?.url} onSaved={() => void reload()} />
      </Section>
      <Section title="Repositories" meta="which local repository each project's errors belong to">
        <div className="af-mappings">
          {mappings.map((m, i) => (
            <div key={i} className="af-mapping">
              <select className="input input--sm" value={m.source} onChange={(e) => update(i, { source: e.target.value })} aria-label="Source">
                <option value="sentry">Sentry</option>
              </select>
              <input className="input input--sm mono" value={m.project} onChange={(e) => update(i, { project: e.target.value })} placeholder="project slug or id" aria-label="Project" />
              <div className="input-row">
                <input className="input input--sm mono" value={m.repo} onChange={(e) => update(i, { repo: e.target.value })} placeholder="/path/to/repository" aria-label="Repository" />
                <Button size="sm" icon={Folder02Icon} onClick={() => void browse(i)} aria-label="Browse" />
              </div>
              <input className="input input--sm mono" value={m.base_branch ?? ''} onChange={(e) => update(i, { base_branch: e.target.value })} placeholder="base branch" aria-label="Base branch" />
              <button className="icon-btn" onClick={() => setMappings((ms) => ms.filter((_, n) => n !== i))} aria-label="Remove mapping">
                <Icon icon={Delete02Icon} size="sm" />
              </button>
            </div>
          ))}
          <div className="af-mappings__actions">
            <Button size="sm" icon={PlusSignIcon} onClick={() => setMappings((ms) => [...ms, { source: 'sentry', project: '', repo: '', base_branch: 'main' }])}>
              Add mapping
            </Button>
            <Button size="sm" variant="primary" onClick={() => void save({ mappings }, 'Repository mappings')} loading={busy}>
              Save mappings
            </Button>
          </div>
        </div>
      </Section>
      <Section title="Start runs automatically">
        <Panel>
          <div className="build-option">
            <span>
              Start an AutoFix run for each new incident
              <small>Recurring events attach to their incident and never start a second run. Pull requests always wait for your approval.</small>
            </span>
            <Toggle checked={cfg.auto_start} onChange={(v) => void save({ auto_start: v }, 'Automatic runs')} label="Start runs automatically" />
          </div>
        </Panel>
      </Section>
      <Section title="Advanced">
        <Panel>
          <details className="sc-advanced">
            <summary>Receive Sentry webhooks on this machine instead of CSM Hub</summary>
            <p className="muted">
              The CSM service accepts signed Sentry webhooks at <code>{cfg.webhook_path}</code>, on its local socket or with the network token. Sentry can only reach it if you expose the service
              yourself; CSM Hub is the supported route.
            </p>
            <Field label="Client secret" hint="Write-only. CSM never shows it again.">
              <div className="input-row">
                <input
                  className="input mono"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={cfg.has_sentry_secret ? '••••••••' : 'Sentry integration client secret'}
                  aria-label="Local client secret"
                />
                <Button onClick={() => void save({ sentry_secret: secret }, 'Sentry secret')} disabled={!secret} loading={busy}>
                  Save
                </Button>
              </div>
            </Field>
          </details>
          <details className="sc-advanced">
            <summary>Connect with a runner token from an admin</summary>
            <p className="muted">If a workspace admin already issued a runner token for this machine, connect with it here instead of signing in.</p>
            <Field label="Hub URL">
              <input className="input mono" value={hubURL} onChange={(e) => setHubURL(e.target.value)} placeholder="https://hub.example.com" aria-label="Runner Hub URL" />
            </Field>
            <Field label="Runner token" hint="Stored locally, readable only by you.">
              <input
                className="input mono"
                type="password"
                value={hubToken}
                onChange={(e) => setHubToken(e.target.value)}
                placeholder={cfg.hub?.connected ? '••••••••' : 'csmr_…'}
                aria-label="Runner token"
              />
            </Field>
            <div className="af-mappings__actions">
              <Button
                variant="primary"
                onClick={() => void save({ hub_url: hubURL, hub_token: hubToken || undefined }, 'Hub connection')}
                disabled={!hubURL || (!hubToken && !cfg.hub?.connected)}
                loading={busy}
              >
                Connect
              </Button>
            </div>
          </details>
        </Panel>
      </Section>
    </div>
  );
}
