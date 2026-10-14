export type Health =
  'healthy' | 'warning' | 'rate_limited' | 'authentication_required' | 'unavailable' | 'unknown';

export type AccountStatus = 'ready' | 'disabled' | 'not authenticated' | 'cooldown';

export type FailoverPolicy = 'automatic' | 'manual' | 'disabled';

export type SwitchMode = 'none' | 'session' | 'active';
