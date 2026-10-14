import type { ReactNode } from 'react';
import { StatusDot } from './StatusDot';
import type { StatusTone } from '@/types';

export function StatusText({ tone, children, pulse }: { tone: StatusTone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={`status-text tone-${tone}`}>
      <StatusDot tone={tone} pulse={pulse} />
      {children}
    </span>
  );
}
