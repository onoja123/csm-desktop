export type ProviderID = 'claude' | 'codex' | 'gemini' | 'copilot' | 'cursor';

export type RunStatus = 'running' | 'exited';

export type RunBucket = 'running' | 'waiting' | 'completed' | 'failed' | 'stopped';

export type AgentDetailTab = 'output' | 'files' | 'activity' | 'session' | 'mcp' | 'skills';

export type RunKind = 'agent' | 'handoff';
