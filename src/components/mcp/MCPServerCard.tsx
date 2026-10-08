import { Cable, Globe, Server, type LucideIcon } from 'lucide-react';
import { IconTile, StatusText } from '@/components/ui';
import type { MCPServer, MCPStatus } from '@/lib/types';
import type { Tone } from '@/design/tokens';

const TRANSPORT_ICON: Record<MCPServer['transport'], LucideIcon> = { stdio: Server, http: Globe, sse: Globe, ws: Cable };

export function mcpTone(status: MCPStatus, requiresAuth: boolean): Tone {
  if (requiresAuth || status === 'requires_auth') return 'warn';
  switch (status) {
    case 'available':
    case 'migrated':
      return 'ok';
    case 'failed':
      return 'err';
    case 'unsupported':
      return 'warn';
    default:
      return 'idle';
  }
}

export function mcpLabel(status: MCPStatus, requiresAuth: boolean): string {
  if (requiresAuth || status === 'requires_auth') return 'Authentication required';
  switch (status) {
    case 'available':
      return 'Configured';
    case 'migrated':
      return 'Carried over';
    case 'failed':
      return 'Failed';
    case 'unsupported':
      return 'Unsupported';
    default:
      return 'Unknown';
  }
}

export function MCPServerCard({ server }: { server: MCPServer }) {
  const tone = mcpTone(server.status, server.requires_auth);
  const target = server.url || [server.command, ...(server.args ?? [])].filter(Boolean).join(' ');
  return (
    <div className="mcp-card">
      <IconTile icon={TRANSPORT_ICON[server.transport] ?? Server} size="lg" />
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
