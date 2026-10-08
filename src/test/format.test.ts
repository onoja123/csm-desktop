import { ago, duration, healthTone, isZeroTime, percent, shortPath, until } from '@/lib/format';

describe('format helpers', () => {
  const now = new Date('2026-10-08T12:00:00Z').getTime();

  it('treats Go zero times as never', () => {
    expect(isZeroTime('0001-01-01T00:00:00Z')).toBe(true);
    expect(ago('0001-01-01T00:00:00Z', now)).toBe('never');
    expect(ago(undefined, now)).toBe('never');
  });

  it('describes elapsed time', () => {
    expect(ago('2026-10-08T11:59:58Z', now)).toBe('just now');
    expect(ago('2026-10-08T11:59:20Z', now)).toBe('40s ago');
    expect(ago('2026-10-08T11:18:00Z', now)).toBe('42 min ago');
    expect(ago('2026-10-08T09:00:00Z', now)).toBe('3h ago');
    expect(ago('2026-10-05T09:00:00Z', now)).toBe('3d ago');
  });

  it('formats durations and countdowns', () => {
    expect(duration(42)).toBe('42s');
    expect(duration(2520)).toBe('42 min');
    expect(duration(3600 * 3 + 60 * 5)).toBe('3h 5m');
    expect(until('2026-10-08T13:10:00Z', now)).toBe('1h 10m');
    expect(until('2026-10-08T11:00:00Z', now)).toBe('now');
  });

  it('never invents a usage figure', () => {
    expect(percent(undefined)).toBe('Unknown');
    expect(percent(83.6)).toBe('84%');
  });

  it('maps health to a restrained tone', () => {
    expect(healthTone('healthy')).toBe('ok');
    expect(healthTone('warning')).toBe('warn');
    expect(healthTone('rate_limited')).toBe('limit');
    expect(healthTone('authentication_required')).toBe('err');
    expect(healthTone('unknown')).toBe('idle');
  });

  it('shortens home paths', () => {
    expect(shortPath('/Users/me/code/x', '/Users/me')).toBe('~/code/x');
    expect(shortPath('/opt/x', '/Users/me')).toBe('/opt/x');
  });
});
