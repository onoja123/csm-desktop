import type { ReactNode } from 'react';

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`page ${wide ? 'page--wide' : ''}`}>{children}</div>;
}
