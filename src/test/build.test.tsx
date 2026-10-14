import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { BuildRoom } from '@/screens/BuildRoom';
import { NewBuildRun } from '@/screens/NewBuildRun';
import { BuildRun } from '@/screens/BuildRun';
import { parseDiff } from '@/lib/diff';
import { graphColumns, groupOf, primaryAction, slugify, stageSteps } from '@/lib/build';
import type { Build, BuildPreflight, BuildSummary, BuildTask } from '@/types';
import { useData } from '@/store/data';

function task(id: string, over: Partial<BuildTask> = {}): BuildTask {
  return { id, kind: 'implement', title: id.toUpperCase(), objective: `do ${id}`, status: 'blocked', order: 0, ...over };
}

function build(over: Partial<Build> = {}): Build {
  const tasks = over.tasks ?? [task('store', { status: 'ready', provider: 'claude', order: 0 }), task('api', { depends_on: ['store'], provider: 'codex', order: 1 })];
  return {
    id: '20261012-100000-abcdef',
    instruction: 'Add team invitations: a store and endpoints',
    title: 'Add team invitations',
    repo: '/Users/me/teams',
    repo_name: 'teams',
    base_branch: 'main',
    base_commit: '0123456789abcdef',
    status: 'awaiting_plan_approval',
    policy: { max_parallel: 2, require_plan_approval: true, review: true, max_review_cycles: 2, run_baseline: true, allow_remote: true },
    plan: { summary: 'Store first, then endpoints.', suggested_checks: ['rm -rf /'], source: 'Claude Code (work)' },
    tasks,
    integration: {},
    pr: { state: '' },
    cycle: 0,
    created_at: '2026-10-12T10:00:00Z',
    updated_at: '2026-10-12T10:00:00Z',
    events: [{ at: '2026-10-12T10:00:00Z', kind: 'created', message: 'Run created on teams (main at 01234567)' }],
    live: {},
    ops: [],
    summary: {} as BuildSummary,
    verified: false,
    check_summary: { Passed: 0, Failed: 0, Baseline: 0, Blocked: 0, Skipped: 0, NotRun: 0 },
    ...over,
  };
}

function summary(over: Partial<BuildSummary> = {}): BuildSummary {
  return { id: '20261012-100000-abcdef', title: 'Add team invitations', instruction: 'x', repo: '/r', repo_name: 'teams', base_branch: 'main', status: 'running', paused: false, tasks: 3, tasks_completed: 1, tasks_running: 2, tasks_failed: 0, agents: ['claude', 'codex'], state: 'implementing', created_at: '2026-10-12T10:00:00Z', updated_at: '2026-10-12T10:00:00Z', ...over };
}

type Handler = (method: string, path: string, body: unknown) => unknown;

function serve(handler: Handler) {
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd !== 'csm_request') return undefined;
    const a = args as { method: string; path: string; body: string | null };
    try {
      const out = handler(a.method, a.path, a.body ? JSON.parse(a.body) : undefined);
      return { status: 200, body: JSON.stringify(out ?? null) };
    } catch (e) {
      return { status: 409, body: JSON.stringify({ error: (e as Error).message }) };
    }
  });
}

function calls(method: string, prefix: string) {
  return vi.mocked(invoke).mock.calls.filter((c) => {
    const a = c[1] as { method?: string; path?: string } | undefined;
    return a?.method === method && a.path?.startsWith(prefix);
  });
}

function renderRun(id = '20261012-100000-abcdef') {
  return render(
    <MemoryRouter initialEntries={[`/build/${id}`]}>
      <Routes>
        <Route path="/build/:id" element={<BuildRun />} />
        <Route path="/build" element={<p>overview</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('build model', () => {
  it('lays tasks out by dependency depth with fixes last', () => {
    const cols = graphColumns([task('docs', { depends_on: ['api'], order: 2 }), task('api', { depends_on: ['store'], order: 1 }), task('store', { order: 0 }), task('fix-1', { kind: 'fix', order: 3 })]);
    expect(cols.map((c) => c.map((t) => t.id))).toEqual([['store'], ['api'], ['docs'], ['fix-1']]);
  });

  it('survives a cycle in data it is shown', () => {
    expect(graphColumns([task('a', { depends_on: ['b'] }), task('b', { depends_on: ['a'] })]).flat()).toHaveLength(2);
  });

  it('offers the next decision only when the run waits for one', () => {
    expect(primaryAction(build())?.action).toBe('approve-plan');
    expect(primaryAction(build({ status: 'running' }))).toBeUndefined();
    const final = build({ status: 'awaiting_final_approval', pr: { state: 'prepared' } });
    expect(primaryAction(final)?.action).toBe('approve-pr');
    expect(primaryAction({ ...final, pr: { state: 'prepared', blocker: 'no origin remote' } })?.action).toBe('finish');
    expect(primaryAction({ ...final, policy: { ...final.policy, allow_remote: false } })?.action).toBe('finish');
    expect(primaryAction({ ...final, pr: { state: 'preparing' } })).toBeUndefined();
  });

  it('groups runs by what they need from the user', () => {
    expect(groupOf({ status: 'needs_attention' })).toBe('attention');
    expect(groupOf({ status: 'awaiting_final_approval' })).toBe('approval');
    expect(groupOf({ status: 'fixing' })).toBe('active');
    expect(groupOf({ status: 'cancelled' })).toBe('stopped');
  });

  it('marks the current stage', () => {
    const steps = stageSteps(build({ status: 'reviewing' }));
    expect(steps.find((s) => s.state === 'current')?.label).toBe('Review');
    expect(steps.filter((s) => s.state === 'done').map((s) => s.label)).toEqual(['Plan', 'Approve', 'Implement', 'Integrate', 'Check']);
  });

  it('parses a unified diff into files', () => {
    const files = parseDiff('diff --git a/a.go b/a.go\nindex 1..2 100644\n--- a/a.go\n+++ b/a.go\n@@ -1 +1,2 @@\n-x\n+y\n+z\ndiff --git a/b.go b/b.go\nnew file mode 100644\n');
    expect(files.map((f) => [f.path, f.added, f.removed])).toEqual([
      ['a.go', 2, 1],
      ['b.go', 0, 0],
    ]);
  });

  it('makes unique task ids', () => {
    expect(slugify('Invite API!', ['invite-api'])).toBe('invite-api-2');
  });

  it('refreshes the run list when the service reports a change', () => {
    const before = useData.getState().buildStamps['x'] ?? 0;
    expect(useData.getState().applyEvent({ type: 'build', data: { id: 'x', status: 'running' } })).toEqual(['builds']);
    expect(useData.getState().buildStamps['x']).toBe(before + 1);
  });
});

describe('Build Room screens', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    useData.setState({ builds: [], loaded: {}, errors: {}, projects: [] });
  });

  it('shows an empty state, then runs grouped by what they need', async () => {
    serve(() => []);
    const { unmount } = render(
      <MemoryRouter>
        <BuildRoom />
      </MemoryRouter>,
    );
    expect(await screen.findByText('No build runs yet')).toBeInTheDocument();
    unmount();

    serve(() => [summary({ id: '20261012-100000-aaaaaa', title: 'Stuck run', status: 'needs_attention', attention: 'Task "x" needs attention' }), summary({ id: '20261012-100000-bbbbbb', title: 'Busy run' })]);
    render(
      <MemoryRouter>
        <BuildRoom />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Stuck run')).toBeInTheDocument();
    expect(screen.getByText('Needs attention', { selector: '.build-group__head span' })).toBeInTheDocument();
    expect(screen.getByText('Task "x" needs attention')).toBeInTheDocument();
    expect(screen.getAllByText('1/3 tasks')).toHaveLength(2);
  });

  it('shows a load error with a retry', async () => {
    serve(() => {
      throw new Error('service down');
    });
    render(
      <MemoryRouter>
        <BuildRoom />
      </MemoryRouter>,
    );
    expect(await screen.findByText('service down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('creates a run from the repository the service inspected', async () => {
    const pre: BuildPreflight = {
      repo: '/Users/me/teams',
      repo_name: 'teams',
      branch: 'main',
      branches: ['main', 'dev'],
      head: 'abc',
      dirty: ['M README.md'],
      checks: [{ name: 'go test', command: ['go', 'test', './...'], source: 'go.mod' }],
      agents: [
        { id: 'claude', name: 'Claude Code', eligible: true, account: 'work' },
        { id: 'copilot', name: 'GitHub Copilot CLI', eligible: false, reason: 'GitHub Copilot CLI is not installed' },
      ],
      defaults: { max_parallel: 2, require_plan_approval: true, review: true, max_review_cycles: 2, run_baseline: true, allow_remote: true, agents: ['claude'] },
    };
    let created: Record<string, unknown> | undefined;
    serve((method, path, body) => {
      if (path.startsWith('/v1/builds/preflight')) return pre;
      if (method === 'POST' && path === '/v1/builds') {
        created = body as Record<string, unknown>;
        return build();
      }
      if (path === '/v1/projects') return [{ dir: '/Users/me/teams', display: 'teams', exists: true }];
      return [];
    });
    render(
      <MemoryRouter initialEntries={['/build/new']}>
        <Routes>
          <Route path="/build/new" element={<NewBuildRun />} />
          <Route path="/build/:id" element={<p>run page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: /What should be built/ }), { target: { value: 'Add team invitations' } });
    fireEvent.change(screen.getByPlaceholderText('~/Projects/my-project'), { target: { value: '/Users/me/teams' } });
    expect(await screen.findByText(/1 uncommitted change in your working tree is not part of the run/)).toBeInTheDocument();
    expect(screen.getByText('GitHub Copilot CLI is not installed')).toBeInTheDocument();
    expect(screen.getByText('GitHub Copilot CLI is not installed').closest('label')!.querySelector('input')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Draft plan' }));
    expect(await screen.findByText('run page')).toBeInTheDocument();
    expect(created).toMatchObject({ instruction: 'Add team invitations', project_dir: '/Users/me/teams', base_branch: 'main', policy: { require_plan_approval: true, agents: ['claude'], max_parallel: 2 } });
  });
});

describe('Build run workspace', () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it('shows the plan, marks suggested checks as not run, and approves it once', async () => {
    let current = build();
    serve((method, path) => {
      if (method === 'POST' && path.endsWith('/actions/approve-plan')) {
        current = build({ status: 'running' });
        return current;
      }
      return current;
    });
    renderRun();
    expect(await screen.findByText('Store first, then endpoints.')).toBeInTheDocument();
    expect(screen.getByText(/shown only; CSM runs the repository's own commands/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pause/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve plan and start/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve plan and start/ })).not.toBeInTheDocument());
    expect(calls('POST', '/v1/builds/20261012-100000-abcdef/actions/approve-plan')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
  });

  it('edits the plan and shows the service’s validation error', async () => {
    serve((method) => {
      if (method === 'PUT') throw new Error('the dependencies form a cycle: store → api → store');
      return build();
    });
    renderRun();
    fireEvent.click(await screen.findByRole('button', { name: /Edit plan/ }));
    const ids = screen.getAllByRole('textbox', { name: 'Task id' });
    expect(ids).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(await screen.findByText(/form a cycle/)).toBeInTheDocument();
  });

  it('explains what needs attention and offers the recovery actions', async () => {
    const stuck = build({
      status: 'needs_attention',
      attention: 'Merging task api conflicts in server.go',
      recovery: ['continue_integration', 'retry_resolve'],
      tasks: [task('api', { status: 'completed', provider: 'codex' })],
    });
    serve(() => stuck);
    renderRun();
    const banner = await screen.findByRole('alert');
    expect(within(banner).getByText('Merging task api conflicts in server.go')).toBeInTheDocument();
    fireEvent.click(within(banner).getByRole('button', { name: 'Continue integration' }));
    await waitFor(() => expect(calls('POST', '/v1/builds/20261012-100000-abcdef/actions/continue-integration')).toHaveLength(1));
  });

  it('retries a failed task with another agent and keeps cancel behind a confirmation', async () => {
    const t = task('store', {
      status: 'needs_attention',
      provider: 'claude',
      problem: 'the session ended without a completion report (exit status 1)',
      recovery: 'The worktree and its changes are kept. Retry the task, optionally with another agent.',
      worktree: '/x/store',
      branch: 'csm/build-abcdef/store',
      base_commit: '0123456789abcdef',
    });
    serve(() => build({ status: 'needs_attention', tasks: [t], attempts: [{ id: 'a1', role: 'implement', task_id: 'store', provider: 'claude', account: 'work', dir: '/x/store', status: 'failed', started_at: '2026-10-12T10:00:00Z', note: 'no Claude Code account is ready' }] }));
    renderRun();
    expect(await screen.findByText('the session ended without a completion report (exit status 1)')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Agent for this task' }), { target: { value: 'codex' } });
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(calls('POST', '/v1/builds/20261012-100000-abcdef/actions/retry-task')).toHaveLength(1));
    const body = JSON.parse((calls('POST', '/v1/builds/20261012-100000-abcdef/actions/retry-task')[0][1] as { body: string }).body);
    expect(body).toEqual({ task: 'store', provider: 'codex' });

    fireEvent.click(screen.getByRole('button', { name: /Cancel run/ }));
    expect(calls('POST', '/v1/builds/20261012-100000-abcdef/actions/cancel')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Stop agents and cancel' }));
    await waitFor(() => expect(calls('POST', '/v1/builds/20261012-100000-abcdef/actions/cancel')).toHaveLength(1));
  });

  it('separates what CSM measured from what the agent reported, and labels review findings by source', async () => {
    const done = task('store', {
      status: 'completed',
      provider: 'codex',
      account: 'codex-main',
      worktree: '/x/store',
      base_commit: '0123',
      switches: [{ at: '2026-10-12T10:01:00Z', from: 'claude/work', to: 'codex/codex-main', reason: 'usage_limit', started: true, commit: '9f8e7d6c5b4a', from_session: 'aaaa1111-0000', to_session: 'bbbb2222-0000' }],
      completion: { files_changed: ['invite.go'], commit: 'abcdef1234', summary: 'Added the store', discrepancies: ['reported changing missing.go, but the branch does not change it'] },
    });
    serve(() =>
      build({
        status: 'awaiting_final_approval',
        tasks: [done],
        reviews: [{ cycle: 1, provider: 'gemini', independent: false, note: 'No different agent was available, so this review is not independent.', status: 'completed', at: '2026-10-12T10:02:00Z', blocking_open: 0, findings: 1, verdict: 'approve' }],
        findings: [{ id: 'f1', cycle: 1, severity: 'high', title: 'Expired invitations can be accepted', blocking: true, status: 'rechecked', source: 'review by Gemini CLI (gemini-main) (agent finding, not verified by CSM)' }],
        pr: { state: 'prepared', blocker: 'the repository has no origin remote' },
      }),
    );
    renderRun();
    fireEvent.click(await screen.findByRole('button', { name: /STORE/ }));
    expect(screen.getByText('Measured by CSM')).toBeInTheDocument();
    expect(screen.getByText('Reported by the agent')).toBeInTheDocument();
    expect(screen.getByText(/missing.go, but the branch does not change it/)).toBeInTheDocument();
    expect(screen.getByText(/Usage limit: claude\/work → codex\/codex-main/)).toBeInTheDocument();
    expect(screen.getByText(/claude\/work's work in 9f8e7d6c/)).toBeInTheDocument();
    expect(screen.getByText(/session aaaa1111 → bbbb2222/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Review/ }));
    expect(screen.getByText(/this review is not independent/)).toBeInTheDocument();
    expect(screen.getByText(/agent finding, not verified by CSM/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish with local branch/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Push branch/ })).not.toBeInTheDocument();
  });

  it('says when a run cannot be found', async () => {
    vi.mocked(invoke).mockImplementation(async () => ({ status: 404, body: JSON.stringify({ error: 'no such build run' }) }));
    renderRun();
    expect(await screen.findByText('Build run not found')).toBeInTheDocument();
  });
});
