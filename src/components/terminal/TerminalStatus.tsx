import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitBranchIcon } from '@hugeicons/core-free-icons';
import { Icon, Kbd } from '@/components/ui';
import { useTerminal } from '@/terminal/store';

export function TerminalStatus() {
  const { panes, homeDir, activeTab } = useTerminal();
  const tab = activeTab();
  const pane = tab ? panes[tab.activePaneId] : undefined;
  const cwd = pane?.kind === 'shell' ? pane.cwd : '';
  const [branch, setBranch] = useState<string>('');

  useEffect(() => {
    if (!cwd) {
      setBranch('');
      return;
    }

    let cancelled = false;

    invoke<string>('git_branch', { cwd })
      .then((b) => !cancelled && setBranch(b))
      .catch(() => !cancelled && setBranch(''));

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  if (!pane) return null;

  const shown = homeDir && cwd.startsWith(homeDir) ? '~' + cwd.slice(homeDir.length) : cwd;

  return (
    <div className="term-status">
      {pane.kind === 'shell' ? (
        <>
          <span className="mono selectable">{shown}</span>
          <span className="term-status__sep" />
          <span>{pane.shell?.split('/').pop() ?? 'shell'}</span>

          {branch ? (
            <>
              <span className="term-status__sep" />

              <span className="term-status__branch">
                <Icon icon={GitBranchIcon} size="sm" /> {branch}
              </span>
            </>
          ) : null}

          {pane.exited ? (
            <>
              <span className="term-status__sep" />
              <span>exit {pane.exited.code ?? '?'}</span>
            </>
          ) : null}
        </>
      ) : (
        <span>Attached to an agent session</span>
      )}

      <span className="term-status__hint">
        <Kbd>⌘T</Kbd> new <Kbd>⌘D</Kbd> split <Kbd>⌘F</Kbd> search <Kbd>⌘K</Kbd> actions
      </span>
    </div>
  );
}
