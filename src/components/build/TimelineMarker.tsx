import type { TimelineStep } from '@/types';

export function TimelineMarker({ s, tall }: { s: TimelineStep; tall: boolean }) {
  if (tall) return <span className={`tl__bar tl__bar--${s.state}`} />;

  return <span className={`tl__dot tl__dot--${s.state}`} />;
}
