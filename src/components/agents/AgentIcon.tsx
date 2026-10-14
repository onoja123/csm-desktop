import { Asterisk, Braces, Gem, Github, MousePointer2, type LucideIcon } from 'lucide-react';
import { IconTile } from '@/components/ui';
import type { ProviderID } from '@/lib/types';
import type { Tone } from '@/design/tokens';

export const PROVIDER_ICON: Record<ProviderID, LucideIcon> = {
  claude: Asterisk,
  codex: Braces,
  gemini: Gem,
  copilot: Github,
  cursor: MousePointer2,
};

export function providerIcon(id: string | undefined): LucideIcon {
  return PROVIDER_ICON[id as ProviderID] ?? Asterisk;
}

export function AgentIcon({ provider, size = 'lg', tone }: { provider: string | undefined; size?: 'md' | 'lg' | 'xl' | 'hero'; tone?: Tone }) {
  return <IconTile icon={providerIcon(provider)} size={size} tone={tone} />;
}
