import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { parseSteps, stepsOf, taskOf } from '@/lib/checkpoint';
import type { Handoff } from '@/types';

export function CheckpointEditForm({ handoff, onSaved, onCancel }: { handoff: Handoff; onSaved: (h: Handoff) => void; onCancel: () => void }) {
  const [task, setTask] = useState(taskOf(handoff).text ?? '');
  const [steps, setSteps] = useState(stepsOf(handoff).join('\n'));
  const [notes, setNotes] = useState(handoff.edits?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onSaved(await api.editCheckpoint(handoff.project, handoff.id, { task: task.trim(), next_steps: parseSteps(steps), notes: notes.trim() }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="checkpoint-edit"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span className="field__label">Task</span>
        <textarea className="input input--area" rows={2} value={task} onChange={(e) => setTask(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Next steps, one per line</span>
        <textarea className="input input--area mono" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Notes for the next agent</span>
        <textarea className="input input--area" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Constraints, decisions, what not to try again" />
        <span className="field__hint">Your edits are kept next to what CSM extracted; the session record is not changed. Secrets are redacted.</span>
      </label>
      {error ? <p className="form-error selectable">{error}</p> : null}
      <div className="panel__actions">
        <Button type="submit" variant="primary" loading={busy}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
