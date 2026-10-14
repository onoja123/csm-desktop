import { Check, Minus, X } from 'lucide-react';
import { Icon } from '@/components/ui';
import type { OutcomeFactState } from '@/types';

export function OutcomeCheckCircle({ state }: { state: OutcomeFactState }) {
  if (state === 'skipped')
    return (
      <span className="cc cc--skipped">
        <Icon icon={Minus} size="sm" />
      </span>
    );
  return (
    <span className={`cc cc--${state}`}>
      <Icon icon={state === 'failed' ? X : Check} size="sm" />
    </span>
  );
}
