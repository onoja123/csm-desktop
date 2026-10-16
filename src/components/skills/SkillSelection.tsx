import { useEffect, useState } from 'react';
import { Button, Field, LoadingState } from '@/components/ui';
import { api } from '@/lib/api';
import { useData } from '@/store/data';
import type { SkillMode, SkillPolicy } from '@/types';

const MODES: { id: SkillMode; label: string; body: string }[] = [
  {
    id: 'manual',
    label: 'Manual',
    body: 'Tasks use only the skills you pick, plus your defaults.',
  },
  {
    id: 'recommended',
    label: 'Recommended',
    body: 'CSM suggests installed skills that match a task; you decide which to use.',
  },
  {
    id: 'automatic',
    label: 'Automatic',
    body: 'CSM also picks the best-matching installed skills on its own. It never installs a skill.',
  },
];

export function SkillSelection() {
  const skills = useData((s) => s.skills);
  const [policy, setPolicy] = useState<SkillPolicy>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .skillPolicy()
      .then(setPolicy)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!policy) return error ? <p className="form-error">{error}</p> : <LoadingState />;

  const save = async () => {
    setBusy(true);
    setError(undefined);

    try {
      setPolicy(await api.setSkillPolicy(policy));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<SkillPolicy>) => {
    setSaved(false);
    setPolicy({ ...policy, ...patch });
  };

  return (
    <div className="skill-selection">
      <div className="skill-modes" role="radiogroup" aria-label="Selection mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={policy.mode === m.id}
            className={`skill-mode ${policy.mode === m.id ? 'skill-mode--active' : ''}`}
            onClick={() => update({ mode: m.id })}
          >
            <strong>{m.label}</strong>
            <span>{m.body}</span>
          </button>
        ))}
      </div>

      <Field label="Default skills" hint="Selected for every task whose agent can use them.">
        <div className="chips">
          {skills.length === 0 ? <span className="muted">No skills installed.</span> : null}

          {skills.map((s) => {
            const on = policy.defaults.includes(s.id);

            return (
              <button
                key={s.id}
                className={`chip ${on ? 'chip--active' : ''}`}
                aria-pressed={on}
                onClick={() =>
                  update({
                    defaults: on
                      ? policy.defaults.filter((d) => d !== s.id)
                      : [...policy.defaults, s.id],
                  })
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Field>

      {policy.mode === 'automatic' ? (
        <Field label="Most skills CSM picks on its own per task">
          <input
            className="input input--sm"
            type="number"
            min={1}
            max={10}
            value={policy.max_auto || 3}
            onChange={(e) => update({ max_auto: Number(e.target.value) })}
          />
        </Field>
      ) : null}

      <p className="muted">
        If instructions disagree, agents follow this order: their safety rules and approvals, the
        task's instructions and acceptance criteria, the project's own rules, then skills. A skill
        never changes an agent's permissions.
      </p>

      {error ? <p className="form-error selectable">{error}</p> : null}

      <div className="skill-detail__actions">
        <Button variant="primary" loading={busy} onClick={() => void save()}>
          Save
        </Button>
        {saved ? <span className="tone-ok">Saved</span> : null}
      </div>
    </div>
  );
}
