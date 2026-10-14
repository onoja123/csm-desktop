import type { IconSvgElement } from '@hugeicons/react';
import { Asterisk02Icon, BracesIcon, Cursor02Icon, Diamond02Icon, GithubIcon } from '@hugeicons/core-free-icons';
import type { ProviderID } from '@/types';

export const PROVIDER_ICON: Record<ProviderID, IconSvgElement> = {
  claude: Asterisk02Icon,
  codex: BracesIcon,
  gemini: Diamond02Icon,
  copilot: GithubIcon,
  cursor: Cursor02Icon,
};

export function providerIcon(id: string | undefined): IconSvgElement {
  return PROVIDER_ICON[id as ProviderID] ?? Asterisk02Icon;
}
