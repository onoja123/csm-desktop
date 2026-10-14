import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus, Siren, Trash2 } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { SentryConnectPanel } from '@/components/autofix/SentryConnect';
import { Button, EmptyState, ErrorState, Field, Icon, LoadingState, PageHeader, Panel, Section, StatusText, Tabs, Toggle } from '@/components/ui';
import { api } from '@/lib/api';
import { BUILD_STATUS_LABEL, VERDICT_LABEL, buildTone, severityToneOf, verdictTone } from '@/lib/build';
import { ago } from '@/lib/format';
import type { AutofixConfig, Incident, RepoMapping } from '@/lib/types';
import { useData } from '@/store/data';

type Tab = 'incidents' | 'settings';

export function AutoFix() {
  const [tab, setTab] = useState<Tab>('incidents');
  const refresh = useData((s) => s.refresh);

  useEffect(() => {
    void refresh('signals');
    void refresh('builds');
  }, [refresh]);

  return (
    <Page>
      <PageHeader
        title="AutoFix"
        subtitle="Production errors become engineering runs: CSM investigates, reproduces the failure in a sandbox, fixes it with your agents, verifies the fix and prepares a pull request for you to review."
      />
      <Tabs<Tab>
        tabs={[
          { id: 'incidents', label: 'Incidents' },
          { id: 'settings', label: 'Settings' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'incidents' ? <Incidents onSetup={() => setTab('settings')} /> : <Settings />}
    </Page>
  );
}

function Incidents({ onSetup }: { onSetup: () => void }) {
  const incidents = useData((s) => s.signals);
  const builds = useData((s) => s.builds);
  const loaded = useData((s) => s.loaded.signals);
  const error = useData((s) => s.errors.signals);
  const refresh = useData((s) => s.refresh);
  const [busy, setBusy] = useState<string>();
  const [startError, setStartError] = useState<string>();

  if (!loaded && !error) return <LoadingState label="Reading incidents" />;
  if (error) return <ErrorState title="Incidents could not be loaded" body={error} action={<Button onClick={() => void refresh('signals')}>Retry</Button>} />;
  if (!incidents.length)
    return (
      <EmptyState
        icon={Siren}
        title="No incidents yet"
        body="Connect Sentry in Settings: sign in to CSM Hub, pick the project and repository, and paste the webhook URL into Sentry. Every error Sentry reports then becomes an incident here."
        action={
          <Button variant="primary" onClick={onSetup}>
            Connect Sentry
          </Button>
        }
      />
    );

  const start = async (id: string) => {
    setBusy(id);
    setStartError(undefined);
    try {
      await api.startIncidentRun(id);
      await refresh('signals');
    } catch (e) {
      setStartError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="list list--tight af-incidents">
      {startError ? <p className="form-error">{startError}</p> : null}
      {incidents.map((i) => (
        <IncidentRow key={i.id} incident={i} runs={builds.filter((b) => (i.runs ?? []).includes(b.id))} busy={busy === i.id} onStart={() => void start(i.id)} />
      ))}
    </div>
  );
}

function IncidentRow({ incident: i, runs, busy, onStart }: { incident: Incident; runs: ReturnType<typeof useData.getState>['builds']; busy: boolean; onStart: () => void }) {
  const latest = runs[0];
  return (
    <div className="af-row">
      <div className="af-row__main">
        <span className="af-row__title">{i.title}</span>
        <span className="af-row__meta">
          <span className="af-source">{i.source}</span> {i.project} · {i.count} occurrence{i.count === 1 ? '' : 's'} · last {ago(i.last_seen)}
          {i.environment ? ` · ${i.environment}` : ''}
        </span>
        {i.note ? <span className="build-row__attention">{i.note}</span> : null}
      </div>
      <StatusText tone={severityToneOf(i.severity)}>{i.severity}</StatusText>
      {latest ? (
        <Link to={`/build/${latest.id}`} className="af-row__run">
          <StatusText tone={buildTone(latest.status)} pulse={!['completed', 'failed', 'cancelled', 'awaiting_final_approval', 'needs_attention'].includes(latest.status)}>
            {BUILD_STATUS_LABEL[latest.status]}
          </StatusText>
          {latest.verdict && latest.verdict !== 'not_run' ? <StatusText tone={verdictTone(latest.verdict)}>{VERDICT_LABEL[latest.verdict]}</StatusText> : null}
        </Link>
      ) : i.status === 'unmapped' ? (
        <span className="muted">Not mapped</span>
      ) : (
        <Button size="sm" onClick={onStart} loading={busy}>
          Start run
        </Button>
      )}
    </div>
  );
}

function Settings() {
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

  const save = async (patch: Parameters<typeof api.updateAutofixConfig>[0], what: string) => {
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
                <Button size="sm" icon={FolderOpen} onClick={() => void browse(i)} aria-label="Browse" />
              </div>
              <input className="input input--sm mono" value={m.base_branch ?? ''} onChange={(e) => update(i, { base_branch: e.target.value })} placeholder="base branch" aria-label="Base branch" />
              <button className="icon-btn" onClick={() => setMappings((ms) => ms.filter((_, n) => n !== i))} aria-label="Remove mapping">
                <Icon icon={Trash2} size="sm" />
              </button>
            </div>
          ))}
          <div className="af-mappings__actions">
            <Button size="sm" icon={Plus} onClick={() => setMappings((ms) => [...ms, { source: 'sentry', project: '', repo: '', base_branch: 'main' }])}>
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
