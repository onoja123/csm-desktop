import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeftRight, Check, Minus } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentPair, HandoffCard, stageLabel, stageTone } from '@/components/handoffs/HandoffCard';
import { useHandoffDialog } from '@/components/handoffs/HandoffDialog';
import { mcpLabel, mcpTone } from '@/components/mcp/MCPServerCard';
import { Button, EmptyState, ErrorState, Icon, PageHeader, Panel, Row, Section, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { ago, clock, plural } from '@/lib/format';
import type { Handoff, ProviderID } from '@/lib/types';
import { useData } from '@/store/data';

export function Handoffs() {
  const { handoffs, projects } = useData();
  const openHandoff = useHandoffDialog((s) => s.open);
  const lastProject = projects.find((p) => p.exists)?.dir;
  return (
    <Page>
      <PageHeader
        title="Handoffs"
        subtitle="Task context, repository state and MCP verdicts passed from one agent to the next."
        action={
          lastProject ? (
            <Button variant="primary" icon={ArrowLeftRight} onClick={() => openHandoff({ projectDir: lastProject })}>
              New handoff
            </Button>
          ) : null
        }
      />
      {handoffs.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No handoffs yet" body="Hand a running task to another account or agent from its page, or from a session checkpoint." />
      ) : (
        <div className="list">
          {handoffs.map((h) => (
            <HandoffCard key={h.project + h.id} handoff={h} />
          ))}
        </div>
      )}
    </Page>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="handoff-list">
      <h4>{title}</h4>
      <ul>
        {items.map((i, n) => (
          <li key={n} className="selectable">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HandoffDetail() {
  const { project = '', id = '' } = useParams();
  const [handoff, setHandoff] = useState<Handoff>();
  const [error, setError] = useState<string>();
  const openHandoff = useHandoffDialog((s) => s.open);

  useEffect(() => {
    api.handoff(decodeURIComponent(project), decodeURIComponent(id)).then(setHandoff).catch((e) => setError((e as Error).message));
  }, [project, id]);

  if (error) {
    return (
      <Page>
        <ErrorState title="Handoff not found" detail={error} />
      </Page>
    );
  }

  if (!handoff) return <Page>{null}</Page>;

  const ctx = handoff.context;
  const checks = [
    { label: 'Task context', ok: !!ctx.user_requests?.length || !!ctx.last_assistant },
    { label: 'Git state', ok: !!handoff.git.root },
    { label: 'Files', ok: !!(ctx.files_modified?.length || ctx.files_created?.length || ctx.files_read?.length) },
    { label: 'MCP', ok: !!handoff.mcp?.length },
  ];

  return (
    <Page>
      <PageHeader
        title="Handoff"
        subtitle={`${clock(handoff.created_at)} · ${ago(handoff.created_at)}`}
        action={
          handoff.git.root ? (
            <Button icon={ArrowLeftRight} onClick={() => openHandoff({ projectDir: handoff.git.root!, fromProvider: handoff.target.provider as ProviderID, fromAccount: handoff.target.account })}>
              Hand off again
            </Button>
          ) : null
        }
      />
      <div className="two-col">
        <Panel className="handoff-hero">
          <AgentPair handoff={handoff} vertical />
          <StatusText tone={stageTone(handoff.stage)}>{stageLabel(handoff.stage)}</StatusText>
          {handoff.resumed ? <p className="muted">The native session was carried as well; the handoff is a safety copy.</p> : null}
          {handoff.error ? <p className="form-error selectable">{handoff.error}</p> : null}
        </Panel>
        <Panel>
          <h4 className="panel__h4">Current task</h4>
          <p className="selectable handoff-task">{ctx.user_requests?.at(-1) || ctx.note || 'Repository state only'}</p>
          <div className="checklist">
            {checks.map((c) => (
              <div key={c.label} className="checklist__row">
                <Icon icon={c.ok ? Check : Minus} size="sm" className={c.ok ? 'tone-ok' : 'tone-idle'} />
                <span className="checklist__label">{c.label}</span>
              </div>
            ))}
          </div>
          <Row label="Reason">{handoff.reason?.replace('_', ' ') || 'manual'}</Row>
          <Row label="Branch" mono>
            {handoff.git.branch || 'none'}
          </Row>
          <Row label="Working tree">
            {plural(handoff.git.staged, 'staged')}, {plural(handoff.git.unstaged, 'unstaged')}, {plural(handoff.git.untracked, 'untracked')}
          </Row>
          <Row label="Package" mono>
            {handoff.dir}
          </Row>
        </Panel>
      </div>
      {handoff.mcp?.length ? (
        <Section title="MCP">
          <Panel>
            {handoff.mcp.map((m) => (
              <Row key={m.server} label={m.server}>
                <StatusText tone={mcpTone(m.status, !!m.requires_auth)}>{mcpLabel(m.status, !!m.requires_auth)}</StatusText>
                {m.reason ? <span className="muted"> · {m.reason}</span> : null}
              </Row>
            ))}
          </Panel>
        </Section>
      ) : null}
      <Section title="Context">
        <Panel>
          <List title="Earlier requests" items={ctx.user_requests?.slice(0, -1)} />
          {ctx.last_assistant ? (
            <div className="handoff-list">
              <h4>Last progress note</h4>
              <p className="selectable">{ctx.last_assistant}</p>
            </div>
          ) : null}
          <List title="Files modified" items={ctx.files_modified} />
          <List title="Files created" items={ctx.files_created} />
          <List title="Files read" items={ctx.files_read} />
          <List title="Commands" items={ctx.commands} />
          <List title="Decisions" items={ctx.decisions} />
          <List title="Next steps" items={ctx.next_steps} />
          <List title="Recent commits" items={handoff.git.recent_commits} />
        </Panel>
      </Section>
      {handoff.markdown ? (
        <Section title="handoff.md">
          <pre className="code-block code-block--tall selectable">{handoff.markdown}</pre>
        </Section>
      ) : null}
    </Page>
  );
}
