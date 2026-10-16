import { useState } from 'react';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import { EmptyState, StatusText } from '@/components/ui';
import { SkillDetailPanel } from '@/components/skills/SkillDetailPanel';
import { INSPECTION_LABEL, inspectionTone, scopeLabel } from '@/lib/skills';
import type { SkillRecord } from '@/types';

export function InstalledSkills({
  skills,
  query,
  projectDir,
  onDiscover,
}: {
  skills: SkillRecord[];
  query: string;
  projectDir?: string;
  onDiscover: () => void;
}) {
  const [selected, setSelected] = useState<string>();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  const shown = skills.filter((s) =>
    words.every((w) =>
      `${s.name} ${s.description} ${s.category ?? ''} ${(s.tags ?? []).join(' ')}`
        .toLowerCase()
        .includes(w),
    ),
  );

  const current = shown.find((s) => s.id === selected) ?? shown[0];

  if (skills.length === 0)
    return (
      <EmptyState
        icon={BookOpen01Icon}
        title="No skills installed"
        body="Install a skill once and CSM makes it available to every agent that can use it, in the folders each agent reads."
        action={
          <button className="btn btn--primary btn--md" onClick={onDiscover}>
            Find skills
          </button>
        }
      />
    );

  return (
    <div className="skill-split">
      <div className="list skill-list">
        {shown.length === 0 ? <p className="muted">No installed skill matches.</p> : null}

        {shown.map((s) => (
          <button
            key={s.id}
            className={`skill-row ${current?.id === s.id ? 'skill-row--active' : ''}`}
            onClick={() => setSelected(s.id)}
          >
            <span className="skill-row__top">
              <span className="skill-row__name">{s.name}</span>
              {!s.enabled ? <span className="muted">disabled</span> : null}
            </span>

            <span className="skill-row__desc">{s.description}</span>

            <span className="skill-row__meta">
              <span>{scopeLabel(s)}</span>
              <span className="mono">{s.version}</span>
              <StatusText tone={inspectionTone(s.inspection.status)}>
                {INSPECTION_LABEL[s.inspection.status]}
              </StatusText>
              <span>{s.projections?.length ?? 0} placed</span>
            </span>
          </button>
        ))}
      </div>

      {current ? <SkillDetailPanel skill={current} projectDir={projectDir} /> : null}
    </div>
  );
}
