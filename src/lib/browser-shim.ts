// Lets the UI run in a plain browser against `npm run dev`: Tauri commands become fetches to the dev server's /__csm proxy.
import type { TauriCallback, TauriEvent } from '@/types';

const STREAM_TYPES = [
  'hello',
  'status',
  'accounts',
  'runs',
  'sessions',
  'handoffs',
  'projects',
  'run.output',
  'run.exit',
  'approval.requested',
  'approval.resolved',
  'activity',
  'build',
  'signals',
];

export function installBrowserShim() {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown };

  if (w.__TAURI_INTERNALS__) return;

  const callbacks = new Map<number, TauriCallback>();
  const listeners = new Map<string, Set<number>>();
  let nextId = 1;
  let source: EventSource | undefined;

  const emit = (event: string, payload: unknown) => {
    for (const id of listeners.get(event) ?? [])
      callbacks.get(id)?.({ event, id, payload } satisfies TauriEvent);
  };

  const startStream = () => {
    if (source) return;

    source = new EventSource('/__csm/v1/events');
    source.onopen = () => emit('csm:connection', { connected: true });

    source.onerror = () =>
      emit('csm:connection', { connected: false, error: 'event stream closed' });

    for (const type of STREAM_TYPES) {
      source.addEventListener(type, (e) => {
        let data: unknown = null;

        try {
          data = JSON.parse((e as MessageEvent).data);
        } catch {
          // keep null
        }

        emit('csm:event', { type, data });
      });
    }
  };

  w.__TAURI_INTERNALS__ = {
    transformCallback(cb: TauriCallback) {
      const id = nextId++;

      callbacks.set(id, cb);
      return id;
    },
    unregisterCallback(id: number) {
      callbacks.delete(id);
    },
    convertFileSrc(p: string) {
      return p;
    },
    async invoke(cmd: string, args: Record<string, unknown> = {}) {
      switch (cmd) {
        case 'csm_request': {
          const res = await fetch('/__csm' + String(args.path), {
            method: String(args.method),
            headers: { 'Content-Type': 'application/json' },
            body: typeof args.body === 'string' ? args.body : undefined,
          });

          return { status: res.status, body: await res.text() };
        }

        case 'csm_info':
          return {
            home: '~/.csm',
            socket: 'dev server proxy (/__csm)',
            csm_path: 'csm',
            csm_version: 'browser mode',
            socket_present: true,
          };
        case 'csm_start_service':
        case 'csm_stop_service':
          throw 'Browser mode cannot manage the service; run `csm serve` yourself.';
        case 'csm_subscribe':
          startStream();
          return true;

        case 'plugin:event|listen': {
          const set = listeners.get(String(args.event)) ?? new Set<number>();

          set.add(Number(args.handler));
          listeners.set(String(args.event), set);
          return args.handler;
        }

        case 'plugin:event|unlisten':
          listeners.get(String(args.event))?.delete(Number(args.eventId));
          return null;
        case 'plugin:dialog|open':
          return window.prompt('Directory path');
        case 'plugin:opener|open_path':
        case 'plugin:opener|reveal_item_in_dir':
          return null;
        default:
          throw `Unsupported command in browser mode: ${cmd}`;
      }
    },
  };
}
