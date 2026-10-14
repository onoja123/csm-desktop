import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="shell">
      <Sidebar />

      <div className="shell__main">
        <TopBar title={title} />
        <main className="shell__content">{children}</main>
      </div>
    </div>
  );
}
