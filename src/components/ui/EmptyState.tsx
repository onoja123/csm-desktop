import type { ReactNode } from 'react';
import type { IconSvgElement } from '@hugeicons/react';
import { IconTile } from './IconTile';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconSvgElement;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <IconTile icon={icon} size="hero" />
      <h2 className="state__title">{title}</h2>
      {body ? <p className="state__body">{body}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}
