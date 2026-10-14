import type { LucideIcon } from 'lucide-react';
import type { IconSize } from '@/types';

const ICON_PX: Record<IconSize, number> = { sm: 14, md: 18, lg: 22, xl: 28, '2xl': 36, hero: 48 };

export function Icon({ icon: I, size = 'md', className = '', strokeWidth }: { icon: LucideIcon; size?: IconSize; className?: string; strokeWidth?: number }) {
  return <I size={ICON_PX[size]} strokeWidth={strokeWidth ?? (size === 'hero' || size === '2xl' ? 1.5 : 1.75)} className={`icon ${className}`} aria-hidden="true" />;
}
