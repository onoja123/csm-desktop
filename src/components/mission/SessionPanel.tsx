import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bookmark, ExternalLink, FolderOpen, Play, Square, TerminalSquare, UserRound, Workflow, X } from 'lucide-react';
import { openPath } from '@tauri-apps/plugin-opener';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { useCheckpointDialog } from '@/store/checkpoint-dialog';
import { Button, Icon, Row, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { ago, clock, duration, liveSeconds, shortPath, shortSession } from '@/lib/format';
import { statusTone } from '@/lib/mission';
import { useData } from '@/store/data';
import { useTerminal } from '@/terminal/store';
import type { AgentSession } from '@/types';

export function SessionPanel({ session: s, now, onClose }: { session: AgentSession; now: number; onClose: () => void }) {
  const nav = useNavigate();
  const accounts = useData((st) => st.accounts);
  const homeDir = useTerminal((st) => st.homeDir);
  const openHandoff = useHandoffDialog((st) => st.open);
  const openCheckpoint = useCheckpointDialog((st) => st.open);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const sameProvider = useMemo(() => accounts.filter((a) => a.provider === s.provider && a.name !== s.account && a.enabled && a.status === 'ready'), [accounts, s.provider, s.account]);

  const attempt = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const goToTerminal = () => {
    if (s.terminal) {
      const term = useTerminal.getState();
      term.activateTab(s.terminal.tabId);
      term.focusPane(s.terminal.paneId);
      nav('/terminal');
      return;
    }
    if (s.runId) nav(`/terminal?run=${encodeURIComponent(s.runId)}`);
  };

  const terminalLabel = s.terminal ? `Go to tab ${s.terminal.tabIndex}` : s.observable ? 'Open in Terminal' : undefined;

  return (
    <aside className="mc-panel" aria-label="Session details">
      <div className="mc-panel__head">
        <AgentIcon provider={s.provider} size="lg" tone={s.status === 'attention' ? 'err' : s.status === 'waiting' ? 'warn' : undefined} />
        <div className="mc-panel__heading">
          <h3>{s.providerName}</h3>
          <StatusText tone={statusTone(s.status)} pulse={s.status === 'running'}>
            {s.label}
          </StatusText>
        </div>
        <button className="mc-panel__close" onClick={onClose} aria-label="Close details">
          <Icon icon={X} size="sm" />
        </button>
      </div>

      <p className={`mc-panel__task ${s.title ? '' : 'muted'}`}>{s.title ?? (s.observable ? 'No request recorded for this session.' : 'This session runs in its own terminal; CSM sees its account and project but not its output.')}</p>

      {s.attention ? (
        <div className="mc-attention" role="status">
          <strong>{s.attention.reason}</strong>
          {s.attention.detail ? <span>{s.attention.detail}</span> : null}
        </div>
      ) : null}

      {s.approval ? <ApprovalCard approval={s.approval} onDecide={(d) => void attempt('approval', () => api.decide(s.approval!.id, d))} busy={busy === 'approval'} /> : null}

      <div className="mc-panel__actions">
        {terminalLabel ? (
          <Button icon={TerminalSquare} variant="primary" onClick={goToTerminal}>
            {terminalLabel}
          </Button>
        ) : null}
        {s.runId ? (
          <Button icon={ExternalLink} onClick={() => nav(`/agents/${s.runId}`)}>
            Details
          </Button>
        ) : null}
        {s.buildId ? (
          <Button icon={Workflow} onClick={() => nav(`/build/${s.buildId}`)}>
            Build run
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => nav(`/terminal?cwd=${encodeURIComponent(s.projectDir)}`)}>
          Shell here
        </Button>
        <Button variant="ghost" icon={FolderOpen} onClick={() => void attempt('reveal', () => openPath(s.projectDir))} loading={busy === 'reveal'}>
          Reveal
        </Button>
      </div>

      {s.live ? (
        <div className="mc-panel__actions">
          {sameProvider.length > 0 ? (
            <div className="select-wrap">
              <Icon icon={UserRound} size="sm" />
              <select className="input input--sm" value="" disabled={busy === 'switch'} aria-label="Switch account" onChange={(e) => e.target.value && void attempt('switch', () => api.switchAccount(e.target.value, s.projectDir))}>
                <option value="">Switch account…</option>
                {sameProvider.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Button size="sm" icon={Bookmark} onClick={() => openCheckpoint({ projectDir: s.projectDir })}>
            Checkpoint
          </Button>
          <Button size="sm" icon={ArrowLeftRight} onClick={() => openHandoff({ projectDir: s.projectDir, fromProvider: s.provider, fromAccount: s.account })}>
            Handoff
          </Button>
          {s.runId ? (
            <Button size="sm" icon={Square} variant="danger" onClick={() => void attempt('stop', () => api.stopRun(s.runId!))} loading={busy === 'stop'}>
              Stop
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mc-panel__actions">
          {s.canResume ? (
            <Button
              size="sm"
              icon={Play}
              onClick={() =>
                void attempt('resume', async () => {
                  const run = await api.resumeSession({ provider: s.provider, project_dir: s.projectDir, session_id: s.sessionId! });
                  nav(`/agents/${run.id}`);
                })
              }
              loading={busy === 'resume'}
            >
              Resume
            </Button>
          ) : null}
          {s.runId ? (
            <Button size="sm" variant="ghost" onClick={() => void attempt('clear', () => api.forgetRun(s.runId!))} loading={busy === 'clear'}>
              Clear
            </Button>
          ) : null}
        </div>
      )}

      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="mc-panel__rows">
        <Row label="Account" mono>
          {s.account}
        </Row>
        {s.switched ? (
          <Row label="Switched">
            <span className="mono">{s.switched.from}</span> → <span className="mono">{s.switched.to}</span>
            <span className="muted">
              {s.switched.reason ? `${s.switched.reason} · ` : ''}
              {ago(s.switched.at, now)}
            </span>
          </Row>
        ) : null}
        <Row label="Project" mono>
          {shortPath(s.projectDir, homeDir)}
        </Row>
        <Row label="Branch" mono>
          {s.branch || 'Not a git repository'}
        </Row>
        <Row label="Session" mono>
          {s.sessionId ? shortSession(s.sessionId) : 'Not reported yet'}
        </Row>
        <Row label="Terminal">{s.terminal ? `Tab ${s.terminal.tabIndex}${s.terminal.kind === 'shell' ? ' (shell in this project)' : ''}` : s.observable ? 'Not open as a tab' : 'Outside CSM Desktop'}</Row>
        <Row label="Started">{clock(s.startedAt)}</Row>
        <Row label="Elapsed">{duration(liveSeconds(s.startedAt, s.endedAt, now))}</Row>
        {s.observable ? <Row label="Last output">{s.lastOutputAt ? ago(s.lastOutputAt, now) : 'No output yet'}</Row> : null}
        {s.observable ? <Row label="Files edited">{s.filesModified || 'None recorded'}</Row> : null}
        {s.exitCode !== undefined ? <Row label="Exit status">{s.exitCode}</Row> : null}
        <Row label="Kind">{s.kind === 'external' ? 'Started in a terminal' : s.kind === 'handoff' ? 'Started by a handoff' : 'Started from CSM Desktop'}</Row>
      </div>
    </aside>
  );
}
