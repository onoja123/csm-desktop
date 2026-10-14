import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { Page } from '@/components/shell/Page';
import { SessionCard } from '@/components/sessions/SessionCard';
import { useHandoffDialog } from '@/store/handoff-dialog';
import { EmptyState, PageHeader, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { useData } from '@/store/data';

export function Sessions() {
  const sessions = useData((s) => s.sessions);
  const openHandoff = useHandoffDialog((s) => s.open);
  const nav = useNavigate();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const resume = async (id: string, provider: string, projectDir: string, sessionId: string) => {
    setBusy(id);
    setError(undefined);
    try {
      const run = await api.resumeSession({ provider, project_dir: projectDir, session_id: sessionId });
      nav(`/agents/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const live = sessions.filter((s) => s.live);
  const past = sessions.filter((s) => !s.live);

  return (
    <Page>
      <PageHeader title="Sessions" subtitle="Live sessions and every checkpoint CSM saved before a switch." />
      {error ? <p className="form-error selectable">{error}</p> : null}
      {sessions.length === 0 ? (
        <EmptyState icon={History} title="No sessions recorded" body="Checkpoints appear here when CSM switches or hands off a running agent." />
      ) : (
        <>
          {live.length > 0 ? (
            <Section title="Live" meta={String(live.length)}>
              <div className="list">
                {live.map((s) => (
                  <SessionCard key={s.id} session={s} onHandoff={() => openHandoff({ projectDir: s.project_dir, fromProvider: s.provider, fromAccount: s.account })} />
                ))}
              </div>
            </Section>
          ) : null}
          {past.length > 0 ? (
            <Section title="Checkpoints" meta={String(past.length)}>
              <div className="list">
                {past.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    busy={busy === s.id}
                    onResume={s.can_resume ? () => void resume(s.id, s.provider, s.project_dir, s.session_id!) : undefined}
                    onHandoff={() => openHandoff({ projectDir: s.project_dir, fromProvider: s.provider, fromAccount: s.account })}
                  />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </Page>
  );
}
