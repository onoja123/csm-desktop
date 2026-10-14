import type { Health, ProviderID, StatusTone } from '@/types';

export const PROVIDER_NAMES: Record<ProviderID, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  copilot: 'Copilot',
  cursor: 'Cursor',
};

export const PROVIDER_LONG_NAMES: Record<ProviderID, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
  copilot: 'GitHub Copilot CLI',
  cursor: 'Cursor CLI',
};

export const PROVIDERS: ProviderID[] = ['claude', 'codex', 'gemini', 'copilot', 'cursor'];

export function providerName(id: string | undefined): string {
  return (id && PROVIDER_NAMES[id as ProviderID]) || id || 'Unknown';
}

export function isZeroTime(value?: string | null): boolean {
  return !value || value.startsWith('0001-01-01');
}

export function ago(value?: string | null, now = Date.now()): string {
  if (isZeroTime(value)) return 'never';
  const t = new Date(value as string).getTime();
  if (Number.isNaN(t)) return 'unknown';
  const diff = Math.max(0, Math.round((now - t) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h ${rem}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function until(value?: string | null, now = Date.now()): string {
  if (isZeroTime(value)) return '';
  const t = new Date(value as string).getTime();
  const diff = Math.round((t - now) / 1000);
  if (diff <= 0) return 'now';
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function clock(value?: string | null): string {
  if (isZeroTime(value)) return '';
  const d = new Date(value as string);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function shortPath(path: string, home = ''): string {
  if (home && path.startsWith(home)) return '~' + path.slice(home.length);
  return path;
}

export function baseName(path: string): string {
  const parts = path.replace(/\/+$/, '').split('/');
  return parts[parts.length - 1] || path;
}

export function shortSession(id?: string): string {
  if (!id) return '';
  return id.length > 12 ? id.slice(0, 8) : id;
}

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  rate_limited: 'Rate limited',
  authentication_required: 'Login required',
  unavailable: 'Disabled',
  unknown: 'Unknown',
};

export function healthTone(h: Health): StatusTone {
  switch (h) {
    case 'healthy':
      return 'ok';
    case 'warning':
      return 'warn';
    case 'rate_limited':
      return 'limit';
    case 'authentication_required':
      return 'err';
    default:
      return 'idle';
  }
}

export function percent(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return 'Unknown';
  return `${Math.round(n)}%`;
}

export function kindLabel(kind: string): string {
  return kind.replace(/[._]/g, ' ');
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function liveSeconds(startedAt: string, endedAt: string | undefined, now: number): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt && !endedAt.startsWith('0001') ? new Date(endedAt).getTime() : now;
  return Math.max(0, Math.floor((end - start) / 1000));
}
