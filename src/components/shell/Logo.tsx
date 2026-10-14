export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden="true" className="logo-mark">
      <path d="M96 36 A42 42 0 1 0 96 96" fill="none" stroke="var(--fg-0)" strokeWidth="14" strokeLinecap="round" />
      <rect x="74" y="58" width="48" height="16" rx="8" fill="var(--bg-7)" />
      <circle cx="114" cy="66" r="11" fill="var(--ok)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo" aria-label="csm">
      <LogoMark />
      <span className="logo__word" aria-hidden="true">csm</span>
    </span>
  );
}
