import type { ProviderID } from '../enums/agent.enum';
import type { MCPServerState, MCPStatus, MCPTransport } from '../enums/mcp.enum';

export interface MCPServer {
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  env?: string[];
  headers?: string[];
  env_refs?: string[];
  provider: string;
  scope: string;
  source: string;
  approved?: boolean;
  disabled?: boolean;
  oauth?: boolean;
  secret_args?: boolean;
  state: MCPServerState;
  status: MCPStatus;
  reason?: string;
  requires_auth: boolean;
}

export interface MCPAccount {
  account: string;
  provider: ProviderID;
  provider_name: string;
  error?: string;
  servers: MCPServer[];
}
