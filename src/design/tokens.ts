export const colors = {
  bg: ['#0a0a0a', '#0d0d0d', '#101010', '#141414', '#181818', '#1c1c1c', '#222222', '#2a2a2a'],
  fg: ['#f4f4f2', '#ededea', '#d4d4d0', '#a3a3a0', '#7a7a76', '#565653'],
  line: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.16)'],
  status: {
    ok: '#4ade80',
    warn: '#fbbf24',
    err: '#f87171',
    limit: '#fb923c',
    idle: '#7a7a76',
  },
} as const;

export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72] as const;

export const radius = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 999 } as const;

export const typography = {
  sans: "'Geist Variable', 'Geist', -apple-system, system-ui, sans-serif",
  mono: "'Geist Mono Variable', 'Geist Mono', ui-monospace, Menlo, monospace",
  size: { xs: 11, sm: 12.5, md: 13.5, base: 14, lg: 16, xl: 20, '2xl': 26, '3xl': 34 },
  weight: { regular: 400, medium: 500, semibold: 600 },
} as const;

export const iconSize = { sm: 14, md: 18, lg: 22, xl: 28, '2xl': 36, hero: 48 } as const;

export const duration = { fast: 100, base: 160, slow: 240 } as const;

export type Tone = 'ok' | 'warn' | 'err' | 'limit' | 'idle';
