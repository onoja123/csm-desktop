import { useState } from 'react';
import { Button, CopyField, Row, StatusText } from '@/components/ui';
import { SetupStep } from './SetupStep';
import { HubSignInForm } from './HubSignInForm';
import { deliveryHealth } from '@/lib/hub';
import { api } from '@/lib/api';
import type { HubStatus, HubTestResult } from '@/types';

export function HubConnectionStatus({ status, onChange, onAddProject, onDisconnect }: { status: HubStatus; onChange: (s: HubStatus) => void; onAddProject: () => void; onDisconnect: () => void }) {
  const integ = status.integrations[0];
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [test, setTest] = useState<HubTestResult>();
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
        <SetupStep n={1} title="Add the webhook in Sentry" done={integ.has_secret}>
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
        </SetupStep>
        <SetupStep n={2} title="Paste the client secret" done={integ.has_secret && status.has_local_secret}>
          <p className="muted">After saving, Sentry shows the integration's Client Secret under Credentials. Hub uses it to check every webhook really came from Sentry.</p>
          {resign ? (
            <HubSignInForm
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
        </SetupStep>
        <SetupStep n={3} title="Check the connection" done={integ.last_delivery_result === 'recorded' || integ.last_delivery_result === 'duplicate'}>
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
        </SetupStep>
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
