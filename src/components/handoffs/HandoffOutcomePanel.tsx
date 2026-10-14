import { MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon, Panel, StatusText } from '@/components/ui';
import { ago } from '@/lib/format';
import { deliveryLabel, driftOf, handoffLabel, handoffTone } from '@/lib/checkpoint';
import type { Handoff } from '@/types';

export function HandoffOutcomePanel({ handoff }: { handoff: Handoff }) {
  const o = handoff.outcome;

  if (!o) return null;

  const checks = [
    { label: 'Brief delivered', ok: o.delivery === 'opening_instruction', text: deliveryLabel(o) },
    {
      label: 'Agent started',
      ok: o.started,
      text: o.started
        ? `${ago(o.started_at)}${o.project_dir ? ` in ${o.project_dir.split('/').pop()}` : ''}`
        : handoff.error || 'did not start',
    },
    {
      label: 'Repository',
      ok: driftOf(o.verification).length === 0,
      text: driftOf(o.verification).length
        ? 'changed since the checkpoint'
        : 'matched the checkpoint',
    },
  ];

  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Outcome</h3>
          <span className="panel__meta">observed by CSM</span>
        </div>

        <StatusText tone={handoffTone(handoff)}>{handoffLabel(handoff)}</StatusText>
      </div>

      <div className="checklist">
        {checks.map((c) => (
          <div key={c.label} className="checklist__row">
            <Icon
              icon={c.ok ? Tick02Icon : MinusSignIcon}
              size="sm"
              className={c.ok ? 'tone-ok' : 'tone-warn'}
            />

            <span className="checklist__label">{c.label}</span>
            <span className="checklist__text">{c.text}</span>
          </div>
        ))}
      </div>

      {o.problems?.length ? (
        <ul className="outcome-problems">
          {o.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      <p className="muted outcome-note">
        CSM can see that the agent started with the brief. Whether it followed the brief shows in
        its terminal.
      </p>
    </Panel>
  );
}
