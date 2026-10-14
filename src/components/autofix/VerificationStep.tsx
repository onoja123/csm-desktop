import { Check, Minus, X } from 'lucide-react';
import { Icon } from '@/components/ui';

export function VerificationStep({ ok, label, text }: { ok?: boolean; label: string; text: string }) {
  const icon = ok === undefined ? Minus : ok ? Check : X;
  return (
    <div className="checklist__row">
      <Icon icon={icon} size="sm" className={ok === undefined ? 'tone-idle' : ok ? 'tone-ok' : 'tone-err'} />
      <span className="checklist__label">{label}</span>
      <span className="checklist__text">{text}</span>
    </div>
  );
}
