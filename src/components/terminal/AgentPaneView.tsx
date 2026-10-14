import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { TerminalPanel } from './TerminalPanel';
import { useData } from '@/store/data';

export function AgentPaneView({ runId, active, onFocus }: { runId: string; active: boolean; onFocus: () => void }) {
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
