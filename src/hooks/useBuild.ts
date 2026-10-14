import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { isTerminal } from '@/lib/build';
import { useData } from '@/store/data';
import type { Build } from '@/types';

export function useBuild(id: string) {
  const [build, setBuild] = useState<Build>();
  const [error, setError] = useState<string>();
  const stamp = useData((s) => s.buildStamps[id] ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(() => {
    api
      .build(id)
      .then((b) => {
        setBuild(b);
        setError(undefined);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, stamp ? 150 : 0);
    return () => clearTimeout(timer.current);
  }, [load, stamp]);

  const live = build && !isTerminal(build.status);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [live, load]);

  return { build, setBuild, error, reload: load };
}
