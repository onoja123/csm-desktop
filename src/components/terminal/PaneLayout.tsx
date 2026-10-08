import { useCallback, useRef } from 'react';
import { ShellTerminal } from './ShellTerminal';
import { TerminalPanel } from './TerminalPanel';
import { useTerminal } from '@/terminal/store';
import type { LayoutNode, Pane, Tab, TerminalSettings } from '@/terminal/types';
import { useData } from '@/store/data';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

function AgentPaneView({ runId, active, onFocus }: { runId: string; active: boolean; onFocus: () => void }) {
  const run = useData((s) => s.runs.runs.find((r) => r.id === runId));
  const nav = useNavigate();
  return (
    <div className={`shell-pane ${active ? 'shell-pane--active' : ''}`} onMouseDown={onFocus}>
      {run ? (
        <div className="agent-pane">
          <TerminalPanel runId={runId} live={run.status === 'running'} />
          <div className="agent-pane__bar">
            <span>
              {run.provider} · {run.account} · {run.status}
            </span>
            <Button size="sm" variant="ghost" onClick={() => nav(`/agents/${runId}`)}>
              Open agent
            </Button>
          </div>
        </div>
      ) : (
        <div className="shell-pane__exited">
          <span>This agent is no longer listed.</span>
        </div>
      )}
    </div>
  );
}

function Gutter({ direction, onDrag }: { direction: 'row' | 'column'; onDrag: (delta: number) => void }) {
  const start = useRef<{ pos: number; size: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    start.current = { pos: direction === 'row' ? e.clientX : e.clientY, size: direction === 'row' ? parent.width : parent.height };
    const move = (ev: MouseEvent) => {
      if (!start.current) return;
      const now = direction === 'row' ? ev.clientX : ev.clientY;
      onDrag((now - start.current.pos) / start.current.size);
      start.current.pos = now;
    };
    const up = () => {
      start.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = direction === 'row' ? 'col-resize' : 'row-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return <div className={`gutter gutter--${direction}`} onMouseDown={onMouseDown} role="separator" aria-orientation={direction === 'row' ? 'vertical' : 'horizontal'} />;
}

function Node({ node, path, tab, panes, settings }: { node: LayoutNode; path: number[]; tab: Tab; panes: Record<string, Pane>; settings: TerminalSettings }) {
  const resize = useTerminal((s) => s.resize);
  const focusPane = useTerminal((s) => s.focusPane);
  const onDrag = useCallback((index: number, delta: number) => resize(tab.id, path, index, delta), [resize, tab.id, path]);

  if (node.type === 'leaf') {
    const pane = panes[node.paneId];
    if (!pane) return null;
    const active = tab.activePaneId === pane.id;
    if (pane.kind === 'agent') return <AgentPaneView runId={pane.runId} active={active} onFocus={() => focusPane(pane.id)} />;
    return <ShellTerminal pane={pane} active={active} settings={settings} />;
  }

  return (
    <div className={`split split--${node.direction}`}>
      {node.children.map((child, i) => (
        <div key={i} className="split__cell" style={{ flexBasis: 0, flexGrow: node.sizes[i] * 1000 }}>
          <Node node={child} path={[...path, i]} tab={tab} panes={panes} settings={settings} />
          {i < node.children.length - 1 ? <Gutter direction={node.direction} onDrag={(d) => onDrag(i, d)} /> : null}
        </div>
      ))}
    </div>
  );
}

export function PaneLayout({ tab }: { tab: Tab }) {
  const panes = useTerminal((s) => s.panes);
  const settings = useTerminal((s) => s.settings);
  return (
    <div className="pane-layout">
      <Node node={tab.layout} path={[]} tab={tab} panes={panes} settings={settings} />
    </div>
  );
}
