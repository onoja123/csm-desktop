import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { HubConnectionStatus } from './HubConnectionStatus';
import { SetupStep } from './SetupStep';
import { HubSignInForm } from './HubSignInForm';
import { HubProjectSetupForm } from './HubProjectSetupForm';
import { api } from '@/lib/api';
import type { HubSignin, HubStatus, SentryConnectProps } from '@/types';

export function SentryConnect({ connected, hubURL, onSaved }: SentryConnectProps) {
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

  if (status && !adding)
    return (
      <HubConnectionStatus
        status={status}
        onChange={setStatus}
        onAddProject={() => setAdding(true)}
        onDisconnect={() => void disconnect()}
      />
    );

  if (connected && !status && !adding)
    return loadError ? (
      <p className="form-error selectable">{loadError}</p>
    ) : (
      <p className="muted">Checking CSM Hub…</p>
    );

  return (
    <ol className="sc-steps">
      <SetupStep n={1} title="Sign in to CSM Hub" done={!!signin}>
        {signin ? (
          <p className="muted">Signed in as {signin.email}.</p>
        ) : (
          <HubSignInForm initialURL={hubURL} onSignedIn={setSignin} />
        )}
      </SetupStep>

      <SetupStep n={2} title="Choose the project and repository">
        {signin ? (
          <HubProjectSetupForm
            signin={signin}
            onDone={(s) => {
              setStatus(s);
              setAdding(false);
              onSaved();
            }}
          />
        ) : (
          <p className="muted">
            Pick the workspace, the Sentry project and the repository its errors belong to.
          </p>
        )}
      </SetupStep>

      <SetupStep n={3} title="Add the webhook in Sentry">
        <p className="muted">
          CSM shows the webhook URL to paste into Sentry and checks the connection.
        </p>
      </SetupStep>

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
