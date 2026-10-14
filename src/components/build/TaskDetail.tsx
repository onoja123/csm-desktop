import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openPath } from '@tauri-apps/plugin-opener';
import { Check, FolderOpen, Minus, RotateCcw, TerminalSquare } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { DiffView } from '@/components/build/DiffView';
import { Button, Icon, Panel, Row, StatusText } from '@/components/ui';
import { TASK_STATUS_LABEL, currentAgent, taskTone } from '@/lib/build';
import { PROVIDERS, PROVIDER_LONG_NAMES, ago, shortPath } from '@/lib/format';
import type { Build, BuildAction, BuildActionRequest, BuildAttemptStatus, BuildTask, ProviderID } from '@/types';
import { useTerminal } from '@/terminal/store';

const ATTEMPT_LABEL: Record<BuildAttemptStatus, string> = {
  running: 'Running',
  reported: 'Reported, stopping',
  completed: 'Report received',
  failed: 'Stopped without a report',
  stopped: 'Stopped',
  interrupted: 'Interrupted',
};

export function TaskDetail({ build, task: t, busy, onAct }: { build: Build; task: BuildTask; busy?: string; onAct: (a: BuildAction, req?: BuildActionRequest) => Promise<void> }) {
  const nav = useNavigate();
  const home = useTerminal((s) => s.homeDir);
  const [showDiff, setShowDiff] = useState(false);
  const [agent, setAgent] = useState<ProviderID | ''>(t.provider ?? '');
  const attempts = (build.attempts ?? []).filter((a) => a.task_id === t.id);
  const live = attempts.find((a) => build.live[a.id]);
  const now = currentAgent(build, t);
  const c = t.completion;
  const stuck = t.status === 'needs_attention' || t.status === 'failed';
  const assignable = t.status === 'ready' || t.status === 'blocked' || stuck;

  return (
    <Panel className="build-task">
      <div className="build-task__head">
        {now.provider ? <AgentIcon provider={now.provider} size="lg" /> : null}
        <div className="build-task__heading">
          <h3>{t.title}</h3>
          <StatusText tone={taskTone(t.status)} pulse={t.status === 'running'}>
            {TASK_STATUS_LABEL[t.status]}
            {t.kind === 'fix' ? ' · review fix' : ''}
          </StatusText>
        </div>
      </div>

      {t.problem ? (
        <div className="mc-attention" role="status">
          <strong>{t.problem}</strong>
          {t.recovery ? <span>{t.recovery}</span> : null}
        </div>
      ) : null}

      <div className="build-task__actions">
        {live?.run_id ? (
          <Button size="sm" icon={TerminalSquare} onClick={() => nav(`/terminal?run=${encodeURIComponent(live.run_id!)}`)}>
            Open terminal
          </Button>
        ) : null}
        {t.worktree ? (
          <Button size="sm" icon={FolderOpen} onClick={() => void openPath(t.worktree!)}>
            Open worktree
          </Button>
        ) : null}
        {t.worktree && t.base_commit ? (
          <Button size="sm" onClick={() => setShowDiff((v) => !v)}>
            {showDiff ? 'Hide diff' : 'Show diff'}
          </Button>
        ) : null}
      </div>

      {stuck || assignable ? (
        <div className="build-task__retry">
          <select className="input input--sm" value={agent} onChange={(e) => setAgent(e.target.value as ProviderID | '')} aria-label="Agent for this task">
            <option value="">Any ready agent</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LONG_NAMES[p]}
              </option>
            ))}
          </select>
          {stuck ? (
            <>
              <Button size="sm" icon={RotateCcw} onClick={() => void onAct('retry-task', { task: t.id, provider: agent || undefined })} loading={busy === 'retry-task'}>
                Retry
              </Button>
              {t.worktree ? (
                <Button size="sm" variant="ghost" onClick={() => void onAct('accept-task', { task: t.id })} loading={busy === 'accept-task'}>
                  Accept as it is
                </Button>
              ) : null}
            </>
          ) : agent && agent !== t.provider ? (
            <Button size="sm" onClick={() => void onAct('assign', { task: t.id, provider: agent })} loading={busy === 'assign'}>
              Assign
            </Button>
          ) : null}
        </div>
      ) : null}

      {showDiff ? <DiffView buildId={build.id} target={t.id} stamp={t.head ?? t.status} /> : null}

      <p className="selectable build-task__objective">{t.objective}</p>
      {t.scope ? <p className="muted selectable">{t.scope}</p> : null}
      {t.acceptance?.length ? (
        <div className="handoff-list">
          <h4>Acceptance criteria</h4>
          <ul>
            {t.acceptance.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="build-task__rows">
        <Row label="Agent">{now.provider ? `${PROVIDER_LONG_NAMES[now.provider as ProviderID]}${now.account ? ` · ${now.account}` : ''}` : 'Not assigned yet'}</Row>
        {t.depends_on?.length ? <Row label="After">{t.depends_on.join(', ')}</Row> : null}
        {t.branch ? (
          <Row label="Branch" mono>
            {t.branch}
          </Row>
        ) : null}
        {t.worktree ? (
          <Row label="Worktree" mono>
            <span className="selectable">{shortPath(t.worktree, home)}</span>
          </Row>
        ) : null}
        {t.base_commit ? (
          <Row label="Starts at" mono>
            {t.base_commit.slice(0, 8)}
          </Row>
        ) : null}
        {t.files?.length ? <Row label="Expected files">{t.files.join(', ')}</Row> : null}
      </div>

      {t.switches?.length ? (
        <div className="handoff-list">
          <h4>Recovered inside the session</h4>
          <ul>
            {t.switches.map((s) => (
              <li key={s.handoff ?? s.at}>
                {s.reason === 'usage_limit' ? 'Usage limit: ' : ''}
                {s.from} → {s.to} {s.started ? '· started' : '· not started'}
                <span className="muted"> · {ago(s.at)}</span>
                {s.commit ? <span className="muted mono"> · {s.from}'s work in {s.commit.slice(0, 8)}</span> : null}
                {s.from_session || s.to_session ? (
                  <span className="muted mono build-attempts__note">
                    {' '}
                    session {s.from_session ? s.from_session.slice(0, 8) : '?'} → {s.to_session ? s.to_session.slice(0, 8) : 'pending'}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {attempts.length ? (
        <div className="handoff-list">
          <h4>Attempts</h4>
          <ul className="build-attempts">
            {attempts.map((a) => (
              <li key={a.id}>
                <span>
                  {PROVIDER_LONG_NAMES[a.provider]}
                  {a.account ? ` · ${a.account}` : ''}
                </span>
                <span className="muted">
                  {ATTEMPT_LABEL[a.status]} · {ago(a.started_at)}
                </span>
                {a.started_as ? <span className="muted build-attempts__note">Started as {a.started_as}; moved by CSM failover</span> : null}
                {a.note ? <span className="muted build-attempts__note">{a.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {c ? (
        <>
          <div className="handoff-list">
            <h4>
              Measured by CSM<span className="handoff-list__note">from git</span>
            </h4>
            <ul>
              <li>
                {(c.files_changed ?? []).length} file{(c.files_changed ?? []).length === 1 ? '' : 's'} changed{c.commit ? ` in ${c.commit.slice(0, 8)}` : ''}
                {t.integrated ? ' · integrated' : ''}
              </li>
              {(c.files_changed ?? []).map((f) => (
                <li key={f} className="mono">
                  {f}
                </li>
              ))}
            </ul>
            {c.discrepancies?.length ? (
              <ul className="build-discrepancies">
                {c.discrepancies.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="handoff-list">
            <h4>
              Reported by the agent<span className="handoff-list__note">not verified</span>
            </h4>
            {c.report_missing ? <p className="muted">No report: you accepted this task as it was.</p> : null}
            {c.summary ? <p className="selectable">{c.summary}</p> : null}
            {c.acceptance?.length ? (
              <div className="checklist">
                {c.acceptance.map((a) => (
                  <div key={a.criterion} className="checklist__row">
                    <Icon icon={a.addressed ? Check : Minus} size="sm" className={a.addressed ? 'tone-ok' : 'tone-warn'} />
                    <span className="checklist__label">{a.criterion}</span>
                    <span className="checklist__text">{a.note}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {c.claimed_tests?.length ? <p className="muted">Tests it says it ran: {c.claimed_tests.join('; ')}</p> : null}
            {c.limitations?.length ? <p className="muted">Limitations: {c.limitations.join('; ')}</p> : null}
          </div>
        </>
      ) : null}
    </Panel>
  );
}
