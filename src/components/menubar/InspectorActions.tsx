import { useEffect, useMemo, useState } from 'react';
import { ConfirmAction } from './ConfirmAction';
import { Button } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { api, desktop } from '@/lib/api';
import {
  capability,
  failoverTarget,
  handoffFacts,
  handoffTargets,
  resumeBlocker,
  resumeFacts,
  sessionRoute,
  stopFacts,
  switchCandidates,
  switchFacts,
} from '@/lib/menubar';
import { useData } from '@/store/data';
import type { Account, AgentSession, HandoffPreview } from '@/types';

// csm does not acknowledge switch requests, so the panel waits for the session itself to change.
const UNCONFIRMED_AFTER_MS = 45_000;

type Flow =
  | { kind: 'switch'; dest: Account }
  | { kind: 'recover'; dest: Account }
  | { kind: 'pick-switch' }
  | { kind: 'stop' }
  | { kind: 'resume' }
  | { kind: 'handoff' };

interface Pending {
  text: string;
  started: number;
  expect?: { account?: string; provider?: string; live?: boolean };
  open?: string;
}

function ActionRow({
  title,
  note,
  label,
  onClick,
  blocked,
  tone,
}: {
  title: string;
  note: string;
  label?: string;
  onClick?: () => void;
  blocked?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className={`menubar-action ${blocked ? 'menubar-action--blocked' : ''}`}>
      <div className="menubar-action__text">
        <span className="menubar-action__title">{title}</span>
        <span className="menubar-action__note">{blocked ?? note}</span>
      </div>

      {blocked || !onClick ? null : (
        <Button size="sm" variant={tone} onClick={onClick}>
          {label}
        </Button>
      )}
    </div>
  );
}

function HandoffFlow({
  session: s,
  targets,
  onCancel,
  onDone,
}: {
  session: AgentSession;
  targets: Account[];
  onCancel: () => void;
  onDone: (p: Pending) => void;
}) {
  const [target, setTarget] = useState(targets[0]?.name);
  const [preview, setPreview] = useState<HandoffPreview>();
  const [error, setError] = useState<string>();
  const dest = targets.find((a) => a.name === target);

  useEffect(() => {
    if (!target) return;

    let current = true;

    setPreview(undefined);
    setError(undefined);

    api
      .previewHandoff(s.projectDir, target)
      .then((p) => {
        if (current) setPreview(p);
      })
      .catch((e) => {
        if (current) setError((e as Error).message);
      });

    return () => {
      current = false;
    };
  }, [s.projectDir, target]);

  const handOff = async () => {
    if (!dest) return;

    const res = await api.createHandoff(s.projectDir, dest.name);

    onDone(
      res.run_id
        ? {
            text: res.message || `Started ${dest.provider_name} as ${dest.name}.`,
            started: Date.now(),
            open: res.run_id,
          }
        : { text: res.message, started: Date.now(), expect: { provider: dest.provider } },
    );
  };

  return (
    <div className="menubar-handoff">
      <label className="menubar-field">
        Continue with
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {targets.map((a) => (
            <option key={`${a.provider}/${a.name}`} value={a.name}>
              {a.provider_name} · {a.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="menubar__error selectable">{error}</p> : null}

      {!preview && !error ? (
        <p className="menubar__empty" aria-live="polite">
          Checking what CSM can carry over…
        </p>
      ) : null}

      {preview && dest && preview.mode !== 'none' ? (
        <ConfirmAction
          key={target}
          title={`Hand off to ${dest.provider_name}`}
          facts={handoffFacts(preview, dest)}
          confirmLabel="Hand off"
          onConfirm={handOff}
          onCancel={onCancel}
        />
      ) : (
        <>
          {preview && dest ? (
            <p className="menubar__empty">This session already runs as {dest.name}.</p>
          ) : null}
          <div className="menubar-confirm__actions">
            <Button size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function InspectorActions({
  session: s,
  onInspectAccounts,
  onOpenSession,
}: {
  session: AgentSession;
  onInspectAccounts: () => void;
  onOpenSession: (id: string) => void;
}) {
  const accounts = useData((d) => d.accounts);
  const status = useData((d) => d.status);
  const failover = useData((d) => d.failover);
  const [flow, setFlow] = useState<Flow>();
  const [pending, setPending] = useState<Pending>();
  const now = useNow(1000);

  const candidates = useMemo(() => switchCandidates(accounts, s), [accounts, s]);
  const next = useMemo(() => failoverTarget(failover, accounts, s), [failover, accounts, s]);

  const targets = useMemo(
    () => handoffTargets(accounts, status, s).filter((a) => a.provider !== s.provider),
    [accounts, status, s],
  );

  const switching = capability(status, s.provider, 'account_switching');
  const active = accounts.find((a) => a.provider === s.provider && a.active);
  const resumeBlocked = resumeBlocker(s, status);
  const open = (route: string) => void desktop.showMain(route);

  const expect = pending?.expect;

  const confirmed =
    !!expect &&
    ((expect.account !== undefined && s.account === expect.account) ||
      (expect.provider !== undefined && s.provider === expect.provider) ||
      (expect.live !== undefined && s.live === expect.live));

  const confirmedText = !expect
    ? ''
    : expect.live === false
      ? 'Stopped.'
      : `Now running as ${s.providerName} · ${s.account}.`;

  const finish = (p: Pending) => {
    setFlow(undefined);
    setPending(p);
  };

  const doSwitch = async (dest: Account) => {
    const res = await api.switchAccount(dest.name, s.projectDir);

    finish({
      text: res.message,
      started: Date.now(),
      expect: res.mode === 'session' ? { account: dest.name } : undefined,
    });
  };

  const switchBlocked = !s.live
    ? 'Only a running session can switch accounts.'
    : switching === 'unsupported'
      ? `${s.providerName} can't switch accounts inside a session.`
      : candidates.length === 0
        ? `No other ready ${s.providerName} account. Add one with csm account add.`
        : undefined;

  const recoverBlocked = !s.live
    ? 'Only a running session can move to another account.'
    : !next
      ? `Your failover order has no other ready ${s.providerName} account.`
      : undefined;

  const handoffBlocked =
    targets.length === 0 ? 'No other agent has an account that can take over.' : undefined;

  const stopBlocked = !s.live
    ? 'The session is not running.'
    : !s.runId
      ? 'Started in a terminal: stop it there. CSM can only stop agents it started.'
      : undefined;

  return (
    <div className="inspector-actions">
      {pending ? (
        <div className="menubar-result" role="status" aria-live="polite">
          <p>{confirmed ? confirmedText : pending.text}</p>

          {expect && !confirmed && now - pending.started > UNCONFIRMED_AFTER_MS ? (
            <p className="menubar-result__note">
              CSM hasn&apos;t reported the change yet. It ignores a switch while another one is in
              progress.
            </p>
          ) : null}

          <div className="menubar-confirm__actions">
            {pending.open ? (
              <Button size="sm" onClick={() => onOpenSession(pending.open!)}>
                Open it
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setPending(undefined)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <section className="menubar__section">
        <h4 className="menubar__label">Look closer</h4>

        <ActionRow
          title="View usage details"
          note="Opens this account's usage in CSM. Nothing changes."
          label="Open"
          onClick={() => open(`/accounts/${encodeURIComponent(s.account)}`)}
        />
        <ActionRow
          title="Inspect another account"
          note="Compare accounts without switching the session."
          label="Compare"
          onClick={onInspectAccounts}
        />
        <ActionRow
          title="Open in CSM"
          note={
            s.observable ? 'Output, files and session details.' : 'Shows it in Mission Control.'
          }
          label="Open"
          onClick={() => open(sessionRoute(s))}
        />
        <ActionRow
          title="Open a terminal"
          note={s.runId ? 'Attaches to the agent in CSM’s terminal.' : `A shell in ${s.project}.`}
          label="Terminal"
          onClick={() =>
            open(
              s.runId
                ? `/terminal?run=${encodeURIComponent(s.runId)}`
                : `/terminal?cwd=${encodeURIComponent(s.projectDir)}`,
            )
          }
        />
      </section>

      <section className="menubar__section">
        <h4 className="menubar__label">Recover</h4>

        {flow?.kind === 'pick-switch' ? (
          <div className="menubar-handoff">
            <span className="menubar-field">Switch {s.account} to</span>
            {candidates.map((a) => (
              <button
                key={a.name}
                type="button"
                className="menubar-choice"
                onClick={() => setFlow({ kind: 'switch', dest: a })}
              >
                <span className="mono">{a.name}</span>
                <span className="menubar-choice__meta">
                  {a.usage_label === 'unknown' ? 'Usage unknown' : a.usage_label}
                </span>
              </button>
            ))}
            <div className="menubar-confirm__actions">
              <Button size="sm" onClick={() => setFlow(undefined)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : flow?.kind === 'switch' || flow?.kind === 'recover' ? (
          <ConfirmAction
            title={
              flow.kind === 'recover'
                ? `Recover with ${flow.dest.name}`
                : `Switch to ${flow.dest.name}`
            }
            facts={[
              ...(flow.kind === 'recover'
                ? [`${flow.dest.name} is the next ready account in your failover order.`]
                : []),
              ...switchFacts(s, flow.dest, status),
            ]}
            confirmLabel={flow.kind === 'recover' ? 'Recover' : 'Switch account'}
            onConfirm={() => doSwitch(flow.dest)}
            onCancel={() => setFlow(undefined)}
          />
        ) : (
          <>
            <ActionRow
              title="Change account"
              note={`Pick another ${s.providerName} account for this session. You confirm before anything changes.`}
              label="Choose account…"
              blocked={switchBlocked}
              onClick={() => setFlow({ kind: 'pick-switch' })}
            />
            <ActionRow
              title="Recover with another account"
              note={`Uses your failover order: next is ${next?.name ?? 'none'}.`}
              label="Review…"
              blocked={recoverBlocked}
              onClick={() => next && setFlow({ kind: 'recover', dest: next })}
            />
          </>
        )}

        {flow?.kind === 'handoff' ? (
          <HandoffFlow
            session={s}
            targets={targets}
            onCancel={() => setFlow(undefined)}
            onDone={finish}
          />
        ) : (
          <ActionRow
            title="Hand off to another agent"
            note="Continue the task with a different agent, with CSM's brief of the work."
            label="Choose agent…"
            blocked={handoffBlocked}
            onClick={() => setFlow({ kind: 'handoff' })}
          />
        )}
      </section>

      <section className="menubar__section">
        <h4 className="menubar__label">Session</h4>

        {flow?.kind === 'stop' ? (
          <ConfirmAction
            title={`Stop ${s.providerName}?`}
            facts={stopFacts(s)}
            confirmLabel="Stop agent"
            tone="danger"
            onConfirm={async () => {
              await api.stopRun(s.runId!);
              finish({ text: 'Stop requested.', started: Date.now(), expect: { live: false } });
            }}
            onCancel={() => setFlow(undefined)}
          />
        ) : (
          <ActionRow
            title="Stop"
            note="Ends the agent's process."
            label="Stop…"
            tone="danger"
            blocked={stopBlocked}
            onClick={() => setFlow({ kind: 'stop' })}
          />
        )}

        <ActionRow
          title="Pause"
          note=""
          blocked="Not available: csm can stop an agent but cannot pause one."
        />

        {!s.live ? (
          flow?.kind === 'resume' ? (
            <ConfirmAction
              title={`Resume ${s.providerName}?`}
              facts={resumeFacts(s, active)}
              confirmLabel="Resume"
              onConfirm={async () => {
                const run = await api.resumeSession({
                  provider: s.provider,
                  project_dir: s.projectDir,
                  session_id: s.sessionId!,
                });

                finish({
                  text: `Started a new ${s.providerName} run.`,
                  started: Date.now(),
                  open: run.id,
                });
              }}
              onCancel={() => setFlow(undefined)}
            />
          ) : (
            <ActionRow
              title="Resume"
              note="Continues this conversation in a new run."
              label="Resume…"
              blocked={resumeBlocked}
              onClick={() => setFlow({ kind: 'resume' })}
            />
          )
        ) : null}
      </section>
    </div>
  );
}
