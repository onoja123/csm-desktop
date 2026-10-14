import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui';
import { paneIds } from '@/terminal/layout';
import { useTerminal } from '@/terminal/store';

export function TerminalTabs() {
  const { tabs, panes, activeTabId, activateTab, closeTab, newTab, homeDir } = useTerminal();
  return (
    <div className="term-tabs" data-tauri-drag-region>
      <div className="term-tabs__list" role="tablist">
        {tabs.map((t, i) => {
          const pane = panes[t.activePaneId] ?? panes[paneIds(t.layout)[0]];
          const title = pane?.title ?? 'shell';
          const sub = pane?.kind === 'shell' ? (homeDir && pane.cwd.startsWith(homeDir) ? '~' + pane.cwd.slice(homeDir.length) : pane.cwd) : 'agent';
          const count = paneIds(t.layout).length;
          return (
            <div key={t.id} role="tab" aria-selected={t.id === activeTabId} className={`term-tab ${t.id === activeTabId ? 'term-tab--active' : ''}`} onMouseDown={() => activateTab(t.id)} title={sub}>
              <span className="term-tab__index">{i + 1}</span>
              <span className="term-tab__title">{title}</span>
              {count > 1 ? <span className="term-tab__count">{count}</span> : null}
              <button
                className="term-tab__close"
                aria-label="Close terminal"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  void closeTab(t.id);
                }}
              >
                <Icon icon={Cancel01Icon} size="sm" />
              </button>
            </div>
          );
        })}
        <button className="term-tabs__new" aria-label="New terminal" onClick={() => void newTab()}>
          <Icon icon={PlusSignIcon} size="sm" />
        </button>
      </div>
    </div>
  );
}
