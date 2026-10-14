import { leaf, neighbour, paneIds, removePane, resizeSplit, splitPane } from '@/terminal/layout';
import { parseOsc7 } from '@/components/terminal/ShellTerminal';
import { titleFromCwd } from '@/terminal/store';

describe('terminal layout', () => {
  it('splits a leaf and joins splits in the same direction', () => {
    let node = leaf('a');
    node = splitPane(node, 'a', 'b', 'row');
    expect(node).toEqual({ type: 'split', direction: 'row', children: [leaf('a'), leaf('b')], sizes: [0.5, 0.5] });
    node = splitPane(node, 'b', 'c', 'row');
    expect(paneIds(node)).toEqual(['a', 'b', 'c']);
    expect(node.type === 'split' && node.sizes).toEqual([0.5, 0.25, 0.25]);
    node = splitPane(node, 'c', 'd', 'column');
    expect(paneIds(node)).toEqual(['a', 'b', 'c', 'd']);
    expect(node.type === 'split' && node.children[2].type).toBe('split');
  });

  it('removes panes and collapses single-child splits', () => {
    let node = splitPane(splitPane(leaf('a'), 'a', 'b', 'row'), 'b', 'c', 'column');
    node = removePane(node, 'c')!;
    expect(node).toEqual({ type: 'split', direction: 'row', children: [leaf('a'), leaf('b')], sizes: [0.5, 0.5] });
    node = removePane(node, 'a')!;
    expect(node).toEqual(leaf('b'));
    expect(removePane(node, 'b')).toBeNull();
  });

  it('resizes with a minimum pane share', () => {
    const node = splitPane(leaf('a'), 'a', 'b', 'row');
    const bigger = resizeSplit(node, [], 0, 0.2);
    expect(bigger.type === 'split' && bigger.sizes.map((s) => Math.round(s * 100))).toEqual([70, 30]);
    const clamped = resizeSplit(node, [], 0, 0.9);
    expect(clamped.type === 'split' && clamped.sizes.map((s) => Math.round(s * 100))).toEqual([90, 10]);
  });

  it('cycles focus through panes', () => {
    const node = splitPane(splitPane(leaf('a'), 'a', 'b', 'row'), 'b', 'c', 'row');
    expect(neighbour(node, 'c', 1)).toBe('a');
    expect(neighbour(node, 'a', -1)).toBe('c');
  });
});

describe('shell integration parsing', () => {
  it('reads the working directory from OSC 7', () => {
    expect(parseOsc7('file://mac.local/Users/me/Projects/csm')).toBe('/Users/me/Projects/csm');
    expect(parseOsc7('file:///tmp/a%20b')).toBe('/tmp/a b');
    expect(parseOsc7('nonsense')).toBeNull();
  });

  it('derives tab titles from the directory', () => {
    expect(titleFromCwd('/Users/me/Projects/csm', '/Users/me')).toBe('csm');
    expect(titleFromCwd('/Users/me', '/Users/me')).toBe('~');
    expect(titleFromCwd('/', '')).toBe('/');
  });
});

describe('terminal hydration', () => {
  it('keeps an agent tab opened before the terminal first loads', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const { useTerminal } = await import('@/terminal/store');
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'pty_shells') return [];
      if (cmd === 'pty_default_cwd') return '/Users/me';
      if (cmd === 'pty_spawn') return { id: 's1', pid: 1, shell: '/bin/zsh', cwd: '/Users/me', cols: 80, rows: 24 };
      return undefined;
    });
    localStorage.removeItem('csm.terminal.state');
    const tab = useTerminal.getState().openAgentTab('run-1', 'Invitation store');
    await useTerminal.getState().hydrate();
    const s = useTerminal.getState();
    expect(s.hydrated).toBe(true);
    expect(s.activeTabId).toBe(tab);
    expect(s.tabs).toHaveLength(1);
  });
});
