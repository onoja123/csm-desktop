import { useState } from 'react';
import { ArrowDataTransferHorizontalIcon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { mcpLabel, mcpTone } from '@/lib/mcp';
import { Button, PageHeader, Panel, Row, Section, StatusText, TitledList } from '@/components/ui';
import { CheckpointEditForm } from './CheckpointEditForm';
import { NextSteps } from './NextSteps';
import { RepoPanel } from './RepoPanel';
import { ago, clock, PROVIDER_LONG_NAMES, shortSession } from '@/lib/format';
import { originLabel, stepsOf, taskOf } from '@/lib/checkpoint';
import { useTerminal } from '@/terminal/store';
import type { Handoff, ProviderID } from '@/types';

export function CheckpointDetail({ handoff, onChange }: { handoff: Handoff; onChange: (h: Handoff) => void }) {
  const openHandoff = useHandoffDialog((s) => s.open);
  const home = useTerminal((s) => s.homeDir);
  const [editing, setEditing] = useState(false);
  const { text, origin } = taskOf(handoff);
  const ctx = handoff.context;
  const projectDir = handoff.git.root || handoff.git.working_dir;
  const steps = stepsOf(handoff);

  return (
    <Page>
      <PageHeader
        title="Checkpoint"
        subtitle={`${handoff.git.root ? handoff.git.root.split('/').pop() + ' · ' : ''}saved ${ago(handoff.created_at)}${handoff.edits?.edited_at ? ` · edited ${ago(handoff.edits.edited_at)}` : ''}`}
        action={
          projectDir ? (
            <Button variant="primary" icon={ArrowDataTransferHorizontalIcon} onClick={() => openHandoff({ projectDir, fromProvider: (handoff.source.provider || undefined) as ProviderID | undefined, fromAccount: handoff.source.account, checkpointId: handoff.id })}>
              Continue with another agent
            </Button>
          ) : null
        }
      />
      <div className="checkpoint-layout">
        <div className="checkpoint-layout__main">
          <Panel>
            <div className="panel__header">
              <div className="panel__title">
                <h3>Task</h3>
                <span className="panel__meta">{originLabel(handoff)}</span>
              </div>
              {!editing ? (
                <Button size="sm" variant="ghost" icon={PencilEdit01Icon} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
            </div>
            {editing ? (
              <CheckpointEditForm
                handoff={handoff}
                onCancel={() => setEditing(false)}
                onSaved={(h) => {
                  onChange(h);
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <p className={`checkpoint-task selectable ${origin === 'none' ? 'muted' : ''}`}>{text ?? 'Not recorded'}</p>
                <h4 className="panel__h4 checkpoint-subhead">Next steps</h4>
                <NextSteps steps={steps} />
                {handoff.edits?.notes ? (
                  <>
                    <h4 className="panel__h4 checkpoint-subhead">Notes</h4>
                    <p className="selectable checkpoint-notes">{handoff.edits.notes}</p>
                  </>
                ) : null}
              </>
            )}
          </Panel>
          <Section title="Progress" meta="reported by the agent's session record">
            <Panel>
              {ctx.last_assistant ? (
                <div className="handoff-list">
                  <h4>Last progress note</h4>
                  <p className="selectable">{ctx.last_assistant}</p>
                </div>
              ) : null}
              <TitledList title="Files modified" items={ctx.files_modified} />
              <TitledList title="Files created" items={ctx.files_created} />
              <TitledList title="Files deleted" items={ctx.files_deleted} />
              <TitledList title="Decisions" items={ctx.decisions} />
              <TitledList title="Commands run" items={ctx.commands} note="a record; never run again by CSM" />
              <TitledList title="Earlier requests" items={ctx.user_requests?.slice(0, -1)} />
              {!ctx.last_assistant && !ctx.files_modified?.length && !ctx.commands?.length ? <p className="muted">{ctx.note || 'Nothing was recorded by the agent.'}</p> : null}
            </Panel>
          </Section>
        </div>
        <aside className="checkpoint-layout__side">
          <Panel>
            <div className="checkpoint-source">
              <AgentIcon provider={handoff.source.provider || undefined} size="lg" />
              <div>
                <strong>{handoff.source.provider ? PROVIDER_LONG_NAMES[handoff.source.provider as ProviderID] ?? handoff.source.provider : 'No agent recorded'}</strong>
                {handoff.source.account ? <span className="mono muted"> {handoff.source.account}</span> : null}
                <p className="muted mono">{handoff.source.session_id ? `session ${shortSession(handoff.source.session_id)}` : 'no session'}</p>
              </div>
            </div>
            <Row label="Saved">{clock(handoff.created_at)}</Row>
            <Row label="Completeness">{handoff.completeness === 'complete' ? 'Complete' : 'Partial'}</Row>
            <Row label="ID" mono>
              {handoff.id}
            </Row>
          </Panel>
          <RepoPanel handoff={handoff} home={home} />
          {handoff.mcp?.length ? (
            <Panel>
              <div className="panel__header">
                <div className="panel__title">
                  <h3>MCP servers</h3>
                  <span className="panel__meta">names and status only</span>
                </div>
              </div>
              {handoff.mcp.map((m) => (
                <Row key={m.server} label={m.server}>
                  <StatusText tone={mcpTone(m.status, !!m.requires_auth)}>{mcpLabel(m.status, !!m.requires_auth)}</StatusText>
                </Row>
              ))}
            </Panel>
          ) : null}
        </aside>
      </div>
      {handoff.markdown ? (
        <details className="checkpoint-brief">
          <summary>Brief the next agent reads (handoff.md)</summary>
          <pre className="code-block code-block--tall selectable">{handoff.markdown}</pre>
        </details>
      ) : null}
    </Page>
  );
}
