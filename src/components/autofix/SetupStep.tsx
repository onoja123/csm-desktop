import type { ReactNode } from 'react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui';

export function SetupStep({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <li className={`sc-step ${done ? 'sc-step--done' : ''}`}>
      <span className="sc-step__n">{done ? <Icon icon={Tick02Icon} size="sm" /> : n}</span>
      <div className="sc-step__body">
        <h4 className="sc-step__title">{title}</h4>
        {children}
      </div>
    </li>
  );
}
