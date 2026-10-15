import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { useStartAgent } from '@/store/start-agent-dialog';

export function MenuBarBridge() {
  const nav = useNavigate();

  useEffect(() => {
    const offNavigate = listen<string>('csm:navigate', (ev) => nav(ev.payload));

    const offAction = listen<string>('csm:action', (ev) => {
      if (ev.payload === 'start-agent') useStartAgent.getState().open();
    });

    return () => {
      void offNavigate.then((stop) => stop());
      void offAction.then((stop) => stop());
    };
  }, [nav]);

  return null;
}
