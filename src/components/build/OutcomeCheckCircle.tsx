import { Cancel01Icon, MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui';
import type { OutcomeFactState } from '@/types';

export function OutcomeCheckCircle({ state }: { state: OutcomeFactState }) {
  if (state === 'skipped')
    return (
      <span className="cc cc--skipped">
        <Icon icon={MinusSignIcon} size="sm" />
      </span>
    );

  return (
    <span className={`cc cc--${state}`}>
      <Icon icon={state === 'failed' ? Cancel01Icon : Tick02Icon} size="sm" />
    </span>
  );
}
