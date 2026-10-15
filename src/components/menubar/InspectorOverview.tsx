import { useMemo } from 'react';
import { openPath } from '@tauri-apps/plugin-opener';
import { Row } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { ago, clock, duration, liveSeconds, shortSession } from '@/lib/format';
import { mentionsProject, sessionTask } from '@/lib/mission';
import { useData } from '@/store/data';
import type { AgentSession, MenuAttention } from '@/types';

function origin(s: AgentSession): string {
  if (s.kind === 'external') return "Started in a terminal. Its output isn't visible here.";
  if (s.kind === 'handoff') return 'Started by a CSM handoff.';
  if (s.buildId) return 'A Build Room task.';

  return 'Started from CSM.';
}

export function InspectorOverview({
  session: s,
  attention,
  onAccount,
}: {
  session: AgentSession;
  attention: MenuAttention[];
  onAccount: () => void;
}) {
  const activity = useData((d) => d.activity);
  const now = useNow(1000);

  const latest = useMemo(
    () =>
      activity.find((a) =>
        s.runId
          ? a.run_id === s.runId
          : a.provider === s.provider &&
            new Date(a.at).getTime() >= new Date(s.startedAt).getTime() &&
            mentionsProject(a.detail, s.projectDir),
      ),
    [activity, s.runId, s.provider, s.startedAt, s.projectDir],
  );

  return (
    <div className="inspector-overview">
      {attention.map((a) => (
        <div key={a.key} className="menubar-alert" role="status">
          <span className="menubar-alert__title">{a.title}</span>
          <span>{a.reason}</span>
          {a.detail ? <span className="menubar-alert__detail">{a.detail}</span> : null}
        </div>
      ))}

      {s.attention && !attention.length ? (
        <div className="menubar-alert" role="status">
          <span className="menubar-alert__title">{s.attention.reason}</span>
          {s.attention.detail ? (
            <span className="menubar-alert__detail">{s.attention.detail}</span>
          ) : null}
        </div>
      ) : null}

      <Row label="State">
        {s.label}
        {s.detail && s.detail !== s.label ? ` · ${s.detail}` : ''}
      </Row>
      <Row label="Task">{sessionTask(s)}</Row>
      <Row label="Project">
        <button
          type="button"
          className="menubar-inline-link"
          title={s.projectDir}
          onClick={() => void openPath(s.projectDir).catch(() => undefined)}
        >
          {s.project}
        </button>
      </Row>
      {s.branch ? <Row label="Branch">{s.branch}</Row> : null}
      <Row label="Account">
        <button type="button" className="menubar-inline-link" onClick={onAccount}>
          {s.account}
        </button>
      </Row>
      <Row label="Started">
        {clock(s.startedAt)} · {ago(s.startedAt, now)}
      </Row>
      <Row label={s.live ? 'Running for' : 'Ran for'}>
        {duration(liveSeconds(s.startedAt, s.endedAt, now))}
      </Row>
      {s.switched ? (
        <Row label="Switched">
          from {s.switched.from} · {s.switched.reason} · {ago(s.switched.at, now)}
        </Row>
      ) : null}
      <Row label="Latest event">
        {latest
          ? `${latest.title} · ${ago(latest.at, now)}`
          : 'Nothing recorded for this session yet'}
      </Row>
      {s.observable ? (
        <Row label="Session" mono>
          {s.sessionId ? shortSession(s.sessionId) : 'Not reported yet'}
        </Row>
      ) : null}
      <p className="inspector__footnote">{origin(s)}</p>
    </div>
  );
}
