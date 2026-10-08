import { useState } from 'react';
import { openPath } from '@tauri-apps/plugin-opener';
import { Page } from '@/components/shell/AppShell';
import { FailoverPanel } from './Accounts';
import { Button, PageHeader, Panel, Row, Section, Toggle } from '@/components/ui';
import { api, service } from '@/lib/api';
import { PROVIDER_LONG_NAMES, ago } from '@/lib/format';
import { useConnection } from '@/store/connection';
import { useData } from '@/store/data';

export function Settings() {
  const { status, settings } = useData();
  const info = useConnection((s) => s.info);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();

  const restart = async () => {
    setBusy(true);
    setNote(undefined);
    try {
      await service.stop().catch(() => undefined);
      await service.start();
      setNote('Service restarted. Agents started before the restart keep running in their own terminals; this app no longer shows their output.');
    } catch (e) {
      setNote(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Settings" />
      <Section title="Approvals">
        <Panel>
          <div className="setting-row">
            <div>
              <h4 className="panel__h4">Route shell commands through CSM Desktop</h4>
              <p className="muted">When Claude Code wants to run a shell command, ask here first. Without an answer in ten minutes, or when this app is closed, Claude Code falls back to its own prompt. Other agents keep their terminal prompts.</p>
            </div>
            <Toggle checked={settings?.approvals_enabled ?? true} onChange={(v) => void api.updateSettings({ approvals_enabled: v })} label="Route approvals" />
          </div>
        </Panel>
      </Section>
      <Section title="Failover">
        <FailoverPanel />
      </Section>
      <Section title="Service">
        <Panel>
          <Row label="csm">
            <span className="mono">{info?.csm_path ?? 'not found'}</span>
            {info?.csm_version ? <span className="muted"> · {info.csm_version}</span> : null}
          </Row>
          <Row label="Service">
            {status ? (
              <>
                <span className="mono">{status.service.version}</span>
                <span className="muted">
                  {' '}
                  · pid {status.service.pid} · up since {ago(status.service.started_at)}
                </span>
              </>
            ) : (
              'not connected'
            )}
          </Row>
          <Row label="Socket" mono>
            {info?.socket}
          </Row>
          <Row label="State directory" mono>
            {info?.home}
          </Row>
          <div className="panel__actions">
            <Button onClick={() => info && void openPath(info.home)}>Reveal state directory</Button>
            <Button onClick={() => void restart()} loading={busy}>
              Restart service
            </Button>
          </div>
          {note ? <p className="muted">{note}</p> : null}
        </Panel>
      </Section>
      <Section title="Agents">
        <Panel>
          {status?.providers.map((p) => (
            <Row key={p.id} label={PROVIDER_LONG_NAMES[p.id]}>
              {p.installed ? <span className="mono">{p.version ?? 'installed'}</span> : <span className="muted">{p.error ?? 'not installed'}</span>}
            </Row>
          ))}
        </Panel>
      </Section>
      <Section title="Shortcuts">
        <Panel>
          <Row label="Command palette">⌘K</Row>
          <Row label="Start agent">⌘N</Row>
          <Row label="Close dialog">Esc</Row>
        </Panel>
      </Section>
    </Page>
  );
}
