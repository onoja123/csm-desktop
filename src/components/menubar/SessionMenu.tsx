import { useEffect, useRef, useState } from 'react';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { openPath } from '@tauri-apps/plugin-opener';
import { Icon } from '@/components/ui';
import { desktop } from '@/lib/api';
import { sessionRoute } from '@/lib/menubar';
import type { AgentSession } from '@/types';

export function SessionMenu({
  session: s,
  onInspect,
}: {
  session: AgentSession;
  onInspect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };

    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      e.preventDefault();
      setOpen(false);
    };

    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc, true);

    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="menubar-menu" ref={ref}>
      <button
        type="button"
        className="menubar-icon-btn"
        aria-label={`More for ${s.providerName} in ${s.project}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon icon={MoreHorizontalIcon} size="sm" />
      </button>

      {open ? (
        <div className="menubar-menu__list" role="menu">
          <button type="button" role="menuitem" onClick={pick(onInspect)}>
            Details
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={pick(() => void desktop.showMain(sessionRoute(s)))}
          >
            Open in CSM
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={pick(
              () =>
                void desktop.showMain(
                  s.runId
                    ? `/terminal?run=${encodeURIComponent(s.runId)}`
                    : `/terminal?cwd=${encodeURIComponent(s.projectDir)}`,
                ),
            )}
          >
            Open a terminal
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={pick(() => void openPath(s.projectDir).catch(() => undefined))}
          >
            Show project in Finder
          </button>
        </div>
      ) : null}
    </div>
  );
}
