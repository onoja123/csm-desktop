export type SessionStatus = 'attention' | 'waiting' | 'running' | 'idle' | 'completed' | 'disconnected';

export type AttentionKind = 'exit' | 'usage_limit' | 'login' | 'handoff';

export type SessionStatusFilter = 'all' | SessionStatus;

export type SessionGroupBy = 'status' | 'project' | 'provider';

export type AgentSessionKind = 'agent' | 'handoff' | 'external';
