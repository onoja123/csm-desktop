import { Panel, Section, StatusText } from '@/components/ui';
import { shortPath } from '@/lib/format';
import { LEVEL_LABEL, levelTone } from '@/lib/skills';
import type { HandoffSkills as HandoffSkillsView } from '@/types';

export function HandoffSkills({ skills, home }: { skills?: HandoffSkillsView; home: string }) {
  const carried = skills?.carried ?? [];
  const missing = skills?.not_carried ?? [];

  if (!carried.length && !missing.length) return null;

  return (
    <Section title="Skills" meta={`${carried.length} carried · ${missing.length} not carried`}>
      <Panel>
        <ul className="skill-outcomes">
          {carried.map((c) => (
            <li key={c.id ?? c.name}>
              <span className="skill-outcomes__who">{c.name}</span>
              <StatusText tone={levelTone(c.level)}>
                {c.level ? LEVEL_LABEL[c.level] : 'Carried'}
              </StatusText>
              <span className="mono muted">{c.version}</span>
              {c.used === 'invoked' ? (
                <span className="tone-ok">the previous agent loaded it</span>
              ) : null}
              {c.from ? (
                <span className="mono muted selectable">from {shortPath(c.from, home)}</span>
              ) : null}
              {c.to ? (
                <span className="mono muted selectable">to {shortPath(c.to, home)}</span>
              ) : null}
              {c.use ? (
                <span className="skill-outcomes__detail">
                  How the agent is asked to use it: {c.use}
                </span>
              ) : null}

              {(c.adaptations ?? []).map((a) => (
                <span key={a} className="skill-outcomes__detail">
                  Adapted: {a}
                </span>
              ))}
            </li>
          ))}

          {missing.map((c) => (
            <li key={'x' + (c.id ?? c.name)}>
              <span className="skill-outcomes__who">{c.name}</span>
              <StatusText tone="err">Not carried</StatusText>
              <span className="skill-outcomes__detail">{c.reason}</span>
            </li>
          ))}
        </ul>

        <p className="muted">
          A carried skill is available to the next agent; it is not proof that the agent loads or
          follows it. Hooks, tool pre-approval and commands that run on load are never carried to
          another agent.
        </p>
      </Panel>
    </Section>
  );
}
