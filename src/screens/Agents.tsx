import { Bot } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { AgentCard } from '@/components/agents/AgentCard';
import { useStartAgent } from '@/components/agents/StartAgentDialog';
import { Button, EmptyState, PageHeader, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { useData } from '@/store/data';

export function Agents() {
  const { runs } = useData();
  const openStart = useStartAgent((s) => s.open);
  const live = runs.runs.filter((r) => r.status === 'running');
  const finished = runs.runs.filter((r) => r.status !== 'running');

  return (
    <Page>
      <PageHeader title="Agents" subtitle="Every agent CSM is running, here or in a terminal." action={<Button variant="primary" onClick={() => openStart()}>Start agent</Button>} />
      {live.length + runs.external.length === 0 ? (
        <EmptyState icon={Bot} title="No agents running" body="Start Claude, Codex, Gemini or Copilot to see it here." action={<Button variant="primary" onClick={() => openStart()}>Start agent</Button>} />
      ) : (
        <>
          {live.length > 0 ? (
            <Section title="Running here" meta={String(live.length)}>
              <div className="list">
                {live.map((r) => (
                  <AgentCard key={r.id} run={r} />
                ))}
              </div>
            </Section>
          ) : null}
          {runs.external.length > 0 ? (
            <Section title="Running in a terminal" meta={String(runs.external.length)}>
              <p className="muted">These sessions were started with the csm command. Their output stays in that terminal; account switches and handoffs still work from here.</p>
              <div className="list">
                {runs.external.map((r) => (
                  <AgentCard key={r.id} run={r} />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
      {finished.length > 0 ? (
        <Section title="Finished" meta={String(finished.length)} action={<Button size="sm" variant="ghost" onClick={() => finished.forEach((r) => void api.forgetRun(r.id))}>Clear</Button>}>
          <div className="list">
            {finished.map((r) => (
              <AgentCard key={r.id} run={r} compact />
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  );
}
