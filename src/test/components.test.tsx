import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AgentCard } from '@/components/agents/AgentCard';
import { bucketOf } from '@/lib/runs';
import type { Account, Approval, Run } from '@/types';

const run: Run = {
  id: 'r1',
  kind: 'agent',
  provider: 'claude',
  account: 'work',
  project_dir: '/Users/me/Projects/shop',
  branch: 'feature/payment-retry',
  status: 'running',
  started_at: '2026-10-08T11:00:00Z',
  csm_pid: 1,
  task: { summary: 'Implement payment retry logic', files_modified: ['a.ts', 'b.ts'] },
  duration_seconds: 2520,
};

const account: Account = {
  name: 'work',
  provider: 'claude',
  provider_name: 'Claude Code',
  active: true,
  enabled: true,
  health: 'rate_limited',
  status: 'cooldown',
  priority: 1,
  usage_label: 'unknown',
  failures_24h: 1,
  created_at: '2026-10-01T00:00:00Z',
  profile_dir: '~/.csm/accounts/work',
  failover_eligible: false,
  cooldown_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  running: true,
};

describe('components', () => {
  it('shows the real task, account, branch and file count on an agent card', () => {
    render(
      <MemoryRouter>
        <AgentCard run={run} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Implement payment retry logic')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('feature/payment-retry')).toBeInTheDocument();
    expect(screen.getByText('2 files touched')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows unknown usage instead of a guess', () => {
    render(
      <MemoryRouter>
        <AccountCard account={account} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Usage unknown')).toBeInTheDocument();
    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
  });

  it('requires a second step before approving a destructive command', () => {
    const approval: Approval = {
      id: 'a',
      provider: 'claude',
      account: 'work',
      tool_name: 'Bash',
      command: 'rm -rf dist',
      destructive: true,
      requested_at: new Date().toISOString(),
    };

    const onDecide = vi.fn();

    render(<ApprovalCard approval={approval} onDecide={onDecide} />);
    fireEvent.click(screen.getByText('Approve anyway…'));
    expect(onDecide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Yes, approve'));
    expect(onDecide).toHaveBeenCalledWith('allow');
    fireEvent.click(screen.getByText('Reject'));
    expect(onDecide).toHaveBeenCalledWith('deny');
  });

  it('approves a plain command in one step', () => {
    const approval: Approval = {
      id: 'a',
      provider: 'claude',
      account: 'work',
      tool_name: 'Bash',
      command: 'npm test',
      destructive: false,
      requested_at: new Date().toISOString(),
    };

    const onDecide = vi.fn();

    render(<ApprovalCard approval={approval} onDecide={onDecide} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onDecide).toHaveBeenCalledWith('allow');
  });

  it('buckets tasks by state without inventing progress', () => {
    const waiting = new Set(['r1']);

    expect(bucketOf(run, waiting)).toBe('waiting');
    expect(bucketOf(run, new Set())).toBe('running');
    expect(bucketOf({ ...run, status: 'exited', exit_code: 0 }, new Set())).toBe('completed');
    expect(bucketOf({ ...run, status: 'exited', exit_code: 143 }, new Set())).toBe('stopped');
    expect(bucketOf({ ...run, status: 'exited', exit_code: 2 }, new Set())).toBe('failed');
  });
});
