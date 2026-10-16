import { StatusText } from '@/components/ui';
import { PROVIDER_LONG_NAMES, ago, shortPath } from '@/lib/format';
import { STATE_LABEL, stateTone } from '@/lib/skills';
import { useHomeDir } from '@/hooks/useHomeDir';
import type { SkillTaskManifest } from '@/types';

export function ManifestSkills({ manifest }: { manifest?: SkillTaskManifest }) {
  const home = useHomeDir();
  const skills = manifest?.skills ?? [];

  return (
    <>
      {skills.map((s) => (
        <div key={s.id} className="task-skill">
          <div className="task-skill__top">
            <strong>{s.name}</strong>
            <StatusText tone={stateTone(s.state)}>{STATE_LABEL[s.state]}</StatusText>
            <span className="muted">
              {s.origin}
              {s.reason ? `: ${s.reason}` : ''}
            </span>
          </div>

          <span className="mono muted selectable">
            {s.source} @ {s.revision?.slice(0, 12) ?? `content ${s.hash.slice(0, 12)}`}
          </span>

          <ul className="skill-outcomes">
            {(s.placements ?? []).map((p, i) => (
              <li key={i}>
                <span className="skill-outcomes__who">
                  {PROVIDER_LONG_NAMES[p.provider]}
                  {p.account ? ` · ${p.account}` : ''}
                  {p.handoff ? ' · after a handoff' : ''}
                </span>
                <StatusText tone={stateTone(p.state)}>{STATE_LABEL[p.state]}</StatusText>
                {p.dir ? (
                  <span className="mono muted selectable">{shortPath(p.dir, home)}</span>
                ) : null}
                {p.problem ? <span className="skill-outcomes__detail">{p.problem}</span> : null}

                {(p.adaptations ?? []).map((a) => (
                  <span key={a} className="skill-outcomes__detail">
                    Adapted: {a}
                  </span>
                ))}

                {(p.evidence ?? []).map((e, n) => (
                  <span key={n} className="skill-outcomes__detail tone-ok">
                    Evidence: {e.kind}
                    {e.session ? ` in session ${e.session.slice(0, 8)}` : ''}
                    {e.at ? ` · ${ago(e.at)}` : ''}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {(manifest?.missing ?? []).map((m) => (
        <p key={m} className="tone-err">
          {m} was picked but is not installed.
        </p>
      ))}

      {(manifest?.conflicts ?? []).map((c, i) => (
        <p key={i} className={c.needs_decision ? 'tone-err' : 'tone-warn'}>
          {c.project
            ? `${c.skills[0]} wants ${c.facet} ${c.values[0]}, but the project uses ${c.project}: ${c.resolution}.`
            : `${c.skills.join(' and ')} disagree about the ${c.facet} (${c.values.join(' vs ')}): ${c.resolution}.`}
        </p>
      ))}

      {manifest?.recommended?.length ? (
        <p className="muted">
          Recommended, not selected:{' '}
          {manifest.recommended.map((r) => `${r.name} (${r.reason})`).join('; ')}
        </p>
      ) : null}

      {(manifest?.observed ?? []).map((e, i) => (
        <p key={i} className="muted">
          {PROVIDER_LONG_NAMES[e.provider]} also loaded {e.skill} on its own ({e.kind}).
        </p>
      ))}
    </>
  );
}
