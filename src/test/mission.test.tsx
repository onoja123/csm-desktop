import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionRow } from '@/components/mission/SessionRow';
import {
  countByStatus,
  filterSessions,
  groupSessions,
  mentionsProject,
  normalizeSessions,
} from '@/lib/mission';
import type { Activity, Approval, ExternalRun, MissionInput, Run, ServiceStatus } from '@/types';
import { leaf } from '@/terminal/layout';

const NOW = new Date('2026-10-12T10:10:00Z').getTime();

const status: ServiceStatus = {
  service: {
    version: '1',
    pid: 1,
    started_at: '2026-10-12T09:00:00Z',
    socket: '/tmp/csm.sock',
    home: '/Users/me/.csm',
  },
  failover_policy: 'automatic',
  providers: [
    { id: 'claude', name: 'Claude Code', installed: true, resume: true },
    { id: 'codex', name: 'Codex', installed: true, resume: false },
    { id: 'gemini', name: 'Gemini CLI', installed: false },
    { id: 'copilot', name: 'GitHub Copilot CLI', installed: false },
  ],
  accounts: 3,
  live_runs: 1,
  pending_approvals: 0,
  approvals_enabled: true,
};

function run(over: Partial<Run>): Run {
  return {
    id: 'r1',
    kind: 'agent',
    provider: 'claude',
    account: 'work',
    project_dir: '/Users/me/Projects/shop',
    branch: 'main',
    status: 'running',
    started_at: '2026-10-12T10:00:00Z',
    last_output_at: '2026-10-12T10:09:50Z',
    csm_pid: 10,
    task: { summary: 'Implement payment retry logic' },
    duration_seconds: 600,
    ...over,
  };
}

function input(over: Partial<MissionInput>): MissionInput {
  return {
    runs: [],
    external: [],
    approvals: [],
    activity: [],
    accounts: [],
    status,
    tabs: [],
    panes: {},
    connected: true,
    now: NOW,
    ...over,
  };
}

describe('mission control normalization', () => {
  it('reports a run with recent output as running', () => {
    const [s] = normalizeSessions(input({ runs: [run({})] }));

    expect(s.status).toBe('running');
    expect(s.title).toBe('Implement payment retry logic');
    expect(s.project).toBe('shop');
    expect(s.observable).toBe(true);
  });

  it('reports a quiet run as idle with the time since its last output', () => {
    const [s] = normalizeSessions(
      input({ runs: [run({ last_output_at: '2026-10-12T10:07:00Z' })] }),
    );

    expect(s.status).toBe('idle');
    expect(s.detail).toBe('No output for 3 min');
  });

  it('treats a run that never produced output as idle only after the threshold', () => {
    const fresh = normalizeSessions(
      input({ runs: [run({ last_output_at: undefined, started_at: '2026-10-12T10:09:30Z' })] }),
    )[0];

    expect(fresh.status).toBe('running');

    const old = normalizeSessions(
      input({ runs: [run({ last_output_at: undefined, started_at: '2026-10-12T10:00:00Z' })] }),
    )[0];

    expect(old.status).toBe('idle');
  });

  it('puts a run with a pending approval in waiting, with the command', () => {
    const approval: Approval = {
      id: 'a1',
      run_id: 'r1',
      provider: 'claude',
      account: 'work',
      tool_name: 'Bash',
      command: 'npm test',
      destructive: false,
      requested_at: '2026-10-12T10:09:00Z',
    };

    const [s] = normalizeSessions(
      input({ runs: [run({ last_output_at: '2026-10-12T10:00:00Z' })], approvals: [approval] }),
    );

    expect(s.status).toBe('waiting');
    expect(s.detail).toBe('npm test');
    expect(s.approval?.id).toBe('a1');
  });

  it('maps exit codes to completed, stopped and attention', () => {
    const ok = normalizeSessions(
      input({ runs: [run({ status: 'exited', exit_code: 0, ended_at: '2026-10-12T10:05:00Z' })] }),
    )[0];

    expect(ok.status).toBe('completed');
    expect(ok.label).toBe('Completed');

    const stopped = normalizeSessions(
      input({
        runs: [run({ status: 'exited', exit_code: 130, ended_at: '2026-10-12T10:05:00Z' })],
      }),
    )[0];

    expect(stopped.status).toBe('completed');
    expect(stopped.label).toBe('Stopped');

    const failed = normalizeSessions(
      input({ runs: [run({ status: 'exited', exit_code: 1, ended_at: '2026-10-12T10:05:00Z' })] }),
    )[0];

    expect(failed.status).toBe('attention');
    expect(failed.attention).toEqual({ kind: 'exit', reason: 'Exited with status 1' });
  });

  it('offers resume only for exited runs whose provider reports resume support', () => {
    const claude = normalizeSessions(
      input({ runs: [run({ status: 'exited', exit_code: 0, session_id: 'abc' })] }),
    )[0];

    expect(claude.canResume).toBe(true);

    const codex = normalizeSessions(
      input({
        runs: [run({ provider: 'codex', status: 'exited', exit_code: 0, session_id: 'abc' })],
      }),
    )[0];

    expect(codex.canResume).toBe(false);

    const live = normalizeSessions(input({ runs: [run({ session_id: 'abc' })] }))[0];

    expect(live.canResume).toBe(false);

    const noSession = normalizeSessions(
      input({ runs: [run({ status: 'exited', exit_code: 0 })] }),
    )[0];

    expect(noSession.canResume).toBe(false);
  });

  it('matches activity to a project by its displayed path', () => {
    expect(mentionsProject('usage limit · ~/Projects/shop', '/Users/me/Projects/shop')).toBe(true);
    expect(mentionsProject('/Users/me/Projects/shop', '/Users/me/Projects/shop')).toBe(true);
    expect(mentionsProject('~/Projects/shop-admin', '/Users/me/Projects/shop')).toBe(false);
    expect(mentionsProject(undefined, '/Users/me/Projects/shop')).toBe(false);
  });

  it('flags a usage limit with no switch as needing attention', () => {
    const limit: Activity = {
      id: 'l',
      at: '2026-10-12T10:05:00Z',
      kind: 'usage_limit',
      provider: 'claude',
      account: 'work',
      title: 'Claude Code hit a usage limit on work',
      detail: '~/Projects/shop',
    };

    const [s] = normalizeSessions(input({ runs: [run({})], activity: [limit] }));

    expect(s.status).toBe('attention');
    expect(s.attention?.kind).toBe('usage_limit');
    expect(s.attention?.reason).toBe('Usage limit on work');
  });

  it('clears the usage limit once CSM records the switch and shows the new account', () => {
    const limit: Activity = {
      id: 'l',
      at: '2026-10-12T10:05:00Z',
      kind: 'usage_limit',
      provider: 'claude',
      account: 'work',
      title: 'Claude Code hit a usage limit on work',
      detail: '~/Projects/shop',
    };

    const sw: Activity = {
      id: 's',
      at: '2026-10-12T10:05:02Z',
      kind: 'switch',
      provider: 'claude',
      account: 'personal',
      title: 'CSM switched work → personal',
      detail: 'usage limit · ~/Projects/shop',
    };

    const [s] = normalizeSessions(
      input({ runs: [run({ account: 'personal' })], activity: [sw, limit] }),
    );

    expect(s.status).toBe('running');
    expect(s.account).toBe('personal');

    expect(s.switched).toEqual({
      from: 'work',
      to: 'personal',
      reason: 'usage limit',
      at: '2026-10-12T10:05:02Z',
    });
  });

  it('ignores events from before the run started or for another project', () => {
    const old: Activity = {
      id: 'l',
      at: '2026-10-12T09:00:00Z',
      kind: 'usage_limit',
      provider: 'claude',
      account: 'work',
      title: 'limit',
      detail: '~/Projects/shop',
    };

    const other: Activity = {
      id: 'o',
      at: '2026-10-12T10:05:00Z',
      kind: 'usage_limit',
      provider: 'claude',
      account: 'work',
      title: 'limit',
      detail: '~/Projects/other',
    };

    const [s] = normalizeSessions(input({ runs: [run({})], activity: [old, other] }));

    expect(s.status).toBe('running');
  });

  it('reports a failed handoff and a login-required account as attention', () => {
    const failed: Activity = {
      id: 'h',
      at: '2026-10-12T10:05:00Z',
      kind: 'handoff.failed',
      provider: 'claude',
      account: 'work',
      title: 'Handoff failed',
      detail: 'target not installed · ~/Projects/shop',
    };

    const h = normalizeSessions(input({ runs: [run({})], activity: [failed] }))[0];

    expect(h.attention?.kind).toBe('handoff');

    const login = normalizeSessions(
      input({
        runs: [run({})],
        accounts: [
          {
            name: 'work',
            provider: 'claude',
            provider_name: 'Claude Code',
            active: true,
            enabled: true,
            health: 'authentication_required',
            status: 'not authenticated',
            priority: 1,
            usage_label: 'unknown',
            failures_24h: 0,
            created_at: '2026-10-01T00:00:00Z',
            profile_dir: '/x',
            failover_eligible: false,
            running: true,
          },
        ],
      }),
    )[0];

    expect(login.status).toBe('attention');
    expect(login.attention?.reason).toBe('Login required for work');
  });

  it('shows a session started in a terminal as running but not observable', () => {
    const ext: ExternalRun = {
      id: 'external-5',
      kind: 'external',
      provider: 'codex',
      account: 'main',
      project_dir: '/Users/me/Projects/api',
      status: 'running',
      started_at: '2026-10-12T09:50:00Z',
      csm_pid: 5,
      duration_seconds: 1200,
    };

    const [s] = normalizeSessions(input({ external: [ext] }));

    expect(s.status).toBe('running');
    expect(s.observable).toBe(false);
    expect(s.label).toBe('Running in a terminal');
    expect(s.runId).toBeUndefined();
  });

  it('links a run to the terminal tab that shows it and a terminal session to a shell in its directory', () => {
    const ext: ExternalRun = {
      id: 'external-5',
      kind: 'external',
      provider: 'codex',
      account: 'main',
      project_dir: '/Users/me/Projects/api',
      status: 'running',
      started_at: '2026-10-12T09:50:00Z',
      csm_pid: 5,
      duration_seconds: 1200,
    };

    const sessions = normalizeSessions(
      input({
        runs: [run({})],
        external: [ext],
        tabs: [
          { id: 't1', layout: leaf('p1'), activePaneId: 'p1' },
          { id: 't2', layout: leaf('p2'), activePaneId: 'p2' },
        ],
        panes: {
          p1: {
            kind: 'shell',
            id: 'p1',
            sessionId: 's1',
            cwd: '/Users/me/Projects/api',
            title: 'api',
          },
          p2: { kind: 'agent', id: 'p2', runId: 'r1', title: 'claude' },
        },
      }),
    );

    expect(sessions.find((s) => s.id === 'r1')?.terminal).toEqual({
      tabId: 't2',
      tabIndex: 2,
      paneId: 'p2',
      kind: 'agent',
    });

    expect(sessions.find((s) => s.id === 'external-5')?.terminal).toEqual({
      tabId: 't1',
      tabIndex: 1,
      paneId: 'p1',
      kind: 'shell',
    });
  });

  it('marks everything disconnected when the service is unreachable', () => {
    const [s] = normalizeSessions(input({ runs: [run({})], connected: false }));

    expect(s.status).toBe('disconnected');
  });

  it('orders attention first, then waiting, running, idle and completed', () => {
    const approval: Approval = {
      id: 'a1',
      run_id: 'w',
      provider: 'claude',
      account: 'work',
      tool_name: 'Bash',
      command: 'ls',
      destructive: false,
      requested_at: '2026-10-12T10:09:00Z',
    };

    const sessions = normalizeSessions(
      input({
        runs: [
          run({ id: 'done', status: 'exited', exit_code: 0 }),
          run({ id: 'idle', last_output_at: '2026-10-12T10:00:00Z' }),
          run({ id: 'w' }),
          run({ id: 'live' }),
          run({ id: 'bad', status: 'exited', exit_code: 2 }),
        ],
        approvals: [approval],
      }),
    );

    expect(sessions.map((s) => s.id)).toEqual(['bad', 'w', 'live', 'idle', 'done']);

    expect(countByStatus(sessions)).toEqual({
      attention: 1,
      waiting: 1,
      running: 1,
      idle: 1,
      completed: 1,
      disconnected: 0,
    });
  });

  it('filters by status and searches real metadata', () => {
    const sessions = normalizeSessions(
      input({
        runs: [
          run({ id: 'a', project_dir: '/p/shop', branch: 'feature/retry' }),
          run({
            id: 'b',
            project_dir: '/p/api',
            account: 'personal',
            task: { summary: 'Write docs' },
          }),
        ],
      }),
    );

    expect(filterSessions(sessions, 'all', 'retry').map((s) => s.id)).toEqual(['a']);
    expect(filterSessions(sessions, 'all', 'personal docs').map((s) => s.id)).toEqual(['b']);
    expect(filterSessions(sessions, 'all', 'api').map((s) => s.id)).toEqual(['b']);
    expect(filterSessions(sessions, 'completed', '')).toEqual([]);
  });

  it('groups by project, provider and status', () => {
    const sessions = normalizeSessions(
      input({
        runs: [
          run({ id: 'a', project_dir: '/p/shop' }),
          run({
            id: 'b',
            project_dir: '/p/api',
            provider: 'codex',
            status: 'exited',
            exit_code: 0,
          }),
        ],
      }),
    );

    expect(groupSessions(sessions, 'project').map((g) => [g.title, g.sessions.length])).toEqual([
      ['shop', 1],
      ['api', 1],
    ]);

    expect(groupSessions(sessions, 'provider').map((g) => g.title)).toEqual([
      'Claude Code',
      'Codex',
    ]);

    expect(groupSessions(sessions, 'status').map((g) => g.title)).toEqual(['Running', 'Completed']);
  });
});

describe('session row', () => {
  it('shows the real task, account, project, terminal tab and status', () => {
    const [s] = normalizeSessions(
      input({
        runs: [run({})],
        tabs: [{ id: 't1', layout: leaf('p1'), activePaneId: 'p1' }],
        panes: { p1: { kind: 'agent', id: 'p1', runId: 'r1', title: 'claude' } },
      }),
    );

    const onSelect = vi.fn();

    render(
      <MemoryRouter>
        <SessionRow session={s} selected={false} now={NOW} onSelect={onSelect} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Implement payment retry logic')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('shop')).toBeInTheDocument();
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('10 min')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('row'));
    expect(onSelect).toHaveBeenCalledWith('r1');
  });
});

describe('automatic handoff in mission control', () => {
  it('shows a run that moved to another agent as switched, not as needing attention', () => {
    const limit: Activity = {
      id: 'l',
      at: '2026-10-12T10:05:00Z',
      kind: 'usage_limit',
      provider: 'claude',
      account: 'work',
      title: 'Claude Code hit a usage limit on work',
      detail: '~/Projects/shop',
    };

    const handed: Activity = {
      id: 'h',
      at: '2026-10-12T10:05:03Z',
      kind: 'handoff.automatic',
      provider: 'codex',
      account: 'codex-main',
      title: 'Automatic handoff after a usage limit: claude/work → codex/codex-main',
      detail: '~/Projects/shop',
    };

    const [s] = normalizeSessions(
      input({
        runs: [run({ provider: 'codex', account: 'codex-main' })],
        activity: [handed, limit],
      }),
    );

    expect(s.status).toBe('running');
    expect(s.providerName).toBe('Codex');

    expect(s.switched).toEqual({
      from: 'claude/work',
      to: 'codex/codex-main',
      reason: 'usage limit, another agent',
      at: '2026-10-12T10:05:03Z',
    });
  });
});
