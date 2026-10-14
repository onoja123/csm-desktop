import { render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { ReceiptView } from '@/components/build/ReceiptView';
import type { Build, Receipt } from '@/lib/types';

const build = { id: '20261014-101500-abc123', updated_at: '2026-10-14T10:00:00Z' } as Build;

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    version: 1,
    generated_at: '2026-10-14T10:00:00Z',
    build_id: build.id,
    title: 'Add a greeting',
    status: 'awaiting_final_approval',
    final: false,
    partial: false,
    repo: '/r',
    repo_name: 'demo',
    base_commit: 'cccccccccccc',
    outcome: 'verified',
    headline: 'Verified on aaaaaaaa: 2 of 2 checks passed',
    revision: { branch: 'csm/build/integration', commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', files: ['greet.go'] },
    checks: [
      { name: 'go build', command: 'go build ./...', stage: 'integration', status: 'passed', exit_code: 0, duration_ms: 1200, commit: 'aaaaaaaaaaaa' },
      { name: 'go test', command: 'go test ./...', stage: 'integration', status: 'passed', exit_code: 0, duration_ms: 3400, commit: 'aaaaaaaaaaaa', tests: { unit: 'packages', passed: 2, failed: 0, total: 2, from: 'go' } },
    ],
    claims: [{ task_id: 'greet', kind: 'test', claim: 'go test ./...: ok', status: 'confirmed', evidence: 'CSM ran go test ./... on aaaaaaaa: passed (exit 0)' }],
    agents: [],
    review: { enabled: true, rounds: [{ cycle: 1, agent: 'Codex (work-codex)', independent: true, verdict: 'approve', status: 'completed', findings: 0 }], independent: true, open_blocking: 0, open_non_blocking: 0, fix_requested: 0, rechecked: 0, accepted_by_user: 0, check_findings: 0 },
    acceptance: { passed: true, reasons: ['every check passed on the verified revision and no blocking finding is open'] },
    pull_request: { state: 'not_prepared', pushed: false },
    drift: { checked_at: '2026-10-14T10:00:00Z', where: '~/w', same_as_verified: true, note: 'the branch is still exactly the verified revision' },
    limitations: ['Passing checks do not show the change is free of bugs.'],
    ...over,
  };
}

function serveReceipt(r: Receipt | Error) {
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd !== 'csm_request') return undefined;
    const a = args as { path: string };
    if (!a.path.endsWith('/receipt')) return { status: 404, body: JSON.stringify({ error: 'unexpected' }) };
    if (r instanceof Error) return { status: 404, body: JSON.stringify({ error: r.message }) };
    return { status: 200, body: JSON.stringify(r) };
  });
}

describe('ReceiptView', () => {
  it('shows a complete receipt with the verified revision, checks and confirmed claims', async () => {
    serveReceipt(receipt({ final: true, status: 'completed' }));
    render(<ReceiptView build={build} />);
    await screen.findByText('Verified on aaaaaaaa: 2 of 2 checks passed');
    expect(screen.getByText('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('the branch is still exactly the verified revision')).toBeInTheDocument();
    expect(screen.getByText('2/2 packages passed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Met')).toBeInTheDocument();
  });

  it('opens failed checks and marks contradicted claims', async () => {
    serveReceipt(
      receipt({
        outcome: 'failed',
        headline: 'Failed on aaaaaaaa: 1 check(s) failed, 1 passed, 0 not conclusive',
        checks: [{ name: 'go test', command: 'go test ./...', stage: 'integration', status: 'failed', exit_code: 1, duration_ms: 900, output: '--- FAIL: TestGreet' }],
        claims: [{ task_id: 'greet', kind: 'test', claim: 'go test ./...: all pass', status: 'contradicted', evidence: 'CSM ran go test ./... on aaaaaaaa: failed (exit 1)' }],
        acceptance: { passed: false, reasons: ['checks: failed'] },
      }),
    );
    render(<ReceiptView build={build} />);
    await screen.findByText(/Failed on aaaaaaaa/);
    expect(screen.getByText('exit 1')).toBeInTheDocument();
    expect(screen.getByText('--- FAIL: TestGreet')).toBeVisible();
    expect(screen.getByText('Contradicted')).toBeInTheDocument();
    expect(screen.getByText(/1 contradicted by what CSM measured/)).toBeInTheDocument();
    expect(screen.getByText('Not met')).toBeInTheDocument();
  });

  it('lists missing evidence on a partial receipt and warns when the branch moved', async () => {
    serveReceipt(
      receipt({
        outcome: 'partially_verified',
        partial: true,
        final: true,
        partial_reasons: ['npm run lint is unavailable'],
        checks: [{ name: 'npm run lint', command: 'npm run lint', stage: 'integration', status: 'unavailable', duration_ms: 0, reason: 'npm is not installed or not on PATH' }],
        drift: { checked_at: '', where: '', same_as_verified: false, note: 'the branch is now at bbbbbbbb; the commits after aaaaaaaa have not been verified' },
      }),
    );
    render(<ReceiptView build={build} />);
    await screen.findByText('Missing evidence');
    expect(screen.getByText('npm run lint is unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Final, partial evidence')).toBeInTheDocument();
    expect(screen.getByText(/have not been verified/)).toBeInTheDocument();
  });

  it('explains when there is no receipt yet and when it cannot be read', async () => {
    serveReceipt(receipt({ outcome: 'unverified', headline: 'Unverified: CSM has not run any checks on this change', checks: [], claims: [], drift: undefined }));
    const { unmount } = render(<ReceiptView build={build} />);
    await screen.findByText('No checks have run on the integrated branch yet.');
    expect(screen.getByText('No agent has reported on its work yet.')).toBeInTheDocument();
    unmount();

    serveReceipt(new Error('no build run'));
    render(<ReceiptView build={build} />);
    await waitFor(() => expect(screen.getByText('The receipt could not be read')).toBeInTheDocument());
  });
});
