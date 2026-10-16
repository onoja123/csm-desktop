import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDataTransferHorizontalIcon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { AgentPair } from '@/components/handoffs/AgentPair';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { mcpLabel, mcpTone } from '@/lib/mcp';
import { HandoffSkills } from '@/components/skills/HandoffSkills';
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  Row,
  Section,
  StatusText,
  TitledList,
} from '@/components/ui';
import { CheckpointDetail } from '@/components/handoffs/CheckpointDetail';
import { HandoffOutcomePanel } from '@/components/handoffs/HandoffOutcomePanel';
import { NextSteps } from '@/components/handoffs/NextSteps';
import { RepoPanel } from '@/components/handoffs/RepoPanel';
import { api } from '@/lib/api';
import { ago, clock, shortSession } from '@/lib/format';
import { handoffLabel, handoffTone, isCheckpoint, stepsOf, taskOf } from '@/lib/checkpoint';
import { useData } from '@/store/data';
import { useTerminal } from '@/terminal/store';
import type { Handoff, ProviderID } from '@/types';

export function HandoffDetail() {
  const { project = '', id = '' } = useParams();
  const [handoff, setHandoff] = useState<Handoff>();
  const [error, setError] = useState<string>();
  const openHandoff = useHandoffDialog((s) => s.open);

  const version = useData((s) =>
    s.handoffs.find(
      (h) => h.project === decodeURIComponent(project) && h.id === decodeURIComponent(id),
    ),
  );

  const stamp = version
    ? `${version.stage}|${version.updated_at ?? ''}|${version.outcome?.status ?? ''}`
    : '';

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
        <ErrorState
          title="Checkpoint not found"
          body="It may have been removed, or the file is damaged."
          detail={error}
        />
      </Page>
    );
  }

  if (!handoff)
    return (
      <Page>
        <LoadingState label="Reading checkpoint" />
      </Page>
    );

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
            <Button
              icon={ArrowDataTransferHorizontalIcon}
              onClick={() =>
                openHandoff({
                  projectDir: handoff.git.root!,
                  fromProvider: handoff.target.provider as ProviderID,
                  fromAccount: handoff.target.account,
                })
              }
            >
              Hand off again
            </Button>
          ) : null
        }
      />

      <div className="two-col">
        <Panel className="handoff-hero">
          <AgentPair handoff={handoff} vertical />

          <p className="muted">
            {handoff.reason === 'usage_limit'
              ? 'Started automatically after a usage limit'
              : handoff.reason === 'manual_switch'
                ? 'Requested by you'
                : handoff.reason
                  ? handoff.reason.replace(/_/g, ' ')
                  : 'Requested by you'}
          </p>

          {handoff.resumed ? (
            <p className="muted">
              The native session was carried as well; the handoff is a safety copy.
            </p>
          ) : null}

          {handoff.source.session_id || handoff.target.session_id ? (
            <p className="muted mono selectable">
              session{' '}
              {handoff.source.session_id ? shortSession(handoff.source.session_id) : 'unknown'} →{' '}
              {handoff.target.session_id
                ? shortSession(handoff.target.session_id)
                : 'not recorded yet'}
            </p>
          ) : null}

          {handoff.source_commit ? (
            <p className="muted">
              {handoff.source.provider}/{handoff.source.account}'s work was committed as{' '}
              <span className="mono selectable">{handoff.source_commit.slice(0, 8)}</span> before
              the switch
            </p>
          ) : null}

          {handoff.checkpoint ? (
            <p className="muted">
              Continued checkpoint <span className="mono">{handoff.checkpoint}</span>
              {' · '}
              <Link
                className="link"
                to={`/handoffs/${encodeURIComponent(handoff.project)}/${encodeURIComponent(handoff.checkpoint)}`}
              >
                Open
              </Link>
            </p>
          ) : null}

          {handoff.error ? <p className="form-error selectable">{handoff.error}</p> : null}
        </Panel>

        {handoff.outcome ? (
          <HandoffOutcomePanel handoff={handoff} />
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
          <NextSteps steps={stepsOf(handoff)} />
        </Panel>

        <RepoPanel handoff={handoff} home={home} />
      </div>

      {handoff.mcp?.length ? (
        <Section title="MCP">
          <Panel>
            {handoff.mcp.map((m) => (
              <Row key={m.server} label={m.server}>
                <StatusText tone={mcpTone(m.status, !!m.requires_auth)}>
                  {mcpLabel(m.status, !!m.requires_auth)}
                </StatusText>

                {m.reason ? <span className="muted"> · {m.reason}</span> : null}
              </Row>
            ))}
          </Panel>
        </Section>
      ) : null}

      <HandoffSkills skills={handoff.skills} home={home} />

      <Section title="Context" meta="reported by the agent's session record">
        <Panel>
          <TitledList title="Earlier requests" items={ctx.user_requests?.slice(0, -1)} />

          {ctx.last_assistant ? (
            <div className="handoff-list">
              <h4>Last progress note</h4>
              <p className="selectable">{ctx.last_assistant}</p>
            </div>
          ) : null}

          <TitledList title="Files modified" items={ctx.files_modified} />
          <TitledList title="Files created" items={ctx.files_created} />
          <TitledList title="Files read" items={ctx.files_read} />
          <TitledList title="Commands" items={ctx.commands} />
          <TitledList title="Decisions" items={ctx.decisions} />
          <TitledList title="Recent commits" items={handoff.git.recent_commits} />
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
