import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export function Dialog({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog__backdrop" onMouseDown={onClose}>
      <div className="dialog" style={{ width }} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <h2>{title}</h2>
          <button className="dialog__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>
  );
}
