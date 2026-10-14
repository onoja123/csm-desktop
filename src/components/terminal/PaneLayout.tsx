import { useTerminal } from '@/terminal/store';
import type { TerminalTab } from '@/types';

export function PaneLayout({ tab }: { tab: TerminalTab }) {
  const panes = useTerminal((s) => s.panes);
  const settings = useTerminal((s) => s.settings);
  return (
    <div className="pane-layout">
      <PaneNode node={tab.layout} path={[]} tab={tab} panes={panes} settings={settings} />
    </div>
  );
}
import { PaneNode } from './PaneNode';
