import { PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { Button, TitledList } from '@/components/ui';
import { PROVIDER_LONG_NAMES } from '@/lib/format';
import type { Build } from '@/types';

export function BuildPlanTab({ build, onEdit }: { build: Build; onEdit: () => void }) {
  const p = build.plan;
  const editable = build.status === 'awaiting_plan_approval';
  if (!build.tasks.length && !p.summary) return <p className="muted">{build.status === 'planning' ? 'Waiting for the planner.' : 'No plan.'}</p>;
  return (
    <div className="build-plan">
      <div className="build-plan__head">
        <span className="muted">{p.source ? `Drafted by ${p.source}${p.edited_by_user ? ', edited by you' : ''}` : ''}</span>
        {editable ? (
          <Button size="sm" icon={PencilEdit01Icon} onClick={onEdit}>
            Edit plan
          </Button>
        ) : null}
      </div>
      {p.summary ? <p className="selectable">{p.summary}</p> : null}
      {p.layers?.length ? <TitledList title="Parts of the codebase" items={p.layers} /> : null}
      {p.considerations?.length ? <TitledList title="Considerations" items={p.considerations} /> : null}
      {p.suggested_checks?.length ? <TitledList title="Checks the planner suggested" note="shown only; CSM runs the repository's own commands" items={p.suggested_checks} mono /> : null}
      <div className="build-plan__tasks">
        {build.tasks.map((t) => (
          <div key={t.id} className="build-plan__task">
            <div className="build-plan__task-head">
              <span className="mono muted">{t.id}</span>
              <strong>{t.title}</strong>
              <span className="muted">{t.provider ? PROVIDER_LONG_NAMES[t.provider] : 'any ready agent'}</span>
            </div>
            <p className="selectable">{t.objective}</p>
            {t.acceptance?.length ? (
              <ul className="build-plan__criteria">
                {t.acceptance.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {t.depends_on?.length ? <p className="muted">After {t.depends_on.join(', ')}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
