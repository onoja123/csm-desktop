import { useState } from 'react';
import { Button } from '@/components/ui';
import { desktop } from '@/lib/api';

export function MenuBarFooter({ live }: { live: number }) {
  const [confirmQuit, setConfirmQuit] = useState(false);

  if (confirmQuit) {
    return (
      <footer
        className="menubar__foot menubar__foot--confirm"
        role="alertdialog"
        aria-label="Quit CSM"
      >
        <span>
          Quit CSM? {live === 1 ? '1 agent keeps' : `${live} agents keep`} running in the csm
          service. Approvals go back to each agent&apos;s own prompt.
        </span>
        <div className="menubar-confirm__actions">
          <Button size="sm" onClick={() => setConfirmQuit(false)} autoFocus>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={() => void desktop.quit()}>
            Quit
          </Button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="menubar__foot">
      <button
        type="button"
        className="menubar__link"
        onClick={() => void desktop.showMain('/mission')}
      >
        Mission Control
      </button>
      <button
        type="button"
        className="menubar__link"
        onClick={() => void desktop.showMain(undefined, 'start-agent')}
      >
        Start agent
      </button>
      <button
        type="button"
        className="menubar__link"
        onClick={() => void desktop.showMain('/accounts')}
      >
        Accounts
      </button>
      <button
        type="button"
        className="menubar__link"
        onClick={() => (live > 0 ? setConfirmQuit(true) : void desktop.quit())}
      >
        Quit CSM
      </button>
    </footer>
  );
}
