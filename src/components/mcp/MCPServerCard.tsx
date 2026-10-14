import type { IconSvgElement } from '@hugeicons/react';
import { ConnectIcon, Globe02Icon, ServerStack01Icon } from '@hugeicons/core-free-icons';
import { IconTile, StatusText } from '@/components/ui';
import { mcpLabel, mcpTone } from '@/lib/mcp';
import type { MCPServer, MCPTransport } from '@/types';

const TRANSPORT_ICON: Record<MCPTransport, IconSvgElement> = {
  stdio: ServerStack01Icon,
  http: Globe02Icon,
  sse: Globe02Icon,
  ws: ConnectIcon,
};

export function MCPServerCard({ server }: { server: MCPServer }) {
  const tone = mcpTone(server.status, server.requires_auth);
  const target = server.url || [server.command, ...(server.args ?? [])].filter(Boolean).join(' ');

  return (
    <div className="mcp-card">
      <IconTile icon={TRANSPORT_ICON[server.transport] ?? ServerStack01Icon} size="lg" />

      <div className="mcp-card__main">
        <div className="mcp-card__top">
          <span className="mcp-card__name">{server.name}</span>
          <StatusText tone={tone}>{mcpLabel(server.status, server.requires_auth)}</StatusText>
        </div>

        <div className="mcp-card__meta">
          <span>{server.transport}</span>
          <span>{server.scope} scope</span>
          {server.oauth ? <span>OAuth</span> : null}
          {server.env?.length ? <span>{server.env.length} env</span> : null}
          {server.headers?.length ? <span>{server.headers.length} headers</span> : null}
          {server.disabled ? <span>disabled</span> : null}
        </div>

        {target ? <code className="mcp-card__target selectable">{target}</code> : null}
        {server.reason ? <p className="mcp-card__reason">{server.reason}</p> : null}
      </div>
    </div>
  );
}
