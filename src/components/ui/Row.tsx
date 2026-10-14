import type { ReactNode } from 'react';

export function Row({
  label,
  children,
  mono = false,
}: {
  label: ReactNode;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="row">
      <span className="row__label">{label}</span>
      <span className={`row__value ${mono ? 'mono selectable' : ''}`}>{children}</span>
    </div>
  );
}
