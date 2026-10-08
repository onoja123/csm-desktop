type Listener = (bytes: Uint8Array) => void;

const listeners = new Map<string, Set<Listener>>();

export function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export const outputBus = {
  subscribe(runId: string, fn: Listener): () => void {
    const set = listeners.get(runId) ?? new Set<Listener>();
    set.add(fn);
    listeners.set(runId, set);
    return () => {
      set.delete(fn);
      if (set.size === 0) listeners.delete(runId);
    };
  },
  emit(runId: string, bytes: Uint8Array) {
    listeners.get(runId)?.forEach((fn) => fn(bytes));
  },
  listenerCount(runId: string): number {
    return listeners.get(runId)?.size ?? 0;
  },
};
