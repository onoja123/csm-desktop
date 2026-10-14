import { IconTile } from '@/components/ui';
import { providerIcon } from '@/lib/provider-icons';
import type { IconTileSize, StatusTone } from '@/types';

export function AgentIcon({ provider, size = 'lg', tone }: { provider: string | undefined; size?: IconTileSize; tone?: StatusTone }) {
  return <IconTile icon={providerIcon(provider)} size={size} tone={tone} />;
}
