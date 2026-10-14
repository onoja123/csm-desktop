import { StatusText } from '@/components/ui';
import { HEALTH_LABEL, healthTone, until } from '@/lib/format';
import type { Account } from '@/types';

export function AccountHealth({ account }: { account: Account }) {
  const tone = healthTone(account.health);
  let label = HEALTH_LABEL[account.health];
  if (account.health === 'rate_limited' && account.cooldown_until) label += ` · ${until(account.cooldown_until)}`;
  return <StatusText tone={tone}>{label}</StatusText>;
}
