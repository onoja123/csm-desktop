import { create } from 'zustand';
import { pty } from './pty';
import { leaf, neighbour, paneIds, removePane, resizeSplit, splitPane } from './layout';
import { DEFAULT_SETTINGS } from './defaults';
import type {
  LayoutNode,
  PaneMap,
  PersistedTerminalState,
  ShellPane,
  TerminalSettings,
  TerminalState,
} from '@/types';

const STATE_KEY = 'csm.terminal.state';
const SETTINGS_KEY = 'csm.terminal.settings';

let counter = 0;
let hydrating = false;

const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function titleFromCwd(cwd: string, home: string): string {
  const shown = home && cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
  const base = shown.replace(/\/+$/, '').split('/').pop();

  return base || shown || 'shell';
}

function loadSettings(): TerminalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<TerminalSettings>) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadState(): PersistedTerminalState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersistedTerminalState) : null;

    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

async function spawnShell(pane: ShellPane, settings: TerminalSettings): Promise<ShellPane> {
  const info = await pty.spawn({
    shell: pane.shell || settings.shell || undefined,
    cwd: pane.cwd || settings.defaultCwd || undefined,
  });

  return { ...pane, sessionId: info.id, cwd: info.cwd, shell: info.shell, exited: undefined };
}

export const useTerminal = create<TerminalState>((set, get) => ({
  tabs: [],
  panes: {},
  settings: loadSettings(),
  shells: [],
  homeDir: '',
  hydrated: false,
  searchOpen: false,
  closedTabs: [],

  activeTab: () => get().tabs.find((t) => t.id === get().activeTabId),
  activePane: () => {
    const tab = get().activeTab();

    return tab ? get().panes[tab.activePaneId] : undefined;
  },

  persist() {
    const { tabs, panes, activeTabId } = get();

    const persisted: PersistedTerminalState = {
      version: 1,
      tabs: tabs
        .map((t) => {
          const ids = paneIds(t.layout).filter((id) => panes[id]?.kind === 'shell');

          const layout =
            ids.length === paneIds(t.layout).length ? t.layout : shellOnlyLayout(t.layout, panes);

          if (!layout) return null;

          return {
            panes: paneIds(layout).map((id) => {
              const p = panes[id] as ShellPane;

              return { kind: 'shell' as const, cwd: p.cwd, shell: p.shell };
            }),
            layout: renumber(layout),
            activeIndex: Math.max(0, paneIds(layout).indexOf(t.activePaneId)),
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null),
      activeTab: Math.max(
        0,
        tabs.findIndex((t) => t.id === activeTabId),
      ),
    };

    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(persisted));
    } catch {
      // nothing to do without storage
    }
  },

  async hydrate() {
    if (get().hydrated || hydrating) return;

    hydrating = true;

    const [shells, homeDir] = await Promise.all([
      pty.shells().catch(() => []),
      pty.defaultCwd().catch(() => ''),
    ]);

    set({ shells, homeDir });

    const saved = loadState();

    if (saved && saved.tabs.length > 0) {
      for (const t of saved.tabs) {
        const ids = paneIds(t.layout);
        const panes: PaneMap = {};
        const mapping = new Map<string, string>();

        for (let i = 0; i < ids.length; i++) {
          const spec = t.panes[i] ?? { kind: 'shell', cwd: '' };
          const id = nextId('pane');

          mapping.set(ids[i], id);

          const base: ShellPane = {
            kind: 'shell',
            id,
            cwd: spec.cwd,
            shell: spec.shell,
            title: titleFromCwd(spec.cwd, homeDir),
          };

          try {
            panes[id] = await spawnShell(base, get().settings);
          } catch (e) {
            panes[id] = {
              ...base,
              exited: { code: null },
              title: `${base.title} (${(e as Error).message})`,
            };
          }
        }

        const layout = remap(t.layout, mapping);
        const tabId = nextId('tab');

        set((s) => ({
          tabs: [
            ...s.tabs,
            {
              id: tabId,
              layout,
              activePaneId: paneIds(layout)[t.activeIndex] ?? paneIds(layout)[0],
            },
          ],
          panes: { ...s.panes, ...panes },
        }));
      }

      const tabs = get().tabs;

      set({ activeTabId: tabs[Math.min(saved.activeTab, tabs.length - 1)]?.id });
    } else if (get().tabs.length === 0) {
      await get().newTab();
    }

    // Marked last so a tab opened on arrival (an agent from "Open terminal") is not replaced by the default shell.
    set({ hydrated: true });
  },

  async newTab(opts) {
    const id = nextId('pane');
    const home = get().homeDir;
    const cwd = opts?.cwd ?? get().settings.defaultCwd ?? '';

    let pane: ShellPane = {
      kind: 'shell',
      id,
      cwd,
      shell: opts?.shell,
      title: titleFromCwd(cwd || home, home),
    };

    try {
      pane = await spawnShell(pane, get().settings);
      pane.title = titleFromCwd(pane.cwd, home);
    } catch (e) {
      pane = { ...pane, exited: { code: null }, title: `${pane.title} (${(e as Error).message})` };
    }

    const tabId = nextId('tab');

    set((s) => ({
      tabs: [...s.tabs, { id: tabId, layout: leaf(id), activePaneId: id }],
      panes: { ...s.panes, [id]: pane },
      activeTabId: tabId,
    }));

    get().persist();
    return tabId;
  },

  openAgentTab(runId, title) {
    const existing = get().tabs.find((t) =>
      paneIds(t.layout).some(
        (id) =>
          get().panes[id]?.kind === 'agent' &&
          (get().panes[id] as { runId: string }).runId === runId,
      ),
    );

    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    const id = nextId('pane');
    const tabId = nextId('tab');

    set((s) => ({
      tabs: [...s.tabs, { id: tabId, layout: leaf(id), activePaneId: id }],
      panes: { ...s.panes, [id]: { kind: 'agent', id, runId, title } },
      activeTabId: tabId,
    }));

    return tabId;
  },

  async closeTab(tabId, force = false) {
    const tab = get().tabs.find((t) => t.id === tabId);

    if (!tab) return false;

    const ids = paneIds(tab.layout);

    if (!force && get().settings.confirmCloseRunning) {
      for (const id of ids) {
        const p = get().panes[id];

        if (p?.kind === 'shell' && p.sessionId && !p.exited) {
          const fg = await pty.foreground(p.sessionId).catch(() => null);

          if (fg && !fg.is_shell) {
            if (!window.confirm(`${fg.name} is still running in this terminal. Close it anyway?`))
              return false;

            break;
          }
        }
      }
    }

    const snapshot = get();

    const shellPanes = ids
      .map((id) => snapshot.panes[id])
      .filter((p): p is ShellPane => p?.kind === 'shell');

    for (const p of shellPanes) if (p.sessionId) void pty.kill(p.sessionId).catch(() => undefined);

    const closedLayout = shellOnlyLayout(tab.layout, snapshot.panes);

    set((s) => {
      const panes = { ...s.panes };

      ids.forEach((id) => delete panes[id]);

      const tabs = s.tabs.filter((t) => t.id !== tabId);
      const idx = s.tabs.findIndex((t) => t.id === tabId);

      const activeTabId =
        s.activeTabId === tabId ? tabs[Math.min(idx, tabs.length - 1)]?.id : s.activeTabId;

      const closedTabs = closedLayout
        ? [
            {
              panes: shellPanes.map((p) => ({
                kind: 'shell' as const,
                cwd: p.cwd,
                shell: p.shell,
              })),
              layout: renumber(closedLayout),
              activeIndex: 0,
            },
            ...s.closedTabs,
          ].slice(0, 10)
        : s.closedTabs;

      return { tabs, panes, activeTabId, closedTabs };
    });

    get().persist();
    return true;
  },

  async reopenTab() {
    const [last, ...rest] = get().closedTabs;

    if (!last) return;

    set({ closedTabs: rest });

    const first = last.panes[0];
    const tabId = await get().newTab({ cwd: first?.cwd, shell: first?.shell });

    for (let i = 1; i < last.panes.length; i++) {
      set({ activeTabId: tabId });
      await get().split('row', { cwd: last.panes[i].cwd });
    }
  },

  activateTab: (tabId) => {
    set({ activeTabId: tabId });
    get().persist();
  },

  cycleTab(step) {
    const { tabs, activeTabId } = get();

    if (tabs.length < 2) return;

    const i = tabs.findIndex((t) => t.id === activeTabId);

    set({ activeTabId: tabs[(i + step + tabs.length) % tabs.length].id });
  },

  async split(direction, opts) {
    const tab = get().activeTab();

    if (!tab) return undefined;

    const current = get().panes[tab.activePaneId];
    const id = nextId('pane');
    const home = get().homeDir;
    const cwd = opts?.cwd ?? (current?.kind === 'shell' ? current.cwd : get().settings.defaultCwd);
    let pane: ShellPane = { kind: 'shell', id, cwd, title: titleFromCwd(cwd || home, home) };

    try {
      pane = await spawnShell(pane, get().settings);
      pane.title = titleFromCwd(pane.cwd, home);
    } catch (e) {
      pane = { ...pane, exited: { code: null }, title: `${pane.title} (${(e as Error).message})` };
    }

    set((s) => ({
      panes: { ...s.panes, [id]: pane },
      tabs: s.tabs.map((t) =>
        t.id === tab.id
          ? { ...t, layout: splitPane(t.layout, tab.activePaneId, id, direction), activePaneId: id }
          : t,
      ),
    }));

    get().persist();
    return id;
  },

  async closePane(paneId, force = false) {
    const tab = get().tabs.find((t) => paneIds(t.layout).includes(paneId));

    if (!tab) return false;
    if (paneIds(tab.layout).length === 1) return get().closeTab(tab.id, force);

    const p = get().panes[paneId];

    if (p?.kind === 'shell' && p.sessionId && !p.exited) {
      if (!force && get().settings.confirmCloseRunning) {
        const fg = await pty.foreground(p.sessionId).catch(() => null);

        if (
          fg &&
          !fg.is_shell &&
          !window.confirm(`${fg.name} is still running in this pane. Close it anyway?`)
        )
          return false;
      }

      void pty.kill(p.sessionId).catch(() => undefined);
    }

    set((s) => {
      const panes = { ...s.panes };

      delete panes[paneId];
      return {
        panes,
        tabs: s.tabs.map((t) => {
          if (t.id !== tab.id) return t;

          const layout = removePane(t.layout, paneId) ?? t.layout;
          const remaining = paneIds(layout);

          return {
            ...t,
            layout,
            activePaneId: remaining.includes(t.activePaneId) ? t.activePaneId : remaining[0],
          };
        }),
      };
    });

    get().persist();
    return true;
  },

  focusPane(paneId) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        paneIds(t.layout).includes(paneId) ? { ...t, activePaneId: paneId } : t,
      ),
    }));
  },

  cycleFocus(step) {
    const tab = get().activeTab();

    if (!tab) return;

    get().focusPane(neighbour(tab.layout, tab.activePaneId, step));
  },

  resize(tabId, path, index, delta) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? { ...t, layout: resizeSplit(t.layout, path, index, delta) } : t,
      ),
    }));
  },

  async restartShell(paneId) {
    const p = get().panes[paneId];

    if (p?.kind !== 'shell') return;
    if (p.sessionId && !p.exited) void pty.kill(p.sessionId).catch(() => undefined);

    let next: ShellPane;

    try {
      next = await spawnShell({ ...p, sessionId: undefined, exited: undefined }, get().settings);
      next.title = titleFromCwd(next.cwd, get().homeDir);
    } catch (e) {
      next = {
        ...p,
        sessionId: undefined,
        exited: { code: null },
        title: `${p.title} (${(e as Error).message})`,
      };
    }

    set((s) => ({ panes: { ...s.panes, [paneId]: next } }));
  },

  async killProcess(paneId) {
    const p = get().panes[paneId];

    if (p?.kind !== 'shell' || !p.sessionId) return;

    await pty.writeBytes(p.sessionId, new Uint8Array([0x03]));
  },

  markExited(sessionId, code) {
    set((s) => {
      const panes = { ...s.panes };

      for (const p of Object.values(panes)) {
        if (p.kind === 'shell' && p.sessionId === sessionId)
          panes[p.id] = { ...p, exited: { code } };
      }

      return { panes };
    });
  },

  setPaneTitle(paneId, title) {
    set((s) =>
      s.panes[paneId] ? { panes: { ...s.panes, [paneId]: { ...s.panes[paneId], title } } } : {},
    );
  },

  setPaneCwd(paneId, cwd) {
    set((s) => {
      const p = s.panes[paneId];

      if (!p || p.kind !== 'shell' || p.cwd === cwd) return {};

      return { panes: { ...s.panes, [paneId]: { ...p, cwd } } };
    });

    get().persist();
  },

  setSearchOpen: (open) => set({ searchOpen: open }),

  updateSettings(patch) {
    set((s) => ({ settings: { ...s.settings, ...patch } }));

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(get().settings));
    } catch {
      // ignore
    }
  },
}));

function shellOnlyLayout(node: LayoutNode, panes: PaneMap): LayoutNode | null {
  let out: LayoutNode | null = node;

  for (const id of paneIds(node)) {
    if (panes[id]?.kind !== 'shell' && out) out = removePane(out, id);
  }

  return out;
}

function renumber(node: LayoutNode): LayoutNode {
  let n = 0;

  const walk = (x: LayoutNode): LayoutNode =>
    x.type === 'leaf'
      ? { type: 'leaf', paneId: String(n++) }
      : { ...x, children: x.children.map(walk) };

  return walk(node);
}

function remap(node: LayoutNode, mapping: Map<string, string>): LayoutNode {
  return node.type === 'leaf'
    ? { type: 'leaf', paneId: mapping.get(node.paneId) ?? node.paneId }
    : { ...node, children: node.children.map((c) => remap(c, mapping)) };
}
