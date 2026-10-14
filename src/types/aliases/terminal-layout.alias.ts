import type { SplitDirection } from '../enums/terminal.enum';

export type LayoutNode =
  | { type: 'leaf'; paneId: string }
  | { type: 'split'; direction: SplitDirection; children: LayoutNode[]; sizes: number[] };
