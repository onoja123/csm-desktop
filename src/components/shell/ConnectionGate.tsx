import { type ReactNode, useEffect } from 'react';
import { PowerOff } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useConnection } from '@/store/connection';

export function ConnectionGate({ children }: { children: ReactNode }) {
  const { phase, error, info, bootstrap, retry, startService } = useConnection();

  useEffect(() => {
    if (phase === 'booting') void bootstrap();
  }, [phase, bootstrap]);

  if (phase === 'booting' || phase === 'connecting') {
    return (
      <div className="gate">
        <LoadingState label="Connecting to CSM" />
      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className="gate">
        <LoadingState label="Starting the CSM service" />
      </div>
    );
  }

  if (phase === 'missing') {
    return (
      <div className="gate">
        <EmptyState
          icon={PowerOff}
          title="csm isn't installed"
          body={
            <>
              CSM Desktop controls the csm command-line tool, which was not found on this machine. Install it with{' '}
              <code>go install github.com/onoja123/csm/cmd/csm@latest</code>, or set <code>CSM_PATH</code> to its location, then retry.
            </>
          }
          action={<Button variant="primary" onClick={() => void retry()}>Retry</Button>}
        />
      </div>
    );
  }

  if (phase === 'disconnected') {
    return (
      <div className="gate">
        <ErrorState
          title="CSM isn't connected"
          body="Make sure the CSM service is running. CSM Desktop can start it for you."
          detail={[error, info ? `socket: ${info.socket}` : '', info?.csm_path ? `csm: ${info.csm_path} (${info.csm_version ?? 'version unknown'})` : 'csm: not found'].filter(Boolean).join('\n')}
          action={
            <>
              <Button variant="primary" onClick={() => void startService()}>
                Start CSM
              </Button>
              <Button onClick={() => void retry()}>Retry</Button>
            </>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
