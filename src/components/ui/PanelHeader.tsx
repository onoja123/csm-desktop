import type { ReactNode } from 'react';

export function PanelHeader({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel__header">
      <div className="panel__title">
        <h3>{title}</h3>
        {meta ? <span className="panel__meta">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}
