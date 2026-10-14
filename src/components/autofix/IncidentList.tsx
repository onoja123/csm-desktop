import { useState } from 'react';
import { Siren } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { IncidentRow } from './IncidentRow';
import { api } from '@/lib/api';
import { useData } from '@/store/data';

export function IncidentList({ onSetup }: { onSetup: () => void }) {
  const incidents = useData((s) => s.signals);
  const builds = useData((s) => s.builds);
  const loaded = useData((s) => s.loaded.signals);
  const error = useData((s) => s.errors.signals);
  const refresh = useData((s) => s.refresh);
  const [busy, setBusy] = useState<string>();
  const [startError, setStartError] = useState<string>();

  if (!loaded && !error) return <LoadingState label="Reading incidents" />;
  if (error) return <ErrorState title="Incidents could not be loaded" body={error} action={<Button onClick={() => void refresh('signals')}>Retry</Button>} />;
  if (!incidents.length)
    return (
      <EmptyState
        icon={Siren}
        title="No incidents yet"
        body="Connect Sentry in Settings: sign in to CSM Hub, pick the project and repository, and paste the webhook URL into Sentry. Every error Sentry reports then becomes an incident here."
        action={
          <Button variant="primary" onClick={onSetup}>
            Connect Sentry
          </Button>
        }
      />
    );

  const start = async (id: string) => {
    setBusy(id);
    setStartError(undefined);
    try {
      await api.startIncidentRun(id);
      await refresh('signals');
    } catch (e) {
      setStartError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="list list--tight af-incidents">
      {startError ? <p className="form-error">{startError}</p> : null}
      {incidents.map((i) => (
        <IncidentRow key={i.id} incident={i} runs={builds.filter((b) => (i.runs ?? []).includes(b.id))} busy={busy === i.id} onStart={() => void start(i.id)} />
      ))}
    </div>
  );
}
