import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon, StatusText } from '@/components/ui';
import type { Account } from '@/lib/types';
import { HEALTH_LABEL, healthTone, until } from '@/lib/format';

export function AccountHealth({ account }: { account: Account }) {
  const tone = healthTone(account.health);
  let label = HEALTH_LABEL[account.health];
  if (account.health === 'rate_limited' && account.cooldown_until) label += ` · ${until(account.cooldown_until)}`;
  return <StatusText tone={tone}>{label}</StatusText>;
}

export function AccountCard({ account, compact = false }: { account: Account; compact?: boolean }) {
  return (
    <Link to={`/accounts/${encodeURIComponent(account.name)}`} className={`account-card ${compact ? 'account-card--compact' : ''}`}>
      <AgentIcon provider={account.provider} size={compact ? 'md' : 'lg'} />
      <div className="account-card__body">
        <div className="account-card__top">
          <span className="account-card__name mono">{account.name}</span>
          {account.active ? <span className="account-card__tag">active</span> : null}
          {account.running ? <span className="account-card__tag">running</span> : null}
        </div>
        <div className="account-card__meta">
          <span>{account.provider_name}</span>
          <span className="agent-card__sep" />
          <span>{account.usage_label === 'unknown' ? 'Usage unknown' : account.usage_label}</span>
        </div>
      </div>
      <AccountHealth account={account} />
      <Icon icon={ChevronRight} size="md" className="agent-card__chevron" />
    </Link>
  );
}
