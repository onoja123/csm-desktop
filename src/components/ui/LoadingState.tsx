import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <HugeiconsIcon
        icon={Loading03Icon}
        strokeWidth={2}
        size={20}
        className="spin"
        aria-hidden="true"
      />

      <span>{label}</span>
    </div>
  );
}
