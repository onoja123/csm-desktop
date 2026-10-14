import { Row } from '@/components/ui';
import { clock, percent, until } from '@/lib/format';
import type { UsageWindow } from '@/types';

export function UsageWindowRow({ label, w }: { label: string; w?: UsageWindow }) {
  if (!w || !w.resets_at || w.resets_at.startsWith('0001')) return null;
  const open = new Date(w.resets_at).getTime() > Date.now();
  return (
    <Row label={label}>
      {open ? (
        <>
          <span className="usage-bar" aria-hidden="true">
            <span className="usage-bar__fill" style={{ width: `${Math.min(100, Math.max(0, w.used_percent))}%` }} />
          </span>
          {percent(w.used_percent)} · resets {until(w.resets_at)}
        </>
      ) : (
        `window reset at ${clock(w.resets_at)} (was ${percent(w.used_percent)})`
      )}
    </Row>
  );
}
