import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder02Icon, Plug01Icon } from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { MCPServerCard } from '@/components/mcp/MCPServerCard';
import { Button, EmptyState, PageHeader, Section } from '@/components/ui';
import { useData } from '@/store/data';

export function MCP() {
  const { mcp, mcpProject, projects, loaded, errors, refresh } = useData();
  const [dir, setDir] = useState(mcpProject ?? '');

  useEffect(() => {
    const target = dir || projects.find((p) => p.exists)?.dir || '';
    if (target && target !== mcpProject) void refresh('mcp', target);
    else if (!loaded.mcp) void refresh('mcp', target || undefined);
  }, [dir, projects, mcpProject, loaded.mcp, refresh]);

  const browse = async () => {
    const picked = await open({ directory: true, multiple: false, title: 'Choose a project directory' });
    if (typeof picked === 'string') setDir(picked);
  };

  const total = mcp.reduce((n, a) => n + a.servers.length, 0);

  return (
    <Page>
      <PageHeader
        title="MCP"
        subtitle="The servers each account would start in a project. Names and transports only; CSM never reads secret values."
        action={
          <div className="input-row">
            <select className="input input--sm" value={dir || mcpProject || ''} onChange={(e) => setDir(e.target.value)}>
              {!projects.some((p) => p.dir === (dir || mcpProject)) && (dir || mcpProject) ? <option value={dir || mcpProject}>{dir || mcpProject}</option> : null}
              {projects
                .filter((p) => p.exists)
                .map((p) => (
                  <option key={p.dir} value={p.dir}>
                    {p.display}
                  </option>
                ))}
              {projects.length === 0 ? <option value="">Home directory</option> : null}
            </select>
            <Button size="sm" icon={Folder02Icon} onClick={() => void browse()}>
              Browse
            </Button>
          </div>
        }
      />
      {errors.mcp ? <p className="form-error selectable">{errors.mcp}</p> : null}
      {loaded.mcp && total === 0 ? (
        <EmptyState icon={Plug01Icon} title="No MCP servers" body="None of the enabled accounts has an MCP server configured for this directory." />
      ) : (
        mcp.map((a) => (
          <Section
            key={a.account}
            title={
              <span className="inline-title">
                <AgentIcon provider={a.provider} size="md" /> <span className="mono">{a.account}</span>
              </span>
            }
            meta={a.provider_name}
          >
            {a.error ? <p className="muted">{a.error}</p> : a.servers.length === 0 ? <p className="muted">No MCP servers configured.</p> : (
              <div className="list">
                {a.servers.map((s) => (
                  <MCPServerCard key={s.name + s.scope} server={s} />
                ))}
              </div>
            )}
          </Section>
        ))
      )}
    </Page>
  );
}
