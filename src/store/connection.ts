import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { api, service } from '@/lib/api';
import type { ConnectionEventPayload, ConnectionState, ServiceInfo, StreamEvent } from '@/types';
import { useData } from './data';

let listening = false;
let ticking = false;

function startTicker() {
  if (ticking) return;
  ticking = true;
  setInterval(() => {
    const data = useData.getState();
    if (useConnection.getState().phase !== 'connected') return;
    if (data.runs.runs.some((r) => r.status === 'running') || data.runs.external.length > 0) void data.refresh('runs');
  }, 10000);
}

async function attachListeners() {
  if (listening) return;
  listening = true;
  await listen<ConnectionEventPayload>('csm:connection', (ev) => {
    useConnection.getState().setConnected(ev.payload.connected, ev.payload.error);
  });
  await listen<StreamEvent>('csm:event', (ev) => {
    useConnection.setState({ lastEventAt: Date.now() });
    useData.getState().handleEvent(ev.payload);
  });
  await service.subscribe();
  startTicker();
}

export const useConnection = create<ConnectionState>((set, get) => ({
  phase: 'booting',

  setConnected(connected, error) {
    if (connected) {
      set({ phase: 'connected', error: undefined });
      void useData.getState().refreshAll();
      return;
    }

    if (get().phase === 'connected' || get().phase === 'connecting') {
      set({ phase: 'disconnected', error });
    }
  },

  async bootstrap() {
    set({ phase: 'connecting', error: undefined });
    let info: ServiceInfo | undefined;

    try {
      info = await service.info();
      set({ info });
    } catch (e) {
      set({ phase: 'disconnected', error: String(e) });
      return;
    }

    try {
      await api.status();
      set({ phase: 'connected' });
      await attachListeners();
      await useData.getState().refreshAll();
      return;
    } catch {
      // The service is not up; try to start it when csm is installed.
    }

    if (!info.csm_path) {
      set({ phase: 'missing', error: 'csm was not found on this machine.' });
      return;
    }

    await get().startService();
    await attachListeners();
  },

  async retry() {
    await get().bootstrap();
  },

  async startService() {
    set({ phase: 'starting', error: undefined });

    try {
      await service.start();
      await api.status();
      set({ phase: 'connected' });
      await attachListeners();
      await useData.getState().refreshAll();
    } catch (e) {
      set({ phase: 'disconnected', error: typeof e === 'string' ? e : (e as Error).message });
    }
  },
}));
