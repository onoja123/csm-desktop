import type { IconSvgElement } from '@hugeicons/react';

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: IconSvgElement;
  keywords?: string;
  run: () => void | Promise<unknown>;
}

export interface PaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
