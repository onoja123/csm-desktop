import { useEffect } from 'react';
import { pty } from '@/terminal/pty';
import { useTerminal } from '@/terminal/store';

// The terminal store learns the home folder when the Terminal screen opens; other screens may need it first.
export function useHomeDir(): string {
  const home = useTerminal((s) => s.homeDir);

  useEffect(() => {
    if (home) return;

    void pty
      .defaultCwd()
      .then((dir) => {
        if (typeof dir === 'string' && dir && !useTerminal.getState().homeDir)
          useTerminal.setState({ homeDir: dir });
      })
      .catch(() => undefined);
  }, [home]);

  return home;
}
