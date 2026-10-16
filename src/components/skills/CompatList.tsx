import { AgentIcon } from '@/components/agents/AgentIcon';
import { StatusText } from '@/components/ui';
import { PROVIDER_LONG_NAMES } from '@/lib/format';
import { LEVEL_LABEL, levelTone } from '@/lib/skills';
import type { SkillCompat } from '@/types';

export function CompatList({ items }: { items: SkillCompat[] }) {
  return (
    <div className="skill-compat">
      {items.map((c) => (
        <div key={c.provider} className="skill-compat__row">
          <AgentIcon provider={c.provider} size="md" />
          <span className="skill-compat__agent">{PROVIDER_LONG_NAMES[c.provider]}</span>
          <StatusText tone={levelTone(c.level)}>{LEVEL_LABEL[c.level]}</StatusText>

          {c.reasons?.length || c.adaptations?.length ? (
            <ul className="skill-compat__why">
              {(c.reasons ?? []).map((r) => (
                <li key={r}>{r}</li>
              ))}

              {(c.adaptations ?? []).map((a) => (
                <li key={a}>CSM adapts the copy: {a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
