import { Asterisk, Braces, Gem, Github, type LucideIcon, MousePointer2 } from 'lucide-react';
import type { ProviderID } from '@/types';

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
