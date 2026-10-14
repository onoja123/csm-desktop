import { useState } from 'react';
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from './Button';

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="input-row">
      <input className="input mono" value={value} readOnly aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <Button
        icon={copied ? Tick02Icon : Copy01Icon}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
