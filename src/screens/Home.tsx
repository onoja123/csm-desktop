import { Link } from 'react-router-dom';
import { Bot, ArrowRight } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { useStartAgent } from '@/components/agents/StartAgentDialog';
import { AccountCard } from '@/components/accounts/AccountCard';
import { TaskList } from '@/components/tasks/TaskCard';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { ActivityItem } from '@/components/activity/ActivityItem';
import { Button, EmptyState, Icon, Panel, Section, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import { useData } from '@/store/data';
import type { Tone } from '@/design/tokens';

function FailoverNote() {
  const activity = useData((s) => s.activity);
  const sw = activity.find((a) => a.kind === 'switch');
  if (!sw) return null;
  const limit = activity.find((a) => a.kind === 'usage_limit' && new Date(a.at) <= new Date(sw.at));
  return (
    <Panel className="failover-note">
      <div className="failover-note__body">
        <h3>{limit ? limit.title : 'CSM switched accounts'}</h3>
        <p>{sw.title}</p>
        {sw.detail ? <p className="failover-note__detail">Reason: {sw.detail}</p> : null}
      </div>
      <Link to="/activity" className="failover-note__link">
        Activity <Icon icon={ArrowRight} size="sm" />
      </Link>
    </Panel>
  );
}

export function Home() {
  const { status, accounts, runs, approvals, activity } = useData();
  const openStart = useStartAgent((s) => s.open);
  const live = [...runs.runs.filter((r) => r.status === 'running'), ...runs.external];
  const pending = approvals.pending;

  return (
    <Page>
      {pending.length > 0 ? (
        <Section title="Approval required" meta={pending.length > 1 ? `${pending.length} waiting` : undefined}>
          <div className="list">
            {pending.map((p) => (
              <ApprovalCard key={p.id} approval={p} onDecide={(d) => void api.decide(p.id, d)} />
            ))}
          </div>
        </Section>
      ) : null}

      <FailoverNote />

      <Section title="Agents" action={<Button variant="primary" onClick={() => openStart()}>Start agent</Button>}>
        <div className="agent-grid">
          {PROVIDERS.map((p) => {
            const info = status?.providers.find((i) => i.id === p);
            const run = live.find((r) => r.provider === p);
            const hasAccounts = accounts.some((a) => a.provider === p);
            const worst = accounts.filter((a) => a.provider === p && a.enabled).map((a) => a.health);
            let tone: Tone = 'idle';
            let label = 'Idle';
            if (run) {
              tone = 'ok';
              label = 'Running';
            } else if (!info?.installed) {
              label = 'Not installed';
            } else if (!hasAccounts) {
              label = 'No accounts';
            } else if (worst.includes('authentication_required')) {
              tone = 'err';
              label = 'Login required';
            } else if (worst.includes('rate_limited')) {
              tone = 'limit';
              label = 'Rate limited';
            } else if (worst.includes('warning')) {
              tone = 'warn';
              label = 'Warning';
            }
            const inner = (
              <>
                <AgentIcon provider={p} size="xl" />
                <div className="agent-tile__body">
                  <span className="agent-tile__name">{PROVIDER_LONG_NAMES[p]}</span>
                  <StatusText tone={tone} pulse={!!run}>
                    {label}
                  </StatusText>
                  {run ? <span className="agent-tile__task">{'task' in run && run.task.summary ? run.task.summary : 'Session open'}</span> : null}
                  {run ? <span className="agent-tile__account mono">{run.account}</span> : null}
                </div>
              </>
            );
            return run && run.kind !== 'external' ? (
              <Link key={p} to={`/agents/${run.id}`} className="agent-tile agent-tile--link">
                {inner}
              </Link>
            ) : (
              <div key={p} className={`agent-tile ${!info?.installed ? 'agent-tile--muted' : ''}`}>
                {inner}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Running tasks" meta={live.length ? String(live.length) : undefined}>
        <TaskList
          runs={live}
          empty={
            <EmptyState
              icon={Bot}
              title="No agents running"
              body="Start Claude, Codex, Gemini or Copilot to see active tasks here."
              action={<Button variant="primary" onClick={() => openStart()}>Start agent</Button>}
            />
          }
        />
      </Section>

      <div className="home__columns">
        <Section title="Accounts" action={<Link to="/accounts" className="link">All accounts</Link>}>
          {accounts.length === 0 ? (
            <p className="muted">No accounts yet. Add one with <code>csm account add &lt;name&gt;</code>.</p>
          ) : (
            <div className="list">
              {accounts.map((a) => (
                <AccountCard key={a.name} account={a} compact />
              ))}
            </div>
          )}
        </Section>
        <Section title="Recent activity" action={<Link to="/activity" className="link">All activity</Link>}>
          {activity.length === 0 ? (
            <p className="muted">Nothing has happened yet.</p>
          ) : (
            <div className="list list--tight">
              {activity.slice(0, 8).map((a) => (
                <ActivityItem key={a.id} activity={a} dense />
              ))}
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
