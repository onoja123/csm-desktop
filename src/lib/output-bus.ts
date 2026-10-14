import type { OutputListener } from '@/types';

const listeners = new Map<string, Set<OutputListener>>();

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
  subscribe(runId: string, fn: OutputListener): () => void {
    const set = listeners.get(runId) ?? new Set<OutputListener>();
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

// Chunks that arrived while the full output was being fetched may already be at its end; returns how many to skip.
export function replayedChunks(replayed: Uint8Array, buffered: Uint8Array[]): number {
  for (let k = buffered.length; k > 0; k--) {
    const size = buffered.slice(0, k).reduce((n, b) => n + b.length, 0);
    if (size > replayed.length) continue;
    let offset = replayed.length - size;
    let match = true;
    for (let i = 0; i < k && match; i++) {
      const b = buffered[i];
      for (let j = 0; j < b.length; j++) {
        if (replayed[offset + j] !== b[j]) {
          match = false;
          break;
        }
      }
      offset += b.length;
    }
    if (match) return k;
  }
  return 0;
}
