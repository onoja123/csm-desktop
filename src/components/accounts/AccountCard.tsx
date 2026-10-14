import { Link } from 'react-router-dom';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Icon } from '@/components/ui';
import { AccountHealth } from './AccountHealth';
import type { Account } from '@/types';

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
      <Icon icon={ArrowRight01Icon} size="md" className="agent-card__chevron" />
    </Link>
  );
}
