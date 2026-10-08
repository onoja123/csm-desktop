import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, Check, Minus } from 'lucide-react';
import { create } from 'zustand';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Button, Dialog, Field, Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { PROVIDER_LONG_NAMES, PROVIDER_NAMES } from '@/lib/format';
import type { HandoffPreview, ProviderID } from '@/lib/types';
import { useData } from '@/store/data';

interface HandoffDialogState {
  isOpen: boolean;
  projectDir?: string;
  fromProvider?: ProviderID;
  fromAccount?: string;
  open: (opts: { projectDir: string; fromProvider?: ProviderID; fromAccount?: string }) => void;
  close: () => void;
}

export const useHandoffDialog = create<HandoffDialogState>((set) => ({
  isOpen: false,
  open: (opts) => set({ isOpen: true, ...opts }),
  close: () => set({ isOpen: false }),
}));

export function HandoffDialog() {
  const { isOpen, close, projectDir, fromProvider, fromAccount } = useHandoffDialog();
  const nav = useNavigate();
  const accounts = useData((s) => s.accounts);
  const [target, setTarget] = useState('');
  const [preview, setPreview] = useState<HandoffPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const candidates = useMemo(() => accounts.filter((a) => a.name !== fromAccount && a.enabled && a.status !== 'not authenticated'), [accounts, fromAccount]);

  useEffect(() => {
    if (!isOpen) return;
    setError(undefined);
    setPreview(undefined);
    const other = candidates.find((a) => a.provider !== fromProvider) ?? candidates[0];
    setTarget(other?.name ?? '');
  }, [isOpen, candidates, fromProvider]);

  useEffect(() => {
    if (!isOpen || !target || !projectDir) return;
    let cancelled = false;
    api
      .previewHandoff(projectDir, target)
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [isOpen, target, projectDir]);

  const go = async () => {
    if (!projectDir) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.createHandoff(projectDir, target);
      close();
      if (res.run_id) nav(`/agents/${res.run_id}`);
      else nav('/handoffs');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const targetAccount = accounts.find((a) => a.name === target);
  const checks = preview
    ? [
        { label: 'Task context', ok: !preview.task_context.startsWith('none'), text: preview.task_context },
        { label: 'Git state', ok: preview.git_state !== 'not a git repository', text: preview.git_state },
        { label: 'Files', ok: preview.mode !== 'fresh', text: preview.mode === 'fresh' ? 'nothing recorded' : 'captured with the context' },
        { label: 'MCP', ok: true, text: 'configuration carried where the target supports it' },
      ]
    : [];

  return (
    <Dialog open={isOpen} onClose={close} title="Handoff">
      <div className="handoff-dialog__pair">
        <div className="handoff-dialog__agent">
          <AgentIcon provider={preview?.source ?? fromProvider} size="xl" />
          <span>
            {preview?.source || fromProvider ? PROVIDER_NAMES[(preview?.source ?? fromProvider) as ProviderID] : 'No previous agent'}
            {preview?.source_account || fromAccount ? <span className="mono"> {preview?.source_account ?? fromAccount}</span> : null}
          </span>
        </div>
        <Icon icon={ArrowDown} size="lg" />
        <div className="handoff-dialog__agent">
          <AgentIcon provider={targetAccount?.provider} size="xl" />
          <span>
            {targetAccount ? PROVIDER_NAMES[targetAccount.provider] : '—'}
            {targetAccount ? <span className="mono"> {targetAccount.name}</span> : null}
          </span>
        </div>
      </div>
      <Field label="Continue with">
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {candidates.map((a) => (
            <option key={a.name} value={a.name}>
              {PROVIDER_LONG_NAMES[a.provider]} · {a.name}
            </option>
          ))}
        </select>
      </Field>
      {preview ? (
        <div className="checklist">
          {checks.map((c) => (
            <div key={c.label} className="checklist__row">
              <Icon icon={c.ok ? Check : Minus} size="sm" className={c.ok ? 'tone-ok' : 'tone-idle'} />
              <span className="checklist__label">{c.label}</span>
              <span className="checklist__text">{c.text}</span>
            </div>
          ))}
          <p className="dialog__note">{preview.message}</p>
        </div>
      ) : null}
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="dialog__actions">
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={() => void go()} loading={busy} disabled={!target || !preview || preview.mode === 'none'}>
          Continue with {targetAccount ? PROVIDER_NAMES[targetAccount.provider] : '…'}
        </Button>
      </div>
    </Dialog>
  );
}
