import { useEffect, useState } from 'react';

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function liveSeconds(startedAt: string, endedAt: string | undefined, now: number): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt && !endedAt.startsWith('0001') ? new Date(endedAt).getTime() : now;
  return Math.max(0, Math.floor((end - start) / 1000));
}
