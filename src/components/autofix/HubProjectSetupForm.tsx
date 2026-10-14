import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder02Icon } from '@hugeicons/core-free-icons';
import { Button, Field } from '@/components/ui';
import { api } from '@/lib/api';
import type { HubSignin, HubStatus } from '@/types';

const NEW_WORKSPACE = '__new__';

export function HubProjectSetupForm({
  signin,
  onDone,
}: {
  signin: HubSignin;
  onDone: (s: HubStatus) => void;
}) {
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

      {!signin.public ? (
        <p className="sc-warn">
          Sentry cannot reach {signin.url} from the internet. Real events need a Hub on a public
          HTTPS address; this one works for tests.
        </p>
      ) : null}

      <Field label="Workspace">
        <select
          className="input"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          aria-label="Workspace"
        >
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
          <input
            className="input"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Acme"
            aria-label="Workspace name"
          />
        </Field>
      ) : null}

      <Field label="Sentry project" hint="The project slug, as in Sentry → Settings → Projects.">
        <input
          className="input mono"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="orders-api"
          aria-label="Sentry project"
        />
      </Field>

      <Field
        label="Repository on this Mac"
        hint="Where CSM reproduces and fixes this project's errors."
      >
        <div className="input-row">
          <input
            className="input mono"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="/path/to/repository"
            aria-label="Repository on this Mac"
          />

          <Button
            type="button"
            icon={Folder02Icon}
            onClick={() => void browse()}
            aria-label="Browse"
          />
        </div>
      </Field>

      <div className="sc-grid">
        <Field label="GitHub repository" hint="Read from the origin remote when left empty.">
          <input
            className="input mono"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            placeholder="owner/name"
            aria-label="GitHub repository"
          />
        </Field>

        <Field label="Base branch" hint="The current branch when left empty.">
          <input
            className="input mono"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="main"
            aria-label="Base branch"
          />
        </Field>
      </div>

      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="sc-actions">
        <span />

        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={!project || !repo || (workspace === NEW_WORKSPACE && !workspaceName)}
        >
          Create the webhook
        </Button>
      </div>
    </form>
  );
}
