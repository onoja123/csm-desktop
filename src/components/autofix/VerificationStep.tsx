import { Cancel01Icon, MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui';

export function VerificationStep({ ok, label, text }: { ok?: boolean; label: string; text: string }) {
  const icon = ok === undefined ? MinusSignIcon : ok ? Tick02Icon : Cancel01Icon;
  return (
    <div className="checklist__row">
      <Icon icon={icon} size="sm" className={ok === undefined ? 'tone-idle' : ok ? 'tone-ok' : 'tone-err'} />
      <span className="checklist__label">{label}</span>
      <span className="checklist__text">{text}</span>
    </div>
  );
}
