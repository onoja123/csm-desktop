import { type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes, useEffect } from 'react';
import { AlertTriangle, Loader2, type LucideIcon, X } from 'lucide-react';
import type { Tone } from '@/design/tokens';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';

const ICON_PX: Record<IconSize, number> = { sm: 14, md: 18, lg: 22, xl: 28, '2xl': 36, hero: 48 };

export function Icon({ icon: I, size = 'md', className = '', strokeWidth }: { icon: LucideIcon; size?: IconSize; className?: string; strokeWidth?: number }) {
  return <I size={ICON_PX[size]} strokeWidth={strokeWidth ?? (size === 'hero' || size === '2xl' ? 1.5 : 1.75)} className={`icon ${className}`} aria-hidden="true" />;
}

export function IconTile({ icon, size = 'lg', tone, className = '' }: { icon: LucideIcon; size?: 'md' | 'lg' | 'xl' | 'hero'; tone?: Tone; className?: string }) {
  const inner: IconSize = size === 'hero' ? 'hero' : size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : 'md';
  return (
    <span className={`icon-tile icon-tile--${size} ${tone ? `tone-${tone}` : ''} ${className}`}>
      <Icon icon={icon} size={inner} />
    </span>
  );
}

export function StatusDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return <span className={`status-dot tone-${tone} ${pulse ? 'status-dot--pulse' : ''}`} aria-hidden="true" />;
}

export function StatusText({ tone, children, pulse }: { tone: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={`status-text tone-${tone}`}>
      <StatusDot tone={tone} pulse={pulse} />
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({ variant = 'default', size = 'md', icon, loading, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={14} className="spin" aria-hidden="true" /> : icon ? <Icon icon={icon} size="sm" /> : null}
      {children}
    </button>
  );
}

export function Panel({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`panel ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel__header">
      <div className="panel__title">
        <h3>{title}</h3>
        {meta ? <span className="panel__meta">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function Row({ label, children, mono = false }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="row">
      <span className="row__label">{label}</span>
      <span className={`row__value ${mono ? 'mono selectable' : ''}`}>{children}</span>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function EmptyState({ icon, title, body, action }: { icon: LucideIcon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <IconTile icon={icon} size="hero" />
      <h2 className="state__title">{title}</h2>
      {body ? <p className="state__body">{body}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, body, detail, action }: { title: string; body?: ReactNode; detail?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <IconTile icon={AlertTriangle} size="hero" tone="warn" />
      <h2 className="state__title">{title}</h2>
      {body ? <p className="state__body">{body}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
      {detail ? (
        <details className="state__details">
          <summary>View details</summary>
          <pre className="selectable">{detail}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <Loader2 size={20} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Dialog({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog__backdrop" onMouseDown={onClose}>
      <div className="dialog" style={{ width }} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <h2>{title}</h2>
          <button className="dialog__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'tab--active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && t.count > 0 ? <span className="tab__count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'toggle--on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle__knob" />
    </button>
  );
}

export function Section({ title, meta, action, children }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__header">
        <h2 className="section__title">
          {title}
          {meta ? <span className="section__meta">{meta}</span> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="page__header">
      <div>
        <h1 className="page__title">{title}</h1>
        {subtitle ? <p className="page__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="page__action">{action}</div> : null}
    </header>
  );
}
