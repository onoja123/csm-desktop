import { Panel, Row, StatusText } from '@/components/ui';
import type { Build } from '@/types';

export function InvestigationPanel({ build: b }: { build: Build }) {
  const inv = b.investigation;

  if (!inv || !inv.classification) {
    return (
      <Panel>
        <h4 className="panel__h4">Investigation</h4>

        <p className="muted">
          {b.status === 'investigating'
            ? 'An agent is reading the code the evidence points to.'
            : 'Not started.'}
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="panel__header">
        <div className="panel__title">
          <h3>Investigation</h3>
          <span className="panel__meta">{inv.source}'s analysis, not verified</span>
        </div>

        <StatusText tone={inv.classification === 'code_defect' ? 'warn' : 'idle'}>
          {inv.classification.replace(/_/g, ' ')}
        </StatusText>
      </div>

      {inv.summary ? <p className="selectable">{inv.summary}</p> : null}

      {inv.root_cause ? (
        <p className="selectable af-rootcause">
          <span className="muted">Suspected root cause: </span>
          {inv.root_cause}
        </p>
      ) : null}

      {inv.test ? (
        <Row label="Regression test" mono>
          {inv.test.name} in {inv.test.files.join(', ')}
        </Row>
      ) : null}

      {inv.ignored_edits?.length ? (
        <p className="muted">
          The investigator also changed {inv.ignored_edits.length} non-test file(s); CSM did not use
          those changes.
        </p>
      ) : null}
    </Panel>
  );
}
