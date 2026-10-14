import type { LayoutNode, SplitDirection } from '@/types';

export function leaf(paneId: string): LayoutNode {
  return { type: 'leaf', paneId };
}

export function paneIds(node: LayoutNode): string[] {
  return node.type === 'leaf' ? [node.paneId] : node.children.flatMap(paneIds);
}

// Splits the leaf holding `targetId`; a split in the same direction as its parent joins that parent instead of nesting.
export function splitPane(node: LayoutNode, targetId: string, newId: string, direction: SplitDirection): LayoutNode {
  if (node.type === 'leaf') {
    if (node.paneId !== targetId) return node;
    return { type: 'split', direction, children: [node, leaf(newId)], sizes: [0.5, 0.5] };
  }
  const idx = node.children.findIndex((c) => c.type === 'leaf' && c.paneId === targetId);
  if (idx >= 0 && node.direction === direction) {
    const children = [...node.children];
    children.splice(idx + 1, 0, leaf(newId));
    const share = node.sizes[idx] / 2;
    const sizes = [...node.sizes];
    sizes.splice(idx, 1, share, share);
    return { ...node, children, sizes };
  }
  return { ...node, children: node.children.map((c) => splitPane(c, targetId, newId, direction)) };
}

export function removePane(node: LayoutNode, targetId: string): LayoutNode | null {
  if (node.type === 'leaf') return node.paneId === targetId ? null : node;
  const kept: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((c, i) => {
    const next = removePane(c, targetId);
    if (next) {
      kept.push(next);
      sizes.push(node.sizes[i]);
    }
  });
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0];
  const total = sizes.reduce((a, b) => a + b, 0);
  return { ...node, children: kept, sizes: sizes.map((s) => s / total) };
}

export function resizeSplit(node: LayoutNode, path: number[], index: number, delta: number): LayoutNode {
  if (path.length === 0) {
    if (node.type !== 'split') return node;
    const sizes = [...node.sizes];
    const min = 0.1;
    const next = Math.min(Math.max(sizes[index] + delta, min), sizes[index] + sizes[index + 1] - min);
    const moved = next - sizes[index];
    sizes[index] = next;
    sizes[index + 1] -= moved;
    return { ...node, sizes };
  }
  if (node.type !== 'split') return node;
  const [head, ...rest] = path;
  return { ...node, children: node.children.map((c, i) => (i === head ? resizeSplit(c, rest, index, delta) : c)) };
}

export function neighbour(node: LayoutNode, currentId: string, step: 1 | -1): string {
  const ids = paneIds(node);
  const i = ids.indexOf(currentId);
  if (i < 0) return ids[0];
  return ids[(i + step + ids.length) % ids.length];
}
