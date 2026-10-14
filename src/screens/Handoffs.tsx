import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, Bookmark, Check, Minus, Pencil } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentPair, HandoffCard, handoffLabel, handoffTone } from '@/components/handoffs/HandoffCard';
import { useHandoffDialog } from '@/components/handoffs/HandoffDialog';
import { useCheckpointDialog } from '@/components/handoffs/CheckpointDialog';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { mcpLabel, mcpTone } from '@/components/mcp/MCPServerCard';
import { Button, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Panel, Row, Section, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { PROVIDER_LONG_NAMES, ago, clock, shortPath, shortSession } from '@/lib/format';
import { deliveryLabel, driftOf, isCheckpoint, originLabel, parseSteps, shortSha, stepsOf, taskOf } from '@/lib/checkpoint';
import type { Handoff, ProviderID } from '@/lib/types';
import { useData } from '@/store/data';
import { useTerminal } from '@/terminal/store';

export function Handoffs() {
  const { handoffs } = useData();
  const openHandoff = useHandoffDialog((s) => s.open);
  const openCheckpoint = useCheckpointDialog((s) => s.open);
  const projects = useData((s) => s.projects);
  const lastProject = projects.find((p) => p.exists)?.dir;
  const checkpoints = handoffs.filter(isCheckpoint);
  const history = handoffs.filter((h) => !isCheckpoint(h));

  return (
    <Page>
      <PageHeader
        title="Handoffs"
        subtitle="Save what an agent is working on, check it, and continue with another agent without explaining it again."
        action={
          <div className="page__actions">
            {lastProject ? (
              <Button icon={ArrowLeftRight} onClick={() => openHandoff({ projectDir: lastProject })}>
                New handoff
              </Button>
            ) : null}
            <Button variant="primary" icon={Bookmark} onClick={() => openCheckpoint()}>
              Save checkpoint
            </Button>
          </div>
        }
      />
      {handoffs.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No checkpoints yet"
          body="Save a checkpoint while an agent works on a task. CSM records the task, the files it touched and the repository state, so another agent can pick it up."
          action={
            <Button variant="primary" icon={Bookmark} onClick={() => openCheckpoint()}>
              Save checkpoint
            </Button>
          }
        />
      ) : (
        <>
          <Section title="Checkpoints" meta={checkpoints.length ? String(checkpoints.length) : undefined}>
            {checkpoints.length ? (
              <div className="list">
                {checkpoints.map((h) => (
                  <HandoffCard key={h.project + h.id} handoff={h} />
                ))}
              </div>
            ) : (
              <p className="muted">No saved checkpoints. Handoffs below were captured at the moment of the switch.</p>
            )}
          </Section>
          {history.length ? (
            <Section title="Handoffs" meta={String(history.length)}>
              <div className="list">
                {history.map((h) => (
                  <HandoffCard key={h.project + h.id} handoff={h} />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </Page>
  );
}

function List({ title, items, note }: { title: string; items?: string[]; note?: string }) {
  if (!items?.length) return null;
  return (
    <div className="handoff-list">
      <h4>
        {title}
        {note ? <span className="handoff-list__note">{note}</span> : null}
      </h4>
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

function Steps({ steps }: { steps: string[] }) {
  if (!steps.length) return <p className="muted">No next steps recorded. Add them so the next agent knows where to start.</p>;
  return (
    <ol className="handoff-steps">
      {steps.map((s, i) => (
        <li key={i} className="selectable">
          {s}
        </li>
      ))}
    </ol>
  );
}

function EditForm({ handoff, onSaved, onCancel }: { handoff: Handoff; onSaved: (h: Handoff) => void; onCancel: () => void }) {
  const [task, setTask] = useState(taskOf(handoff).text ?? '');
  const [steps, setSteps] = useState(stepsOf(handoff).join('\n'));
  const [notes, setNotes] = useState(handoff.edits?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onSaved(await api.editCheckpoint(handoff.project, handoff.id, { task: task.trim(), next_steps: parseSteps(steps), notes: notes.trim() }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="checkpoint-edit"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span className="field__label">Task</span>
        <textarea className="input input--area" rows={2} value={task} onChange={(e) => setTask(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Next steps, one per line</span>
        <textarea className="input input--area mono" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Notes for the next agent</span>
        <textarea className="input input--area" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Constraints, decisions, what not to try again" />
        <span className="field__hint">Your edits are kept next to what CSM extracted; the session record is not changed. Secrets are redacted.</span>
      </label>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="panel__actions">
        <Button type="submit" variant="primary" loading={busy}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function RepoPanel({ handoff, home }: { handoff: Handoff; home: string }) {
  const g = handoff.git;
  const current = handoff.current;
  const drift = current ? driftOf(current) : [];
  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Repository</h3>
          <span className="panel__meta">verified by CSM</span>
        </div>
      </div>
      {g.root ? (
        <>
          <Row label="Path" mono>
            {shortPath(g.root, home)}
          </Row>
          <Row label="Branch" mono>
            {g.branch || '(detached HEAD)'}
          </Row>
          {g.head ? (
            <Row label="HEAD" mono>
              {shortSha(g.head)} <span className="muted">{g.head_subject}</span>
            </Row>
          ) : null}
          <Row label="Working tree">
            {g.staged} staged, {g.unstaged} unstaged, {g.untracked} untracked
          </Row>
          {current ? (
            <div className={`repo-now ${drift.length ? 'repo-now--drift' : ''}`} role="status">
              <Icon icon={drift.length ? AlertTriangle : Check} size="sm" className={drift.length ? 'tone-warn' : 'tone-ok'} />
              <div>
                {drift.length ? drift.map((d) => <p key={d}>{d}</p>) : <p>The repository still matches this checkpoint.</p>}
                <p className="muted">Checked {ago(current.checked_at)}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted">Not a git repository. Only the task context was saved.</p>
      )}
    </Panel>
  );
}

function CheckpointDetail({ handoff, onChange }: { handoff: Handoff; onChange: (h: Handoff) => void }) {
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
            <Button variant="primary" icon={ArrowLeftRight} onClick={() => openHandoff({ projectDir, fromProvider: (handoff.source.provider || undefined) as ProviderID | undefined, fromAccount: handoff.source.account, checkpointId: handoff.id })}>
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
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
            </div>
            {editing ? (
              <EditForm
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
                <Steps steps={steps} />
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
              <List title="Files modified" items={ctx.files_modified} />
              <List title="Files created" items={ctx.files_created} />
              <List title="Files deleted" items={ctx.files_deleted} />
              <List title="Decisions" items={ctx.decisions} />
              <List title="Commands run" items={ctx.commands} note="a record; never run again by CSM" />
              <List title="Earlier requests" items={ctx.user_requests?.slice(0, -1)} />
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

function OutcomePanel({ handoff }: { handoff: Handoff }) {
  const o = handoff.outcome;
  if (!o) return null;
  const checks = [
    { label: 'Brief delivered', ok: o.delivery === 'opening_instruction', text: deliveryLabel(o) },
    { label: 'Agent started', ok: o.started, text: o.started ? `${ago(o.started_at)}${o.project_dir ? ` in ${o.project_dir.split('/').pop()}` : ''}` : handoff.error || 'did not start' },
    { label: 'Repository', ok: driftOf(o.verification).length === 0, text: driftOf(o.verification).length ? 'changed since the checkpoint' : 'matched the checkpoint' },
  ];
  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Outcome</h3>
          <span className="panel__meta">observed by CSM</span>
        </div>
        <StatusText tone={handoffTone(handoff)}>{handoffLabel(handoff)}</StatusText>
      </div>
      <div className="checklist">
        {checks.map((c) => (
          <div key={c.label} className="checklist__row">
            <Icon icon={c.ok ? Check : Minus} size="sm" className={c.ok ? 'tone-ok' : 'tone-warn'} />
            <span className="checklist__label">{c.label}</span>
            <span className="checklist__text">{c.text}</span>
          </div>
        ))}
      </div>
      {o.problems?.length ? (
        <ul className="outcome-problems">
          {o.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <p className="muted outcome-note">CSM can see that the agent started with the brief. Whether it followed the brief shows in its terminal.</p>
    </Panel>
  );
}

export function HandoffDetail() {
  const { project = '', id = '' } = useParams();
  const [handoff, setHandoff] = useState<Handoff>();
  const [error, setError] = useState<string>();
  const openHandoff = useHandoffDialog((s) => s.open);
  const version = useData((s) => s.handoffs.find((h) => h.project === decodeURIComponent(project) && h.id === decodeURIComponent(id)));
  const stamp = version ? `${version.stage}|${version.updated_at ?? ''}|${version.outcome?.status ?? ''}` : '';

  const load = useCallback(() => {
    api
      .handoff(decodeURIComponent(project), decodeURIComponent(id))
      .then(setHandoff)
      .catch((e) => setError((e as Error).message));
  }, [project, id]);

  useEffect(() => {
    load();
  }, [load, stamp]);

  if (error) {
    return (
      <Page>
        <ErrorState title="Checkpoint not found" body="It may have been removed, or the file is damaged." detail={error} />
      </Page>
    );
  }

  if (!handoff) return <Page><LoadingState label="Reading checkpoint" /></Page>;

  if (isCheckpoint(handoff)) return <CheckpointDetail handoff={handoff} onChange={setHandoff} />;

  const ctx = handoff.context;
  const { text } = taskOf(handoff);
  const home = useTerminal.getState().homeDir;

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
          <p className="muted">{handoff.reason === 'usage_limit' ? 'Started automatically after a usage limit' : handoff.reason === 'manual_switch' ? 'Requested by you' : handoff.reason ? handoff.reason.replace(/_/g, ' ') : 'Requested by you'}</p>
          {handoff.resumed ? <p className="muted">The native session was carried as well; the handoff is a safety copy.</p> : null}
          {handoff.source.session_id || handoff.target.session_id ? (
            <p className="muted mono selectable">
              session {handoff.source.session_id ? shortSession(handoff.source.session_id) : 'unknown'} → {handoff.target.session_id ? shortSession(handoff.target.session_id) : 'not recorded yet'}
            </p>
          ) : null}
          {handoff.source_commit ? (
            <p className="muted">
              {handoff.source.provider}/{handoff.source.account}'s work was committed as <span className="mono selectable">{handoff.source_commit.slice(0, 8)}</span> before the switch
            </p>
          ) : null}
          {handoff.checkpoint ? (
            <p className="muted">
              Continued checkpoint <span className="mono">{handoff.checkpoint}</span>
              {' · '}
              <Link className="link" to={`/handoffs/${encodeURIComponent(handoff.project)}/${encodeURIComponent(handoff.checkpoint)}`}>
                Open
              </Link>
            </p>
          ) : null}
          {handoff.error ? <p className="form-error selectable">{handoff.error}</p> : null}
        </Panel>
        {handoff.outcome ? (
          <OutcomePanel handoff={handoff} />
        ) : (
          <Panel>
            <StatusText tone={handoffTone(handoff)}>{handoffLabel(handoff)}</StatusText>
          </Panel>
        )}
      </div>
      <div className="two-col">
        <Panel>
          <h4 className="panel__h4">Task</h4>
          <p className="selectable handoff-task">{text || ctx.note || 'Repository state only'}</p>
          <h4 className="panel__h4 checkpoint-subhead">Next steps</h4>
          <Steps steps={stepsOf(handoff)} />
        </Panel>
        <RepoPanel handoff={handoff} home={home} />
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
      <Section title="Context" meta="reported by the agent's session record">
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
          <List title="Recent commits" items={handoff.git.recent_commits} />
        </Panel>
      </Section>
      {handoff.markdown ? (
        <details className="checkpoint-brief">
          <summary>Brief the agent received (handoff.md)</summary>
          <pre className="code-block code-block--tall selectable">{handoff.markdown}</pre>
        </details>
      ) : null}
    </Page>
  );
}
