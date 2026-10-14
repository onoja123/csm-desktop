import { Panel } from '@/components/ui';
import { SentryConnect } from './SentryConnect';
import type { SentryConnectProps } from '@/types';

export function SentryConnectPanel(props: SentryConnectProps) {
  return (
    <Panel className="sc-panel">
      <SentryConnect {...props} />
    </Panel>
  );
}
