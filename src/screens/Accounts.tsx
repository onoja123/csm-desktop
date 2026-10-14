import { UserIcon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { AccountCard } from '@/components/accounts/AccountCard';
import { EmptyState, PageHeader, Section } from '@/components/ui';
import { SharedLoginNote } from '@/components/accounts/SharedLoginNote';
import { FailoverPanel } from '@/components/accounts/FailoverPanel';
import { PROVIDERS, PROVIDER_LONG_NAMES } from '@/lib/format';
import { useData } from '@/store/data';

export function Accounts() {
  const accounts = useData((s) => s.accounts);
  return (
    <Page>
      <PageHeader title="Accounts" subtitle="Every profile CSM manages, with the health it uses to pick where a switch goes." />
      {accounts.length === 0 ? (
        <EmptyState icon={UserIcon} title="No accounts yet" body={<>Add one in a terminal with <code>csm account add &lt;name&gt; --provider claude|codex|gemini|copilot|cursor</code>. Logging in needs a browser, so it stays in the terminal.</>} />
      ) : (
        PROVIDERS.filter((p) => accounts.some((a) => a.provider === p)).map((p) => (
          <Section key={p} title={PROVIDER_LONG_NAMES[p]} meta={String(accounts.filter((a) => a.provider === p).length)}>
            <SharedLoginNote provider={p} />
            <div className="list">
              {accounts
                .filter((a) => a.provider === p)
                .map((a) => (
                  <AccountCard key={a.name} account={a} />
                ))}
            </div>
          </Section>
        ))
      )}
      <Section title="Failover">
        <FailoverPanel />
      </Section>
    </Page>
  );
}
