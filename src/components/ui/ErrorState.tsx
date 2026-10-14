import type { ReactNode } from 'react';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import { IconTile } from './IconTile';

export function ErrorState({
  title,
  body,
  detail,
  action,
}: {
  title: string;
  body?: ReactNode;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <IconTile icon={Alert02Icon} size="hero" tone="warn" />
      <h2 className="state__title">{title}</h2>
      {body ? <p className="state__body">{body}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}

      {detail ? (
        <details className="state__details">
          <summary>View details</summary>
          <pre className="selectable">{detail}</pre>
        </details>
      ) : null}
    </div>
  );
}
