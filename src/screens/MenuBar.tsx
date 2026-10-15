import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Inspector } from '@/components/menubar/Inspector';
import { MenuBarFooter } from '@/components/menubar/MenuBarFooter';
import { MenuBarHeader } from '@/components/menubar/MenuBarHeader';
import { MenuBarList } from '@/components/menubar/MenuBarList';
import { MenuBarSettings } from '@/components/menubar/MenuBarSettings';
import { Button } from '@/components/ui';
import { useMenuState } from '@/hooks/useMenuState';
import { useNow } from '@/hooks/useNow';
import { useSessions } from '@/hooks/useSessions';
import { desktop } from '@/lib/api';
import { headline } from '@/lib/menubar';
import { useConnection } from '@/store/connection';
import { useData } from '@/store/data';
import { useMenuBar } from '@/store/menubar';
import type { AgentSession, MenuAttention, MenuTarget } from '@/types';

function follow(target?: MenuTarget | null) {
  if (!target) return;

  const m = useMenuBar.getState();

  if (target.session) m.openInspector(target.session);
  else m.back();
}

export function MenuBar() {
  const phase = useConnection((c) => c.phase);
  const error = useConnection((c) => c.error);
  const bootstrap = useConnection((c) => c.bootstrap);
  const retry = useConnection((c) => c.retry);
  const approvals = useData((d) => d.approvals.pending);
  const sessions = useSessions();
  const menu = useMenuState();
  const now = useNow(1000);
  const view = useMenuBar((m) => m.view);
  const selectedId = useMenuBar((m) => m.selectedId);
  const openInspector = useMenuBar((m) => m.openInspector);
  const openSettings = useMenuBar((m) => m.openSettings);
  const back = useMenuBar((m) => m.back);
  const [recentLimit, setRecentLimit] = useState(3);

  useEffect(() => {
    if (phase === 'booting') void bootstrap();
  }, [phase, bootstrap]);

  useEffect(() => {
    if (view !== 'list') return;

    void desktop
      .prefs()
      .then((p) => setRecentLimit(p.prefs.recent_limit))
      .catch(() => undefined);
  }, [view]);

  useEffect(() => {
    void desktop
      .takeTarget()
      .then(follow)
      .catch(() => undefined);

    const off = listen<MenuTarget>('menubar:target', (ev) => {
      follow(ev.payload);
      void desktop.takeTarget().catch(() => undefined);
    });

    return () => {
      void off.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;

      const m = useMenuBar.getState();

      if (m.view !== 'list') m.back();
      else void desktop.hidePanel().catch(() => undefined);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const attention = menu?.attention ?? [];
  const live = menu?.live ?? sessions.filter((s) => s.live).length;
  const summary = headline(phase, live, menu?.waiting ?? approvals.length, attention.length);
  const selected = sessions.find((s) => s.id === selectedId);

  const inspect = (s: AgentSession) => openInspector(s.id);

  const onAttention = (item: MenuAttention) => {
    if (item.run_id && sessions.some((s) => s.id === item.run_id)) openInspector(item.run_id);
    else void desktop.showMain(`/accounts/${encodeURIComponent(item.account)}`);
  };

  let body;

  if (phase !== 'connected') {
    body = (
      <div className="menubar__offline">
        <p>{error ?? 'Connecting to the csm service…'}</p>

        {phase === 'disconnected' || phase === 'missing' ? (
          <Button size="sm" onClick={() => void retry()}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  } else if (view === 'settings') {
    body = <MenuBarSettings />;
  } else if (view === 'inspector') {
    body = selected ? (
      <Inspector
        session={selected}
        attention={attention}
        onClose={back}
        onOpenSession={openInspector}
      />
    ) : (
      <div className="menubar__offline">
        <p>CSM no longer tracks this session. It may have been cleared.</p>
        <Button size="sm" onClick={back}>
          Back to agents
        </Button>
      </div>
    );
  } else {
    body = (
      <MenuBarList
        sessions={sessions}
        approvals={approvals}
        attention={attention}
        recentLimit={recentLimit}
        now={now}
        onInspect={inspect}
        onAttention={onAttention}
      />
    );
  }

  return (
    <div className="menubar">
      <MenuBarHeader view={view} summary={summary} onBack={back} onSettings={openSettings} />

      <div className="menubar__body menubar-view" key={view}>
        {body}
      </div>

      {view === 'list' ? <MenuBarFooter live={live} /> : null}
    </div>
  );
}
