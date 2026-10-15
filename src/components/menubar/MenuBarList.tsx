import { useMemo } from 'react';
import { MenuBarApproval } from './MenuBarApproval';
import { MenuBarAttention } from './MenuBarAttention';
import { MenuBarSession } from './MenuBarSession';
import { splitSessions } from '@/lib/menubar';
import type { AgentSession, Approval, MenuAttention } from '@/types';

export function MenuBarList({
  sessions,
  approvals,
  attention,
  recentLimit,
  now,
  onInspect,
  onAttention,
}: {
  sessions: AgentSession[];
  approvals: Approval[];
  attention: MenuAttention[];
  recentLimit: number;
  now: number;
  onInspect: (s: AgentSession) => void;
  onAttention: (item: MenuAttention) => void;
}) {
  const { live, finished } = useMemo(
    () => splitSessions(sessions, recentLimit),
    [sessions, recentLimit],
  );

  const flagged = useMemo(() => new Set(attention.map((a) => a.run_id)), [attention]);
  const byRun = useMemo(() => new Map(sessions.map((s) => [s.runId ?? s.id, s])), [sessions]);

  return (
    <>
      {approvals.length > 0 ? (
        <section className="menubar__section" aria-label="Waiting for you">
          <h4 className="menubar__label">Waiting for you</h4>
          {approvals.map((a) => (
            <MenuBarApproval
              key={a.id}
              approval={a}
              session={a.run_id ? byRun.get(a.run_id) : undefined}
            />
          ))}
        </section>
      ) : null}

      {attention.length > 0 ? (
        <section className="menubar__section" aria-label="Needs attention">
          <h4 className="menubar__label">Needs attention</h4>
          {attention.map((item) => (
            <MenuBarAttention key={item.key} item={item} onOpen={onAttention} />
          ))}
        </section>
      ) : null}

      <section className="menubar__section" aria-label="Working now">
        <h4 className="menubar__label">Working now</h4>

        {live.length > 0 ? (
          live.map((s) => (
            <MenuBarSession
              key={s.id}
              session={s}
              now={now}
              flagged={flagged.has(s.id)}
              onOpen={onInspect}
            />
          ))
        ) : (
          <p className="menubar__empty">
            No agents running. Start one in CSM, or run <code>csm claude</code> in a terminal.
          </p>
        )}
      </section>

      {finished.length > 0 ? (
        <section className="menubar__section" aria-label="Finished recently">
          <h4 className="menubar__label">Finished recently</h4>
          {finished.map((s) => (
            <MenuBarSession
              key={s.id}
              session={s}
              now={now}
              flagged={flagged.has(s.id)}
              onOpen={onInspect}
            />
          ))}
        </section>
      ) : null}
    </>
  );
}
