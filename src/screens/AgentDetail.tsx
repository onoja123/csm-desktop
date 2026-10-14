import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDataTransferHorizontalIcon, ComputerTerminal01Icon, FileEditIcon, SentIcon, StopIcon, UserIcon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { ActivityItem } from '@/components/activity/ActivityItem';
import { MCPServerCard } from '@/components/mcp/MCPServerCard';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { Button, EmptyState, ErrorState, Icon, Panel, Row, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import { ago, clock, duration, liveSeconds, PROVIDER_LONG_NAMES, shortPath } from '@/lib/format';
import type { AgentDetailTab, MCPAccount } from '@/types';
import { useData } from '@/store/data';
import { useNow } from '@/hooks/useNow';

export function AgentDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const tab = (params.get('tab') as AgentDetailTab) || 'output';
  const setTab = (t: AgentDetailTab) => setParams({ tab: t }, { replace: true });
  const { runs, accounts, activity, approvals, status } = useData();
  const run = runs.runs.find((r) => r.id === id);
  const openHandoff = useHandoffDialog((s) => s.open);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mcp, setMcp] = useState<MCPAccount[]>();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  const now = useNow();
  const onResize = useCallback((cols: number, rows: number) => void api.resize(id, cols, rows).catch(() => undefined), [id]);

  useEffect(() => {
    if (tab !== 'mcp' || !run) return;
    api.mcp(run.project_dir).then(setMcp).catch(() => setMcp([]));
  }, [tab, run?.project_dir, run?.account, run]);

  const sameProvider = useMemo(() => accounts.filter((a) => run && a.provider === run.provider && a.name !== run.account && a.enabled && a.status === 'ready'), [accounts, run]);
  const pendingHere = approvals.pending.filter((a) => a.run_id === id);
  const runActivity = activity.filter((a) => a.run_id === id);

  if (!run) {
    return (
      <Page>
        <ErrorState title="This agent is no longer listed" body="It may have been cleared, or the CSM service restarted." />
      </Page>
    );
  }

  const live = run.status === 'running';

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      // Text and Enter go separately: typed in one write, the agent treats them as a paste and does not submit.
      await api.sendInput(id, message);
      await new Promise((r) => setTimeout(r, 120));
      await api.sendInput(id, '\r');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = async (name: string) => {
    setSwitching(true);
    setError(undefined);
    try {
      await api.switchAccount(name, run.project_dir);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Page wide>
      <header className="agent-head">
        <AgentIcon provider={run.provider} size="hero" />
        <div className="agent-head__main">
          <div className="agent-head__top">
            <h1>{PROVIDER_LONG_NAMES[run.provider]}</h1>
            <AgentStatus run={run} withActivity />
          </div>
          <p className="agent-head__task">{run.task.summary || run.task.note || (live ? 'Waiting for the first request' : 'No request recorded')}</p>
          <div className="agent-head__actions">
            {live ? (
              <>
                {sameProvider.length > 0 ? (
                  <div className="select-wrap">
                    <Icon icon={UserIcon} size="sm" />
                    <select className="input input--sm" value="" disabled={switching} onChange={(e) => e.target.value && void switchTo(e.target.value)}>
                      <option value="">Switch account…</option>
                      {sameProvider.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <Button icon={ArrowDataTransferHorizontalIcon} onClick={() => openHandoff({ projectDir: run.project_dir, fromProvider: run.provider, fromAccount: run.account })}>
                  Handoff
                </Button>
                <Button icon={ComputerTerminal01Icon} onClick={() => nav(`/terminal?run=${encodeURIComponent(run.id)}`)}>
                  Open in Terminal
                </Button>
                <Button variant="ghost" onClick={() => nav(`/terminal?cwd=${encodeURIComponent(run.project_dir)}`)}>
                  Shell here
                </Button>
                <Button icon={StopIcon} variant="danger" onClick={() => void api.stopRun(id)}>
                  Stop
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => void api.forgetRun(id)}>
                Clear
              </Button>
            )}
          </div>
          {error ? <p className="form-error selectable">{error}</p> : null}
        </div>
      </header>

      {pendingHere.length > 0 ? (
        <div className="list">
          {pendingHere.map((p) => (
            <ApprovalCard key={p.id} approval={p} onDecide={(d) => void api.decide(p.id, d)} />
          ))}
        </div>
      ) : null}

      <div className="agent-layout">
        <div className="agent-layout__main">
          <Tabs<AgentDetailTab>
            tabs={[
              { id: 'output', label: 'Output' },
              { id: 'files', label: 'Files', count: run.task.files_modified?.length },
              { id: 'activity', label: 'Activity', count: runActivity.length },
              { id: 'session', label: 'Session' },
              { id: 'mcp', label: 'MCP' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'output' ? (
            <div className="terminal-wrap">
              <TerminalPanel runId={id} live={live} onResize={onResize} />
              {live ? (
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <input className="input mono" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Send a message to ${PROVIDER_LONG_NAMES[run.provider]}`} spellCheck={false} />
                  <Button type="submit" icon={SentIcon} loading={busy} disabled={!message.trim()}>
                    Send
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
          {tab === 'files' ? (
            run.task.files_modified?.length ? (
              <Panel>
                <ul className="file-list">
                  {run.task.files_modified.map((f) => (
                    <li key={f} className="mono selectable">
                      <Icon icon={FileEditIcon} size="sm" /> {f}
                    </li>
                  ))}
                </ul>
                <p className="muted">Files the agent edited according to its own session record{run.task.read_at ? `, read ${ago(run.task.read_at)}` : ''}.</p>
              </Panel>
            ) : (
              <EmptyState icon={FileEditIcon} title="No files recorded" body={live ? 'The agent has not edited anything yet, or its session record is not readable.' : 'Nothing was recorded for this run.'} />
            )
          ) : null}
          {tab === 'activity' ? (
            runActivity.length ? (
              <div className="list list--tight">
                {runActivity.map((a) => (
                  <ActivityItem key={a.id} activity={a} dense />
                ))}
              </div>
            ) : (
              <p className="muted">No activity for this run yet.</p>
            )
          ) : null}
          {tab === 'session' ? (
            <Panel>
              <Row label="Session id" mono>
                {run.session_id || 'Not reported yet'}
              </Row>
              <Row label="Messages">{run.task.messages ?? 'Unknown'}</Row>
              <Row label="Started">{clock(run.started_at)}</Row>
              {run.ended_at ? <Row label="Ended">{clock(run.ended_at)}</Row> : null}
              <Row label="Duration">{duration(liveSeconds(run.started_at, run.ended_at, now))}</Row>
              <Row label="csm pid" mono>
                {run.csm_pid}
              </Row>
              <Row label="Agent pid" mono>
                {run.agent_pid ?? 'Unknown'}
              </Row>
              {run.args?.length ? (
                <Row label="Arguments" mono>
                  {run.args.join(' ')}
                </Row>
              ) : null}
            </Panel>
          ) : null}
          {tab === 'mcp' ? (
            mcp === undefined ? (
              <p className="muted">Reading MCP configuration…</p>
            ) : (
              (() => {
                const mine = mcp.find((m) => m.account === run.account);
                if (!mine || mine.error) return <p className="muted">{mine?.error ?? 'No MCP configuration found for this account.'}</p>;
                if (mine.servers.length === 0) return <p className="muted">No MCP servers configured for this account in this project.</p>;
                return (
                  <div className="list">
                    {mine.servers.map((s) => (
                      <MCPServerCard key={s.name + s.scope} server={s} />
                    ))}
                  </div>
                );
              })()
            )
          ) : null}
        </div>
        <aside className="agent-layout__side">
          <Panel>
            <Row label="Account" mono>
              {run.account}
            </Row>
            <Row label="Session" mono>
              {run.session_id ? run.session_id.slice(0, 8) : 'Unknown'}
            </Row>
            <Row label="Working directory" mono>
              {shortPath(run.project_dir, status?.service.home.replace(/\/\.csm$/, ''))}
            </Row>
            <Row label="Branch" mono>
              {run.branch || 'Not a git repository'}
            </Row>
            <Row label="Kind">{run.kind === 'handoff' ? 'Started by a handoff' : 'Interactive session'}</Row>
            <Row label="Last activity">{run.last_output_at ? ago(run.last_output_at, now) : 'No output yet'}</Row>
          </Panel>
        </aside>
      </div>
    </Page>
  );
}
