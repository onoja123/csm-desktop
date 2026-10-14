import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Icon } from '@/components/ui';
import { slugify } from '@/lib/build';
import { api } from '@/lib/api';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import type { Build, PlanEditTask, PlanTaskDraft, ProviderID } from '@/types';

let seq = 0;

function toDraft(t: PlanEditTask): PlanTaskDraft {
  return { ...t, key: ++seq, acceptanceText: (t.acceptance ?? []).join('\n'), filesText: (t.files ?? []).join(', ') };
}

export function PlanEditor({ build, onSaved, onCancel }: { build: Build; onSaved: (b: Build) => void; onCancel: () => void }) {
  const [summary, setSummary] = useState(build.plan.summary ?? '');
  const [tasks, setTasks] = useState<PlanTaskDraft[]>(() => build.tasks.filter((t) => t.kind !== 'fix').map((t) => toDraft({ ...t, provider: t.provider ?? '' })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const update = (key: number, patch: Partial<PlanTaskDraft>) => setTasks((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const move = (i: number, by: number) =>
    setTasks((ts) => {
      const next = [...ts];
      const [t] = next.splice(i, 1);
      next.splice(Math.max(0, Math.min(next.length, i + by)), 0, t);
      return next;
    });
  const remove = (key: number) =>
    setTasks((ts) => {
      const gone = ts.find((t) => t.key === key)?.id;
      return ts.filter((t) => t.key !== key).map((t) => ({ ...t, depends_on: (t.depends_on ?? []).filter((d) => d !== gone) }));
    });
  const add = () =>
    setTasks((ts) => [...ts, toDraft({ id: slugify('task', ts.map((t) => t.id)), title: '', objective: '', provider: '' })]);

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const b = await api.editPlan(build.id, {
        summary,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          objective: t.objective,
          scope: t.scope,
          context: t.context,
          provider: t.provider,
          depends_on: t.depends_on,
          acceptance: t.acceptanceText.split('\n').map((s) => s.trim()).filter(Boolean),
          files: t.filesText.split(',').map((s) => s.trim()).filter(Boolean),
        })),
      });
      onSaved(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="plan-editor">
      <Field label="Plan summary">
        <textarea className="input input--area" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      {tasks.map((t, i) => (
        <div key={t.key} className="plan-editor__task panel">
          <div className="plan-editor__head">
            <input className="input input--sm mono plan-editor__id" value={t.id} onChange={(e) => update(t.key, { id: e.target.value })} aria-label="Task id" spellCheck={false} />
            <input className="input input--sm" value={t.title} onChange={(e) => update(t.key, { title: e.target.value })} placeholder="Title" aria-label="Task title" />
            <select className="input input--sm plan-editor__agent" value={t.provider ?? ''} onChange={(e) => update(t.key, { provider: e.target.value as ProviderID | '' })} aria-label="Agent">
              <option value="">Any ready agent</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LONG_NAMES[p]}
                </option>
              ))}
            </select>
            <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              <Icon icon={ArrowUp} size="sm" />
            </button>
            <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === tasks.length - 1} aria-label="Move down">
              <Icon icon={ArrowDown} size="sm" />
            </button>
            <button className="icon-btn" onClick={() => remove(t.key)} aria-label="Remove task">
              <Icon icon={Trash2} size="sm" />
            </button>
          </div>
          <textarea className="input input--area" rows={2} value={t.objective} onChange={(e) => update(t.key, { objective: e.target.value })} placeholder="Objective" aria-label="Objective" />
          <div className="plan-editor__grid">
            <textarea className="input input--area" rows={3} value={t.acceptanceText} onChange={(e) => update(t.key, { acceptanceText: e.target.value })} placeholder="Acceptance criteria, one per line" aria-label="Acceptance criteria" />
            <div className="plan-editor__col">
              <input className="input input--sm mono" value={t.filesText} onChange={(e) => update(t.key, { filesText: e.target.value })} placeholder="Files likely to change, comma separated" aria-label="Files" spellCheck={false} />
              <div className="chips" aria-label="Depends on">
                <span className="muted plan-editor__label">After</span>
                {tasks
                  .filter((o) => o.key !== t.key)
                  .map((o) => {
                    const on = (t.depends_on ?? []).includes(o.id);
                    return (
                      <button
                        key={o.key}
                        className={`chip ${on ? 'chip--active' : ''}`}
                        aria-pressed={on}
                        onClick={() => update(t.key, { depends_on: on ? (t.depends_on ?? []).filter((d) => d !== o.id) : [...(t.depends_on ?? []), o.id] })}
                      >
                        {o.id}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button icon={Plus} onClick={add}>
        Add task
      </Button>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="plan-editor__actions">
        <Button onClick={onCancel}>Discard changes</Button>
        <Button variant="primary" onClick={() => void save()} loading={busy}>
          Save plan
        </Button>
      </div>
    </div>
  );
}
