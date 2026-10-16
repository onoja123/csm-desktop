import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { ManifestSkills } from '@/components/skills/ManifestSkills';
import { api } from '@/lib/api';
import { useData } from '@/store/data';
import type {
  Build,
  BuildAction,
  BuildActionRequest,
  BuildTask,
  ProviderID,
  SkillResolveView,
  SkillTaskManifest,
} from '@/types';

export function TaskSkills({
  build,
  task: t,
  busy,
  onAct,
}: {
  build: Build;
  task: BuildTask;
  busy?: string;
  onAct: (a: BuildAction, req?: BuildActionRequest) => Promise<void>;
}) {
  const installed = useData((s) => s.skills).filter((s) => s.enabled);
  const stamp = useData((s) => s.buildStamps[build.id] ?? 0);
  const [manifest, setManifest] = useState<SkillTaskManifest>();
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string[]>(t.skills ?? []);
  const [preview, setPreview] = useState<SkillResolveView>();
  const editable = t.status !== 'running' && t.status !== 'assigned' && t.status !== 'completed';

  useEffect(() => {
    if (!t.skill_manifest) {
      setManifest(undefined);

      return;
    }

    api
      .skillTask(build.id, t.id)
      .then(setManifest)
      .catch(() => setManifest(undefined));
  }, [build.id, t.id, t.skill_manifest, stamp]);

  useEffect(() => setPicked(t.skills ?? []), [t.skills]);

  const runPreview = async (skills: string[]) => {
    try {
      setPreview(
        await api.resolveSkills({
          text: [t.title, t.objective, ...(t.acceptance ?? [])].join('\n'),
          provider: (t.provider || 'claude') as ProviderID,
          skills,
          project_dir: build.repo,
        }),
      );
    } catch {
      setPreview(undefined);
    }
  };

  const skills = manifest?.skills ?? [];

  if (!skills.length && !editable && !manifest?.recommended?.length) return null;

  return (
    <div className="handoff-list task-skills">
      <h4>
        Skills
        <span className="handoff-list__note">
          {manifest?.mode
            ? `${manifest.mode} selection`
            : t.skills?.length
              ? 'picked, resolved when it starts'
              : 'none selected'}
        </span>
      </h4>

      <ManifestSkills manifest={manifest} />

      {editable ? (
        editing ? (
          <div className="task-skills__edit">
            <div className="chips">
              {installed.length === 0 ? <span className="muted">No skills installed.</span> : null}

              {installed.map((s) => {
                const on = picked.includes(s.name) || picked.includes(s.id);

                return (
                  <button
                    key={s.id}
                    className={`chip ${on ? 'chip--active' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      const next = on
                        ? picked.filter((x) => x !== s.name && x !== s.id)
                        : [...picked, s.name];

                      setPicked(next);
                      void runPreview(next);
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>

            {preview ? (
              <p className="muted">
                With the current selection mode the task gets:{' '}
                {(preview.result.selected ?? []).map((c) => `${c.name} (${c.origin})`).join(', ') ||
                  'no skills'}
                {preview.needs_decision ? '. Some picks conflict; keep one of them.' : '.'}
              </p>
            ) : null}

            <div className="skill-detail__actions">
              <Button
                size="sm"
                variant="primary"
                loading={busy === 'set-skills'}
                disabled={preview?.needs_decision}
                onClick={() =>
                  void onAct('set-skills', { task: t.id, skills: picked }).then(() =>
                    setEditing(false),
                  )
                }
              >
                Save skills
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setEditing(true);
              void runPreview(picked);
            }}
          >
            {t.skills?.length ? 'Change skills' : 'Pick skills'}
          </Button>
        )
      ) : null}

      <p className="muted">
        "Loaded (verified)" needs a record in the agent's own session; installing or naming a skill
        is not proof it was used or followed.
      </p>
    </div>
  );
}
