import type { IconSvgElement } from '@hugeicons/react';

export interface NavItem {
  to: string;
  label: string;
  icon: IconSvgElement;
  end?: boolean;
}
