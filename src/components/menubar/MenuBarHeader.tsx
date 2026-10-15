import { ArrowLeft01Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import { LogoMark } from '@/components/shell/LogoMark';
import { Button, Icon } from '@/components/ui';
import { desktop } from '@/lib/api';
import type { MenuBarView } from '@/types';

const TITLES: Record<MenuBarView, string> = {
  list: 'csm',
  inspector: 'Agent details',
  settings: 'Menu bar settings',
};

export function MenuBarHeader({
  view,
  summary,
  onBack,
  onSettings,
}: {
  view: MenuBarView;
  summary: string;
  onBack: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="menubar__head">
      {view === 'list' ? (
        <LogoMark size={22} />
      ) : (
        <button type="button" className="menubar-icon-btn" aria-label="Back" onClick={onBack}>
          <Icon icon={ArrowLeft01Icon} size="sm" />
        </button>
      )}

      <div className="menubar__heading">
        <span className="menubar__title">{TITLES[view]}</span>
        <span className="menubar__summary" aria-live="polite">
          {summary}
        </span>
      </div>

      {view === 'list' ? (
        <button
          type="button"
          className="menubar-icon-btn"
          aria-label="Menu bar settings"
          onClick={onSettings}
        >
          <Icon icon={Settings02Icon} size="sm" />
        </button>
      ) : null}

      <Button size="sm" onClick={() => void desktop.showMain()}>
        Open CSM
      </Button>
    </header>
  );
}
