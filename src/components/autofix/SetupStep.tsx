import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '@/components/ui';

export function SetupStep({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <li className={`sc-step ${done ? 'sc-step--done' : ''}`}>
      <span className="sc-step__n">{done ? <Icon icon={Check} size="sm" /> : n}</span>
      <div className="sc-step__body">
        <h4 className="sc-step__title">{title}</h4>
        {children}
      </div>
    </li>
  );
}
