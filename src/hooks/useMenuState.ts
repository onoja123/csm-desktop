import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { desktop } from '@/lib/api';
import type { MenuState } from '@/types';

export function useMenuState(): MenuState | undefined {
  const [state, setState] = useState<MenuState>();

  useEffect(() => {
    let alive = true;

    void desktop
      .state()
      .then((s) => {
        if (alive) setState(s);
      })
      .catch(() => undefined);

    const off = listen<MenuState>('menubar:state', (ev) => setState(ev.payload));

    return () => {
      alive = false;
      void off.then((stop) => stop());
    };
  }, []);

  return state;
}
