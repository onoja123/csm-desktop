import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <Loader2 size={20} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
