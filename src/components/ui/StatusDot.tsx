import type { StatusTone } from '@/types';

export function StatusDot({ tone, pulse = false }: { tone: StatusTone; pulse?: boolean }) {
  return (
    <span
      className={`status-dot tone-${tone} ${pulse ? 'status-dot--pulse' : ''}`}
      aria-hidden="true"
    />
  );
}
