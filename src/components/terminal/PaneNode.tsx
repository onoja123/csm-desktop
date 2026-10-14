import { useCallback } from 'react';
import { AgentPaneView } from './AgentPaneView';
import { ShellTerminal } from './ShellTerminal';
import { SplitGutter } from './SplitGutter';
import { useTerminal } from '@/terminal/store';
import type { LayoutNode, PaneMap, TerminalSettings, TerminalTab } from '@/types';

export function PaneNode({
  node,
  path,
  tab,
  panes,
  settings,
}: {
  node: LayoutNode;
  path: number[];
  tab: TerminalTab;
  panes: PaneMap;
  settings: TerminalSettings;
}) {
  const resize = useTerminal((s) => s.resize);
  const focusPane = useTerminal((s) => s.focusPane);

  const onDrag = useCallback(
    (index: number, delta: number) => resize(tab.id, path, index, delta),
    [resize, tab.id, path],
  );

  if (node.type === 'leaf') {
    const pane = panes[node.paneId];

    if (!pane) return null;

    const active = tab.activePaneId === pane.id;

    if (pane.kind === 'agent')
      return (
        <AgentPaneView runId={pane.runId} active={active} onFocus={() => focusPane(pane.id)} />
      );

    return <ShellTerminal pane={pane} active={active} settings={settings} />;
  }

  return (
    <div className={`split split--${node.direction}`}>
      {node.children.map((child, i) => (
        <div
          key={i}
          className="split__cell"
          style={{ flexBasis: 0, flexGrow: node.sizes[i] * 1000 }}
        >
          <PaneNode node={child} path={[...path, i]} tab={tab} panes={panes} settings={settings} />

          {i < node.children.length - 1 ? (
            <SplitGutter direction={node.direction} onDrag={(d) => onDrag(i, d)} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
