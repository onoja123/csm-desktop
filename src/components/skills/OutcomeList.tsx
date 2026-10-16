import { StatusText } from '@/components/ui';
import { PROVIDER_LONG_NAMES, shortPath } from '@/lib/format';
import { outcomeTone } from '@/lib/skills';
import type { SkillOutcome } from '@/types';
import { useHomeDir } from '@/hooks/useHomeDir';

export function OutcomeList({ outcomes }: { outcomes?: SkillOutcome[] }) {
  const home = useHomeDir();

  if (!outcomes?.length)
    return (
      <p className="muted">
        No agent account or project to place it in yet. CSM places it when one starts.
      </p>
    );

  return (
    <ul className="skill-outcomes">
      {outcomes.map((o, i) => (
        <li key={i}>
          <span className="skill-outcomes__who">
            {PROVIDER_LONG_NAMES[o.provider]}
            {o.account ? ` · ${o.account}` : o.scope === 'project' ? ' · project' : ''}
          </span>

          <StatusText tone={outcomeTone(o.status)}>{o.status}</StatusText>
          {o.dir ? <span className="mono muted selectable">{shortPath(o.dir, home)}</span> : null}
          {o.detail ? <span className="skill-outcomes__detail">{o.detail}</span> : null}

          {(o.adaptations ?? []).map((a) => (
            <span key={a} className="skill-outcomes__detail">
              Adapted: {a}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
