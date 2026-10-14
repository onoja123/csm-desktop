export type MCPStatus = 'migrated' | 'available' | 'requires_auth' | 'unsupported' | 'failed' | 'unknown';

export type MCPTransport = 'stdio' | 'http' | 'sse' | 'ws';

export type MCPServerState = 'stateless' | 'stateful' | 'unknown';
