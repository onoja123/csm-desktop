import { useState } from 'react';
import { Button } from '@/components/ui';

export function ConfirmAction({
  title,
  facts,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: {
  title: string;
  facts: string[];
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const confirm = async () => {
    setBusy(true);
    setError(undefined);

    try {
      await onConfirm();
    } catch (e) {
      setError((e as Error).message || String(e));
      setBusy(false);
    }
  };

  return (
    <div className="menubar-confirm" role="alertdialog" aria-label={title}>
      <h5 className="menubar-confirm__title">{title}</h5>

      <ul className="menubar-confirm__facts">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {error ? <p className="menubar__error selectable">{error}</p> : null}

      <div className="menubar-confirm__actions">
        <Button size="sm" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </Button>
        <Button size="sm" variant={tone} loading={busy} onClick={() => void confirm()}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
