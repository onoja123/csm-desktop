import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Check, Copy, FolderOpen } from 'lucide-react';
import { Button, Field, Icon, Panel, Row, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { DeliveryResult, HubIntegration, HubSignin, HubStatus } from '@/lib/types';

type Tone = 'ok' | 'warn' | 'err' | 'idle';

const NEW_WORKSPACE = '__new__';

export function deliveryHealth(i: HubIntegration): { tone: Tone; text: string } {
  const when = i.last_delivery_at ? ` ${ago(i.last_delivery_at)}` : '';
  const results: Record<DeliveryResult, { tone: Tone; text: string }> = {
    recorded: { tone: 'ok', text: `Receiving events from Sentry. Last error${when}.` },
    duplicate: { tone: 'ok', text: `Receiving events from Sentry. Last delivery${when} was a redelivery.` },
    ignored: { tone: 'ok', text: `Sentry is reaching Hub. The last delivery${when} was not an error, so it was ignored.` },
    test: { tone: 'ok', text: `Test verified${when}. Waiting for Sentry's first event.` },
    invalid_signature: { tone: 'err', text: `The last delivery${when} had an invalid signature: the client secret here does not match the one in Sentry.` },
    no_secret: { tone: 'err', text: `Sentry is sending events${when}, but the client secret is not set yet, so Hub refuses them.` },
    invalid_payload: { tone: 'err', text: `The last delivery${when} could not be read as a Sentry event.` },
  };
  if (!i.last_delivery_result)
    return i.has_secret ? { tone: 'idle', text: 'No deliveries yet. Sentry sends one when an error happens, or send a test below.' } : { tone: 'idle', text: 'Waiting for the client secret.' };
  return results[i.last_delivery_result] ?? { tone: 'idle', text: i.last_delivery_result };
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="input-row">
      <input className="input mono" value={value} readOnly aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <Button
        icon={copied ? Check : Copy}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <li className={`sc-step ${done ? 'sc-step--done' : ''}`}>
      <span className="sc-step__n">{done ? <Icon icon={Check} size="sm" /> : n}</span>
      <div className="sc-step__body">
        <h4 className="sc-step__title">{title}</h4>
        {children}
      </div>
    </li>
  );
}

function SignIn({ initialURL, onSignedIn }: { initialURL?: string; onSignedIn: (s: HubSignin) => void }) {
  const [url, setURL] = useState(initialURL ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onSignedIn(await api.hubSignin({ url, email, password, name: name || undefined, create_account: create }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="sc-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label="Hub URL" hint="Where CSM Hub runs for your team. Sentry sends its webhooks there.">
        <input className="input mono" value={url} onChange={(e) => setURL(e.target.value)} placeholder="https://hub.example.com" aria-label="Hub URL" />
      </Field>
      {create ? (
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        </Field>
      ) : null}
      <Field label="Email">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" aria-label="Email" />
      </Field>
      <Field label="Password" hint="Sent to the Hub only. CSM keeps the session in memory, never the password.">
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={create ? 'new-password' : 'current-password'} aria-label="Password" />
      </Field>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="sc-actions">
        <button type="button" className="link-btn" onClick={() => setCreate((c) => !c)}>
          {create ? 'I already have an account' : 'Create an account instead'}
        </button>
        <Button type="submit" variant="primary" loading={busy} disabled={!url || !email || !password}>
          {create ? 'Create account' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}

function Choose({ signin, onDone }: { signin: HubSignin; onDone: (s: HubStatus) => void }) {
  const [workspace, setWorkspace] = useState(signin.workspaces[0]?.id ?? NEW_WORKSPACE);
  const [workspaceName, setWorkspaceName] = useState('');
  const [project, setProject] = useState('');
  const [repo, setRepo] = useState('');
  const [repository, setRepository] = useState('');
  const [base, setBase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const browse = async () => {
    const picked = await open({ directory: true, multiple: false, title: 'Choose the repository' });
    if (typeof picked === 'string') setRepo(picked);
  };

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onDone(
        await api.hubSetup({
          workspace_id: workspace === NEW_WORKSPACE ? undefined : workspace,
          workspace_name: workspace === NEW_WORKSPACE ? workspaceName : undefined,
          project,
          repo,
          repository: repository || undefined,
          base_branch: base || undefined,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="sc-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="muted">
        Signed in to {signin.url} as {signin.email}.
      </p>
      {!signin.public ? <p className="sc-warn">Sentry cannot reach {signin.url} from the internet. Real events need a Hub on a public HTTPS address; this one works for tests.</p> : null}
      <Field label="Workspace">
        <select className="input" value={workspace} onChange={(e) => setWorkspace(e.target.value)} aria-label="Workspace">
          {signin.workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value={NEW_WORKSPACE}>New workspace…</option>
        </select>
      </Field>
      {workspace === NEW_WORKSPACE ? (
        <Field label="Workspace name">
          <input className="input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme" aria-label="Workspace name" />
        </Field>
      ) : null}
      <Field label="Sentry project" hint="The project slug, as in Sentry → Settings → Projects.">
        <input className="input mono" value={project} onChange={(e) => setProject(e.target.value)} placeholder="orders-api" aria-label="Sentry project" />
      </Field>
      <Field label="Repository on this Mac" hint="Where CSM reproduces and fixes this project's errors.">
        <div className="input-row">
          <input className="input mono" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="/path/to/repository" aria-label="Repository on this Mac" />
          <Button type="button" icon={FolderOpen} onClick={() => void browse()} aria-label="Browse" />
        </div>
      </Field>
      <div className="sc-grid">
        <Field label="GitHub repository" hint="Read from the origin remote when left empty.">
          <input className="input mono" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="owner/name" aria-label="GitHub repository" />
        </Field>
        <Field label="Base branch" hint="The current branch when left empty.">
          <input className="input mono" value={base} onChange={(e) => setBase(e.target.value)} placeholder="main" aria-label="Base branch" />
        </Field>
      </div>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="sc-actions">
        <span />
        <Button type="submit" variant="primary" loading={busy} disabled={!project || !repo || (workspace === NEW_WORKSPACE && !workspaceName)}>
          Create the webhook
        </Button>
      </div>
    </form>
  );
}

function Connected({ status, onChange, onAddProject, onDisconnect }: { status: HubStatus; onChange: (s: HubStatus) => void; onAddProject: () => void; onDisconnect: () => void }) {
  const integ = status.integrations[0];
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [test, setTest] = useState<{ ok: boolean; message: string }>();
  const [resign, setResign] = useState(false);

  if (!status.reachable) {
    return (
      <div className="sc-form">
        <p className="form-error selectable">CSM Hub could not be reached with this machine's runner token: {status.error}</p>
        <div className="sc-actions">
          <Button variant="ghost" onClick={onDisconnect}>
            Disconnect
          </Button>
          <Button onClick={onAddProject}>Set up again</Button>
        </div>
      </div>
    );
  }

  if (!integ) {
    return (
      <div className="sc-form">
        <p className="muted">Workspace {status.workspace?.name} has no Sentry integration yet.</p>
        <div className="sc-actions">
          <span />
          <Button variant="primary" onClick={onAddProject}>
            Set up Sentry
          </Button>
        </div>
      </div>
    );
  }

  const health = deliveryHealth(integ);
  const saveSecret = async () => {
    setBusy('secret');
    setError(undefined);
    try {
      onChange(await api.hubSecret(secret));
      setSecret('');
    } catch (e) {
      const msg = (e as Error).message;
      if (/sign in/i.test(msg)) setResign(true);
      setError(msg);
    } finally {
      setBusy(undefined);
    }
  };
  const sendTest = async () => {
    setBusy('test');
    setTest(undefined);
    try {
      setTest(await api.hubTest());
      onChange(await api.hubStatus());
    } catch (e) {
      setTest({ ok: false, message: (e as Error).message });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="sc-connected">
      <Row label="Workspace">{status.workspace?.name}</Row>
      <Row label="Projects">{status.mappings.length ? status.mappings.map((m) => `${m.project} → ${m.repository}`).join(', ') : 'none'}</Row>
      <Row label="This Mac">{status.runner ?? '—'} claims runs for these projects</Row>
      <ol className="sc-steps">
        <Step n={1} title="Add the webhook in Sentry" done={integ.has_secret}>
          {!status.public ? <p className="sc-warn">Sentry cannot reach {status.url} from the internet; real events need a Hub on a public HTTPS address.</p> : null}
          <CopyField value={integ.webhook_url} label="Webhook URL" />
          <ol className="sc-howto">
            <li>
              In Sentry, open <strong>Settings → Developer Settings → Custom Integrations</strong> and choose <strong>Create New Integration → Internal Integration</strong>.
            </li>
            <li>
              Name it <strong>CSM</strong> and paste the URL above as the <strong>Webhook URL</strong>.
            </li>
            <li>
              Under <strong>Permissions</strong>, give <strong>Issue &amp; Event</strong> read access.
            </li>
            <li>
              Under <strong>Webhooks</strong>, tick <strong>issue</strong> and <strong>error</strong>, then save. (Error webhooks need a Sentry Business plan or higher; issue webhooks work on every
              plan.)
            </li>
          </ol>
        </Step>
        <Step n={2} title="Paste the client secret" done={integ.has_secret && status.has_local_secret}>
          <p className="muted">After saving, Sentry shows the integration's Client Secret under Credentials. Hub uses it to check every webhook really came from Sentry.</p>
          {resign ? (
            <SignIn
              initialURL={status.url}
              onSignedIn={() => {
                setResign(false);
                setError(undefined);
              }}
            />
          ) : (
            <div className="input-row">
              <input
                className="input mono"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={integ.has_secret ? '•••••••• (set; paste to replace)' : 'Client Secret'}
                aria-label="Client secret"
              />
              <Button onClick={() => void saveSecret()} loading={busy === 'secret'} disabled={secret.length < 16}>
                Save
              </Button>
            </div>
          )}
          {error && !resign ? <p className="form-error selectable">{error}</p> : null}
        </Step>
        <Step n={3} title="Check the connection" done={integ.last_delivery_result === 'recorded' || integ.last_delivery_result === 'duplicate'}>
          <p className="sc-health">
            <StatusText tone={health.tone}>{health.text}</StatusText>
          </p>
          <div className="sc-actions">
            <span className="muted">A test proves the webhook URL and the secret match. It creates no incident.</span>
            <Button onClick={() => void sendTest()} loading={busy === 'test'} disabled={!status.has_local_secret}>
              Send a test
            </Button>
          </div>
          {test ? <p className={test.ok ? 'form-ok' : 'form-error selectable'}>{test.message}</p> : null}
        </Step>
      </ol>
      <div className="sc-actions">
        <Button variant="ghost" onClick={onDisconnect}>
          Disconnect this Mac
        </Button>
        <Button onClick={onAddProject}>Add another project</Button>
      </div>
    </div>
  );
}

export function SentryConnect({ connected, hubURL, onSaved }: { connected: boolean; hubURL?: string; onSaved: () => void }) {
  const [status, setStatus] = useState<HubStatus>();
  const [signin, setSignin] = useState<HubSignin>();
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const load = useCallback(async () => {
    if (!connected) return setStatus(undefined);
    try {
      setStatus(await api.hubStatus());
      setLoadError(undefined);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [connected]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);

  const disconnect = async () => {
    await api.updateAutofixConfig({ hub_url: '' });
    setStatus(undefined);
    setSignin(undefined);
    setAdding(false);
    onSaved();
  };

  if (status && !adding) return <Connected status={status} onChange={setStatus} onAddProject={() => setAdding(true)} onDisconnect={() => void disconnect()} />;
  if (connected && !status && !adding) return loadError ? <p className="form-error selectable">{loadError}</p> : <p className="muted">Checking CSM Hub…</p>;

  return (
    <ol className="sc-steps">
      <Step n={1} title="Sign in to CSM Hub" done={!!signin}>
        {signin ? <p className="muted">Signed in as {signin.email}.</p> : <SignIn initialURL={hubURL} onSignedIn={setSignin} />}
      </Step>
      <Step n={2} title="Choose the project and repository">
        {signin ? (
          <Choose
            signin={signin}
            onDone={(s) => {
              setStatus(s);
              setAdding(false);
              onSaved();
            }}
          />
        ) : (
          <p className="muted">Pick the workspace, the Sentry project and the repository its errors belong to.</p>
        )}
      </Step>
      <Step n={3} title="Add the webhook in Sentry">
        <p className="muted">CSM shows the webhook URL to paste into Sentry and checks the connection.</p>
      </Step>
      {adding ? (
        <li className="sc-actions">
          <span />
          <Button variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </li>
      ) : null}
    </ol>
  );
}

export function SentryConnectPanel(props: { connected: boolean; hubURL?: string; onSaved: () => void }) {
  return (
    <Panel className="sc-panel">
      <SentryConnect {...props} />
    </Panel>
  );
}
