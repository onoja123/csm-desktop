import { Alert02Icon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon } from '@/components/ui';
import type { MenuAttention } from '@/types';

export function MenuBarAttention({
  item,
  onOpen,
}: {
  item: MenuAttention;
  onOpen: (item: MenuAttention) => void;
}) {
  return (
    <button
      type="button"
      className={`menubar-attention menubar-attention--${item.kind}`}
      onClick={() => onOpen(item)}
    >
      <AgentIcon provider={item.provider} size="md" />

      <span className="menubar-attention__main">
        <span className="menubar-attention__title">
          <Icon icon={Alert02Icon} size="sm" />
          {item.title}
        </span>
        <span className="menubar-attention__reason">{item.reason}</span>
        {item.detail ? <span className="menubar-attention__detail">{item.detail}</span> : null}
      </span>
    </button>
  );
}
