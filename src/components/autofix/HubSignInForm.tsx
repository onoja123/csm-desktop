import { useState } from 'react';
import { Button, Field } from '@/components/ui';
import { api } from '@/lib/api';
import type { HubSignin } from '@/types';

export function HubSignInForm({
  initialURL,
  onSignedIn,
}: {
  initialURL?: string;
  onSignedIn: (s: HubSignin) => void;
}) {
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
      onSignedIn(
        await api.hubSignin({
          url,
          email,
          password,
          name: name || undefined,
          create_account: create,
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
      <Field
        label="Hub URL"
        hint="Where CSM Hub runs for your team. Sentry sends its webhooks there."
      >
        <input
          className="input mono"
          value={url}
          onChange={(e) => setURL(e.target.value)}
          placeholder="https://hub.example.com"
          aria-label="Hub URL"
        />
      </Field>

      {create ? (
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
          />
        </Field>
      ) : null}

      <Field label="Email">
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          aria-label="Email"
        />
      </Field>

      <Field
        label="Password"
        hint="Sent to the Hub only. CSM keeps the session in memory, never the password."
      >
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={create ? 'new-password' : 'current-password'}
          aria-label="Password"
        />
      </Field>

      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="sc-actions">
        <button type="button" className="link-btn" onClick={() => setCreate((c) => !c)}>
          {create ? 'I already have an account' : 'Create an account instead'}
        </button>

        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={!url || !email || !password}
        >
          {create ? 'Create account' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}
