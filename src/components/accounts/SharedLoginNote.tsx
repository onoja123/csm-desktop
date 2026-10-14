import { useData } from '@/store/data';
import type { ProviderID } from '@/types';

export function SharedLoginNote({ provider }: { provider: ProviderID }) {
  const info = useData((s) => s.status?.providers.find((p) => p.id === provider));

  if (!info?.shared_login) return null;

  return (
    <p className="muted section-note">
      {info.name} keeps one sign-in for your user account, so CSM manages a single {info.name}{' '}
      account and cannot switch between accounts. To work as someone else, sign out of {info.name}{' '}
      and run <code>csm account login &lt;name&gt;</code>.
    </p>
  );
}
