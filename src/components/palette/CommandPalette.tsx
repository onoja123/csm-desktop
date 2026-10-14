import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  ArrowDataTransferHorizontalIcon,
  Bookmark02Icon,
  Cancel01Icon,
  CommandLineIcon,
  ComputerTerminal01Icon,
  EraserIcon,
  LayoutTwoColumnIcon,
  LayoutTwoRowIcon,
  PlayIcon,
  Search01Icon,
  Settings02Icon,
  StopIcon,
  Tick02Icon,
  Undo02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { usePalette } from '@/store/palette';
import { useTerminal } from '@/terminal/store';
import { Icon } from '@/components/ui';
import { NAV } from '@/lib/navigation';
import { providerIcon } from '@/lib/provider-icons';
import { useStartAgent } from '@/store/start-agent-dialog';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { useCheckpointDialog } from '@/store/checkpoint-dialog';
import { api } from '@/lib/api';
import { handles } from '@/terminal/handles';
import { PROVIDER_LONG_NAMES, PROVIDER_NAMES, baseName } from '@/lib/format';
import { useData } from '@/store/data';
import type { PaletteItem } from '@/types';

export function CommandPalette() {
  const { isOpen, close, toggle } = usePalette();
  const nav = useNavigate();
  const { runs, accounts, approvals } = useData();
  const openStart = useStartAgent((s) => s.open);
  const openHandoff = useHandoffDialog((s) => s.open);
  const openCheckpoint = useCheckpointDialog((s) => s.open);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === 'k' || (e.shiftKey && e.key.toLowerCase() === 'p'))
      ) {
        e.preventDefault();
        toggle();
      }

      if (e.key === 'Escape' && usePalette.getState().isOpen) {
        e.preventDefault();
        close();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        openStart();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, close, openStart]);

  useEffect(() => {
    if (!isOpen) setQuery('');
    else setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const live = runs.runs.filter((r) => r.status === 'running');
    const list: PaletteItem[] = [];

    for (const n of NAV)
      list.push({
        id: `nav:${n.to}`,
        group: 'Go to',
        label: n.label,
        icon: n.icon,
        run: () => nav(n.to),
      });

    list.push({
      id: 'nav:/settings',
      group: 'Go to',
      label: 'Settings',
      icon: Settings02Icon,
      run: () => nav('/settings'),
    });

    list.push({
      id: 'act:start',
      group: 'Actions',
      label: 'Start agent',
      hint: '⌘N',
      icon: PlayIcon,
      run: () => openStart(),
    });

    list.push({
      id: 'act:checkpoint',
      group: 'Actions',
      label: 'Save checkpoint',
      icon: Bookmark02Icon,
      keywords: 'context handoff',
      run: () => openCheckpoint(),
    });

    const term = useTerminal.getState();

    const go = (fn: () => unknown) => () => {
      nav('/terminal');
      setTimeout(() => void fn(), 50);
    };

    list.push({
      id: 'term:new',
      group: 'Terminal',
      label: 'New terminal',
      hint: '⌘T',
      icon: ComputerTerminal01Icon,
      run: go(() => term.newTab()),
    });

    list.push({
      id: 'term:split-row',
      group: 'Terminal',
      label: 'New split (side by side)',
      hint: '⌘D',
      icon: LayoutTwoColumnIcon,
      run: go(() => term.split('row')),
    });

    list.push({
      id: 'term:split-col',
      group: 'Terminal',
      label: 'New split (stacked)',
      hint: '⌘⇧D',
      icon: LayoutTwoRowIcon,
      run: go(() => term.split('column')),
    });

    list.push({
      id: 'term:close',
      group: 'Terminal',
      label: 'Close terminal',
      hint: '⌘W',
      icon: Cancel01Icon,
      run: go(() => {
        const t = term.activeTab();

        if (t) void term.closePane(t.activePaneId);
      }),
    });

    list.push({
      id: 'term:next',
      group: 'Terminal',
      label: 'Focus next pane',
      hint: '⌘⌥→',
      icon: ArrowDataTransferHorizontalIcon,
      run: go(() => term.cycleFocus(1)),
    });

    list.push({
      id: 'term:prev',
      group: 'Terminal',
      label: 'Focus previous pane',
      hint: '⌘⌥←',
      icon: ArrowDataTransferHorizontalIcon,
      run: go(() => term.cycleFocus(-1)),
    });

    list.push({
      id: 'term:clear',
      group: 'Terminal',
      label: 'Clear terminal',
      hint: '⌘⇧K',
      icon: EraserIcon,
      run: go(() => {
        const t = term.activeTab();

        if (t) handles.get(t.activePaneId)?.term.clear();
      }),
    });

    list.push({
      id: 'term:restart',
      group: 'Terminal',
      label: 'Restart shell',
      icon: Undo02Icon,
      run: go(() => {
        const t = term.activeTab();

        if (t) void term.restartShell(t.activePaneId);
      }),
    });

    list.push({
      id: 'term:kill',
      group: 'Terminal',
      label: 'Kill process (Ctrl+C)',
      icon: StopIcon,
      run: go(() => {
        const t = term.activeTab();

        if (t) void term.killProcess(t.activePaneId);
      }),
    });

    list.push({
      id: 'term:search',
      group: 'Terminal',
      label: 'Search output',
      hint: '⌘F',
      icon: Search01Icon,
      run: go(() => term.setSearchOpen(true)),
    });

    list.push({
      id: 'term:copy',
      group: 'Terminal',
      label: 'Copy selection',
      hint: '⌘C',
      icon: CommandLineIcon,
      run: go(() => {
        const t = term.activeTab();
        const h = t && handles.get(t.activePaneId);

        if (h?.term.hasSelection()) void navigator.clipboard.writeText(h.term.getSelection());
      }),
    });

    list.push({
      id: 'term:paste',
      group: 'Terminal',
      label: 'Paste',
      hint: '⌘V',
      icon: CommandLineIcon,
      run: go(async () => {
        const t = term.activeTab();
        const h = t && handles.get(t.activePaneId);

        if (h) h.term.paste(await navigator.clipboard.readText());
      }),
    });

    list.push({
      id: 'term:selectall',
      group: 'Terminal',
      label: 'Select all',
      icon: CommandLineIcon,
      run: go(() => {
        const t = term.activeTab();

        handles.get(t?.activePaneId ?? '')?.term.selectAll();
      }),
    });

    for (const r of live) {
      list.push({
        id: `agent:${r.id}`,
        group: 'Agents',
        label: `${PROVIDER_LONG_NAMES[r.provider]} · ${r.account}`,
        hint: r.task.summary ?? baseName(r.project_dir),
        icon: providerIcon(r.provider),
        keywords: r.project_dir,
        run: () => nav(`/agents/${r.id}`),
      });

      list.push({
        id: `term:${r.id}`,
        group: 'Actions',
        label: `Open terminal: ${PROVIDER_NAMES[r.provider]} · ${r.account}`,
        icon: CommandLineIcon,
        run: () => nav(`/terminal?run=${encodeURIComponent(r.id)}`),
      });

      list.push({
        id: `shell:${r.id}`,
        group: 'Actions',
        label: `Shell in ${baseName(r.project_dir)}`,
        icon: ComputerTerminal01Icon,
        run: () => nav(`/terminal?cwd=${encodeURIComponent(r.project_dir)}`),
      });

      list.push({
        id: `stop:${r.id}`,
        group: 'Actions',
        label: `Stop ${PROVIDER_NAMES[r.provider]} · ${r.account}`,
        icon: StopIcon,
        run: () => api.stopRun(r.id),
      });

      list.push({
        id: `handoff:${r.id}`,
        group: 'Actions',
        label: `Create handoff from ${PROVIDER_NAMES[r.provider]} · ${r.account}`,
        icon: ArrowDataTransferHorizontalIcon,
        run: () =>
          openHandoff({
            projectDir: r.project_dir,
            fromProvider: r.provider,
            fromAccount: r.account,
          }),
      });
    }

    for (const a of accounts) {
      list.push({
        id: `acct:${a.name}`,
        group: 'Accounts',
        label: `${a.name}`,
        hint: `${a.provider_name} · ${a.health.replace('_', ' ')}`,
        icon: providerIcon(a.provider),
        keywords: a.provider_name,
        run: () => nav(`/accounts/${encodeURIComponent(a.name)}`),
      });

      if (!a.active && a.enabled && a.status === 'ready') {
        list.push({
          id: `switch:${a.name}`,
          group: 'Actions',
          label: `Switch ${a.provider_name} to ${a.name}`,
          icon: UserIcon,
          run: () => api.switchAccount(a.name),
        });
      }
    }

    for (const p of approvals.pending) {
      list.push({
        id: `approve:${p.id}`,
        group: 'Approvals',
        label: `Approve: ${p.command ?? p.tool_name}`,
        icon: Tick02Icon,
        run: () => api.decide(p.id, 'allow'),
      });

      list.push({
        id: `reject:${p.id}`,
        group: 'Approvals',
        label: `Reject: ${p.command ?? p.tool_name}`,
        icon: Cancel01Icon,
        run: () => api.decide(p.id, 'deny'),
      });
    }

    return list;
  }, [runs, accounts, approvals, nav, openStart, openHandoff, openCheckpoint]);

  if (!isOpen) return null;

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="palette__backdrop" onMouseDown={close}>
      <Command
        className="palette"
        label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          ref={inputRef}
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search agents, accounts, tasks, actions…"
          className="palette__input"
        />

        <Command.List className="palette__list">
          <Command.Empty className="palette__empty">Nothing matches.</Command.Empty>

          {groups.map((g) => (
            <Command.Group key={g} heading={g} className="palette__group">
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <Command.Item
                    key={i.id}
                    value={`${i.label} ${i.hint ?? ''} ${i.keywords ?? ''}`}
                    className="palette__item"
                    onSelect={() => {
                      close();
                      void i.run();
                    }}
                  >
                    <Icon icon={i.icon} size="md" />
                    <span className="palette__label">{i.label}</span>
                    {i.hint ? <span className="palette__hint">{i.hint}</span> : null}
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
