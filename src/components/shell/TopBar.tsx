import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Icon, Kbd } from '@/components/ui';
import { usePalette } from '@/store/palette';

export function TopBar({ title }: { title?: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const open = usePalette((s) => s.open);
  const canGoBack = loc.pathname.split('/').filter(Boolean).length > 1;
  return (
    <header className="topbar" data-tauri-drag-region>
      <div className="topbar__left">
        {canGoBack ? (
          <button className="topbar__back" onClick={() => nav(-1)} aria-label="Back">
            <Icon icon={ArrowLeft01Icon} size="md" />
          </button>
        ) : null}
        {title ? <span className="topbar__title">{title}</span> : null}
      </div>
      <button className="topbar__search" onClick={() => open()}>
        <Icon icon={Search01Icon} size="sm" />
        <span>Search or run a command</span>
        <Kbd>⌘K</Kbd>
      </button>
    </header>
  );
}
