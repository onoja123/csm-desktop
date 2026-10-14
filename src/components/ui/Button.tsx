import type { ButtonHTMLAttributes } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconSvgElement;
  loading?: boolean;
};

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <HugeiconsIcon
          icon={Loading03Icon}
          strokeWidth={2}
          size={14}
          className="spin"
          aria-hidden="true"
        />
      ) : icon ? (
        <Icon icon={icon} size="sm" />
      ) : null}

      {children}
    </button>
  );
}
