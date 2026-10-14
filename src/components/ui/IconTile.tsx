import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import type { IconSize, IconTileSize, StatusTone } from '@/types';

export function IconTile({ icon, size = 'lg', tone, className = '' }: { icon: LucideIcon; size?: IconTileSize; tone?: StatusTone; className?: string }) {
  const inner: IconSize = size === 'hero' ? 'hero' : size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : 'md';
  return (
    <span className={`icon-tile icon-tile--${size} ${tone ? `tone-${tone}` : ''} ${className}`}>
      <Icon icon={icon} size={inner} />
    </span>
  );
}
