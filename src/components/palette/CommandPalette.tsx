import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { ArrowLeftRight, Check, Play, Square, Terminal, UserRound, X, type LucideIcon } from 'lucide-react';
import { create } from 'zustand';
import { Icon } from '@/components/ui';
import { NAV } from '@/components/shell/Sidebar';
import { providerIcon } from '@/components/agents/AgentIcon';
import { useStartAgent } from '@/components/agents/StartAgentDialog';
import { useHandoffDialog } from '@/components/handoffs/HandoffDialog';
import { api } from '@/lib/api';
import { PROVIDER_LONG_NAMES, PROVIDER_NAMES, baseName } from '@/lib/format';
import { useData } from '@/store/data';

interface PaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const usePalette = create<PaletteState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void | Promise<unknown>;
}

export function CommandPalette() {
  const { isOpen, close, toggle } = usePalette();
  const nav = useNavigate();
  const { runs, accounts, approvals } = useData();
  const openStart = useStartAgent((s) => s.open);
  const openHandoff = useHandoffDialog((s) => s.open);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
  }, [isOpen]);

  const items = useMemo<Item[]>(() => {
    const live = runs.runs.filter((r) => r.status === 'running');
    const list: Item[] = [];

    for (const n of NAV) list.push({ id: `nav:${n.to}`, group: 'Go to', label: n.label, icon: n.icon, run: () => nav(n.to) });
    list.push({ id: 'nav:/settings', group: 'Go to', label: 'Settings', icon: NAV[0].icon, run: () => nav('/settings') });

    list.push({ id: 'act:start', group: 'Actions', label: 'Start agent', hint: '⌘N', icon: Play, run: () => openStart() });

    for (const r of live) {
      list.push({ id: `agent:${r.id}`, group: 'Agents', label: `${PROVIDER_LONG_NAMES[r.provider]} · ${r.account}`, hint: r.task.summary ?? baseName(r.project_dir), icon: providerIcon(r.provider), keywords: r.project_dir, run: () => nav(`/agents/${r.id}`) });
      list.push({ id: `term:${r.id}`, group: 'Actions', label: `Open terminal: ${PROVIDER_NAMES[r.provider]} · ${r.account}`, icon: Terminal, run: () => nav(`/agents/${r.id}?tab=output`) });
      list.push({ id: `stop:${r.id}`, group: 'Actions', label: `Stop ${PROVIDER_NAMES[r.provider]} · ${r.account}`, icon: Square, run: () => api.stopRun(r.id) });
      list.push({ id: `handoff:${r.id}`, group: 'Actions', label: `Create handoff from ${PROVIDER_NAMES[r.provider]} · ${r.account}`, icon: ArrowLeftRight, run: () => openHandoff({ projectDir: r.project_dir, fromProvider: r.provider, fromAccount: r.account }) });
    }

    for (const a of accounts) {
      list.push({ id: `acct:${a.name}`, group: 'Accounts', label: `${a.name}`, hint: `${a.provider_name} · ${a.health.replace('_', ' ')}`, icon: providerIcon(a.provider), keywords: a.provider_name, run: () => nav(`/accounts/${encodeURIComponent(a.name)}`) });
      if (!a.active && a.enabled && a.status === 'ready') {
        list.push({ id: `switch:${a.name}`, group: 'Actions', label: `Switch ${a.provider_name} to ${a.name}`, icon: UserRound, run: () => api.switchAccount(a.name) });
      }
    }

    for (const p of approvals.pending) {
      list.push({ id: `approve:${p.id}`, group: 'Approvals', label: `Approve: ${p.command ?? p.tool_name}`, icon: Check, run: () => api.decide(p.id, 'allow') });
      list.push({ id: `reject:${p.id}`, group: 'Approvals', label: `Reject: ${p.command ?? p.tool_name}`, icon: X, run: () => api.decide(p.id, 'deny') });
    }

    return list;
  }, [runs, accounts, approvals, nav, openStart, openHandoff]);

  if (!isOpen) return null;

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="palette__backdrop" onMouseDown={close}>
      <Command className="palette" label="Command palette" onMouseDown={(e) => e.stopPropagation()} loop>
        <Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search agents, accounts, tasks, actions…" className="palette__input" />
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
