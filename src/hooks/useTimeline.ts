import { useEffect, useState } from 'react';
import { buildTimeline } from '@/lib/timeline';
import type { Build, Timeline } from '@/types';

export function useTimeline(build: Build): Timeline {
  const [now, setNow] = useState(() => Date.now());
  const tl = buildTimeline(build, now);

  useEffect(() => {
    if (!tl.live) return;

    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, [tl.live]);

  return tl;
}
