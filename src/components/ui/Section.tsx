import type { ReactNode } from 'react';

export function Section({
  title,
  meta,
  action,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__header">
        <h2 className="section__title">
          {title}
          {meta ? <span className="section__meta">{meta}</span> : null}
        </h2>

        {action}
      </div>

      {children}
    </section>
  );
}
