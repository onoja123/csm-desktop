import { AgentIcon } from '@/components/agents/AgentIcon';
import { Panel, PanelHeader, StatusText } from '@/components/ui';
import { PROVIDER_LONG_NAMES, shortPath } from '@/lib/format';
import { entryTone } from '@/lib/skills';
import type { SkillAgentInfo, SkillAgentView } from '@/types';

export function AgentSkillView({
  view: v,
  info,
  home,
}: {
  view: SkillAgentView;
  info?: SkillAgentInfo;
  home: string;
}) {
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-title">
            <AgentIcon provider={v.provider} size="md" /> {PROVIDER_LONG_NAMES[v.provider]}
            {v.account ? <span className="mono"> · {v.account}</span> : null}
          </span>
        }
        meta={`${(v.skills ?? []).filter((s) => s.status === 'available').length} available`}
      />

      <ul className="skill-roots">
        {v.roots.map((r) => (
          <li key={r.dir} className="mono">
            <span className="muted">{r.scope}</span> {shortPath(r.dir, home)}
            {r.broken ? <span className="tone-err"> · broken link to {r.link}</span> : null}
            {!r.broken && r.link ? (
              <span className="muted"> · linked to {shortPath(r.link, home)}</span>
            ) : null}
            {!r.exists && !r.broken ? <span className="muted"> · not created yet</span> : null}
          </li>
        ))}
      </ul>

      {(v.skills ?? []).length === 0 ? <p className="muted">No skills in these folders.</p> : null}

      <ul className="skill-outcomes">
        {(v.skills ?? []).map((e, i) => (
          <li key={i}>
            <span className="skill-outcomes__who">{e.name}</span>
            <StatusText tone={entryTone(e.status)}>{e.status}</StatusText>
            <span className="muted">{e.managed ? 'installed by CSM' : 'yours'}</span>
            {e.version ? <span className="mono muted">{e.version}</span> : null}
            {e.dir ? <span className="mono muted selectable">{shortPath(e.dir, home)}</span> : null}
            {e.detail ? <span className="skill-outcomes__detail">{e.detail}</span> : null}
          </li>
        ))}
      </ul>

      {info?.notes ? <p className="muted">{info.notes}</p> : null}
      {info?.verified ? <p className="muted">Checked against {info.verified}</p> : null}
    </Panel>
  );
}
