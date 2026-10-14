import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { AutoFix } from '@/screens/AutoFix';
import { BuildRun } from '@/screens/BuildRun';
import { IncidentPanel, VerificationPanel } from '@/components/autofix/AutofixPanels';
import { SentryConnect, deliveryHealth } from '@/components/autofix/SentryConnect';
import { stageSteps } from '@/lib/build';
import type { AutofixConfig, Build, BuildSummary, HubIntegration, HubStatus, Incident, Signal } from '@/lib/types';
import { useData } from '@/store/data';

const signal: Signal = {
  source: 'sentry',
  event_type: 'error.created',
  external_id: 'event:1',
  fingerprint: 'sentry:demo-api:7001',
  title: 'runtime error: integer divide by zero',
  culprit: 'stats.go in Average',
  severity: 'high',
  environment: 'production',
  repository: { project: 'demo-api' },
  occurred_at: '2026-10-12T10:00:00Z',
  received_at: '2026-10-12T10:00:01Z',
  evidence: { kind: 'sentry', sentry: { count: 37, exceptions: [{ type: 'runtime.Error', value: 'integer divide by zero', frames: [{ file: 'stats.go', function: 'Average', line: 11, in_app: true, context: 'return sum / len(xs)' }] }] } },
};

function autofixBuild(over: Partial<Build> = {}): Build {
  return {
    id: '20261012-100000-abcdef',
    kind: 'autofix',
    signal,
    instruction: 'Fix the failure reported by sentry',
    title: 'Fix: runtime error: integer divide by zero',
    repo: '/r',
    repo_name: 'demo-api',
    base_branch: 'main',
    base_commit: '0123456789abcdef',
    status: 'awaiting_final_approval',
    policy: { max_parallel: 1, require_plan_approval: false, review: true, max_review_cycles: 2, run_baseline: true, allow_remote: true },
    plan: {},
    tasks: [],
    integration: { head: 'abc' },
    pr: { state: 'prepared', blocker: 'the repository has no origin remote' },
    cycle: 1,
    created_at: '2026-10-12T10:00:00Z',
    updated_at: '2026-10-12T10:00:00Z',
    events: [],
    live: {},
    ops: [],
    summary: {} as BuildSummary,
    verified: true,
    check_summary: { Passed: 3, Failed: 0, Baseline: 0, Blocked: 0, Skipped: 0, NotRun: 0 },
    investigation: { classification: 'code_defect', summary: 'Average divides by len(xs) without a guard.', root_cause: 'stats.go:11', source: 'Claude Code (work)', test: { language: 'go', name: 'TestAverageOfNoValues', files: ['stats_test.go'] } },
    verification: {
      reproduction: 'reproduced',
      reproduction_reason: 'TestAverageOfNoValues failed on the current code (exit 1)',
      failure_gone: true,
      test_unchanged: true,
      checks_passed: true,
      verdict: 'fixed_and_verified',
      before: { exit_code: 1, output: '--- FAIL: TestAverageOfNoValues', duration: 1, sandboxed: true, runner: 'docker', image: 'golang:1.25-alpine', limits: '2 CPU, 2g memory, 512 processes, 5m0s, network off', started_at: '2026-10-12T10:00:00Z', command: ['go', 'test', '-run', '^TestAverageOfNoValues$', '.'] },
    },
    ...over,
  };
}

function serve(routes: Record<string, unknown>, onPut?: (body: unknown) => unknown) {
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd !== 'csm_request') return undefined;
    const a = args as { method: string; path: string; body: string | null };
    if (a.method === 'PUT' && onPut) {
      try {
        return { status: 200, body: JSON.stringify(onPut(JSON.parse(a.body ?? '{}'))) };
      } catch (e) {
        return { status: 400, body: JSON.stringify({ error: (e as Error).message }) };
      }
    }
    const key = Object.keys(routes).find((k) => a.path.startsWith(k));
    return { status: 200, body: JSON.stringify(key ? routes[key] : []) };
  });
}

describe('AutoFix model', () => {
  it('shows the AutoFix stages, not the Build Room plan stages', () => {
    const steps = stageSteps(autofixBuild({ status: 'reproducing' }));
    expect(steps.map((s) => s.label)).toEqual(['Investigate', 'Reproduce', 'Fix', 'Integrate', 'Verify', 'Review', 'Approve PR', 'Done']);
    expect(steps.find((s) => s.state === 'current')?.label).toBe('Reproduce');
  });
});

describe('AutoFix panels', () => {
  it('labels incident evidence as redacted and untrusted', () => {
    render(<IncidentPanel signal={signal} />);
    expect(screen.getByText('runtime error: integer divide by zero')).toBeInTheDocument();
    expect(screen.getByText('37 occurrences')).toBeInTheDocument();
    expect(screen.getByText(/never as instructions/)).toBeInTheDocument();
    expect(screen.getByText('return sum / len(xs)')).toBeInTheDocument();
  });

  it('only calls a fix verified when every step was measured', () => {
    const { rerender } = render(<VerificationPanel build={autofixBuild()} />);
    expect(screen.getAllByText('Fixed and verified')[0]).toBeInTheDocument();
    expect(screen.getByText(/A passing test suite alone is never reported as a verified fix/)).toBeInTheDocument();
    rerender(<VerificationPanel build={autofixBuild({ verification: { reproduction: 'not_reproduced', reproduction_reason: 'the test passed on the current code', checks_passed: true, verdict: 'tests_passed_reproduction_unconfirmed' } })} />);
    expect(screen.getByText('Tests pass, reproduction unconfirmed')).toBeInTheDocument();
    expect(screen.getByText(/Not reproduced: the test passed on the current code/)).toBeInTheDocument();
  });
});

describe('AutoFix screen', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    useData.setState({ signals: [], builds: [], loaded: {}, errors: {} });
  });

  it('explains how to start when there are no incidents', async () => {
    serve({ '/v1/signals': [], '/v1/builds': [] });
    render(
      <MemoryRouter>
        <AutoFix />
      </MemoryRouter>,
    );
    expect(await screen.findByText('No incidents yet')).toBeInTheDocument();
  });

  it('lists incidents with their run and verdict, and unmapped ones without a run', async () => {
    const incidents: Incident[] = [
      { id: 'inc-1', fingerprint: 'f', source: 'sentry', project: 'demo-api', title: 'Divide by zero', severity: 'high', first_seen: '2026-10-12T10:00:00Z', last_seen: '2026-10-12T10:00:00Z', count: 3, signals: [], runs: ['20261012-100000-abcdef'], status: 'run_started' },
      { id: 'inc-2', fingerprint: 'g', source: 'sentry', project: 'billing', title: 'Timeout', severity: 'medium', first_seen: '2026-10-12T10:00:00Z', last_seen: '2026-10-12T10:00:00Z', count: 1, signals: [], runs: null, status: 'unmapped', note: 'No repository is mapped to sentry project billing' },
    ];
    const builds: BuildSummary[] = [{ id: '20261012-100000-abcdef', title: 'Fix', instruction: '', repo: '/r', repo_name: 'demo-api', base_branch: 'main', status: 'awaiting_final_approval', paused: false, tasks: 1, tasks_completed: 1, tasks_running: 0, tasks_failed: 0, agents: [], kind: 'autofix', verdict: 'fixed_and_verified', state: 'awaiting_pr_authorization', created_at: '', updated_at: '' }];
    serve({ '/v1/signals': incidents, '/v1/builds': builds });
    render(
      <MemoryRouter>
        <AutoFix />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Divide by zero')).toBeInTheDocument();
    expect(screen.getByText('Fixed and verified')).toBeInTheDocument();
    expect(screen.getByText('Not mapped')).toBeInTheDocument();
    expect(screen.getByText('No repository is mapped to sentry project billing')).toBeInTheDocument();
  });

  it('saves mappings and never shows the stored secret', async () => {
    let cfg: AutofixConfig = { has_sentry_secret: true, mappings: [], auto_start: true, webhook_path: '/v1/signals/sentry' };
    let put: Record<string, unknown> | undefined;
    serve({ '/v1/autofix': cfg, '/v1/signals': [] }, (body) => {
      put = body as Record<string, unknown>;
      if ((body as { mappings?: { repo: string }[] }).mappings?.some((m) => !m.repo)) throw new Error('project_dir is required');
      cfg = { ...cfg, mappings: (body as { mappings: AutofixConfig['mappings'] }).mappings ?? cfg.mappings };
      return cfg;
    });
    render(
      <MemoryRouter>
        <AutoFix />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('tab', { name: 'Settings' }));
    expect(await screen.findByLabelText('Local client secret')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Project' }), { target: { value: 'demo-api' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save mappings' }));
    expect(await screen.findByText('project_dir is required')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Repository' }), { target: { value: '/Users/me/demo-api' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save mappings' }));
    await waitFor(() => expect(screen.getByText('Repository mappings saved.')).toBeInTheDocument());
    expect(put).toMatchObject({ mappings: [{ source: 'sentry', project: 'demo-api', repo: '/Users/me/demo-api', base_branch: 'main' }] });
  });
});

describe('AutoFix run workspace', () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it('shows the incident, investigation and verification instead of a plan', async () => {
    serve({ '/v1/builds/': autofixBuild() });
    render(
      <MemoryRouter initialEntries={['/build/20261012-100000-abcdef']}>
        <Routes>
          <Route path="/build/:id" element={<BuildRun />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Reproduction and verification')).toBeInTheDocument();
    expect(screen.getByText(/Claude Code \(work\)'s analysis, not verified/)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Plan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish with local branch/ })).toBeInTheDocument();
  });
});

describe('Connect Sentry', () => {
  const integration: HubIntegration = { id: 'i1', kind: 'sentry', name: 'Sentry', webhook_url: 'https://hub.acme.dev/api/v1/integrations/i1/sentry', has_secret: false };
  const status = (over: Partial<HubStatus> = {}): HubStatus => ({
    url: 'https://hub.acme.dev',
    public: true,
    reachable: true,
    workspace: { id: 'w1', name: 'Acme' },
    runner: 'laptop',
    integrations: [integration],
    mappings: [{ source: 'sentry', project: 'orders-api', repository: 'acme/orders-api', base_branch: 'main' }],
    has_local_secret: false,
    ...over,
  });

  beforeEach(() => vi.mocked(invoke).mockReset());

  function hub(handlers: Record<string, (body: Record<string, unknown>) => { status?: number; body: unknown }>) {
    const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
    vi.mocked(invoke).mockImplementation(async (cmd, args) => {
      if (cmd !== 'csm_request') return undefined;
      const a = args as { method: string; path: string; body: string | null };
      const body = JSON.parse(a.body ?? '{}') as Record<string, unknown>;
      calls.push({ method: a.method, path: a.path, body });
      const h = handlers[`${a.method} ${a.path}`];
      if (!h) return { status: 404, body: JSON.stringify({ error: 'not found' }) };
      const r = h(body);
      return { status: r.status ?? 200, body: JSON.stringify(r.body) };
    });
    return calls;
  }

  it('signs in, creates the webhook and shows what to paste into Sentry', async () => {
    const calls = hub({
      'POST /v1/autofix/hub/signin': (b) => (b.password === 'pw-correct' ? { body: { url: 'https://hub.acme.dev', email: 'me@acme.dev', public: true, workspaces: [{ id: 'w1', name: 'Acme' }] } } : { status: 401, body: { error: 'Invalid email or password.' } }),
      'POST /v1/autofix/hub/setup': () => ({ body: status() }),
    });
    const saved = vi.fn();
    render(<SentryConnect connected={false} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('Hub URL'), { target: { value: 'https://hub.acme.dev' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@acme.dev' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw-correct' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByLabelText('Workspace')).toHaveValue('w1');
    fireEvent.change(screen.getByLabelText('Sentry project'), { target: { value: 'orders-api' } });
    fireEvent.change(screen.getByLabelText('Repository on this Mac'), { target: { value: '/Users/me/orders-api' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create the webhook' }));
    expect(await screen.findByLabelText('Webhook URL')).toHaveValue('https://hub.acme.dev/api/v1/integrations/i1/sentry');
    expect(screen.getByText(/Developer Settings → Custom Integrations/)).toBeInTheDocument();
    expect(screen.getByText('Waiting for the client secret.')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/v1/autofix/hub/setup')?.body).toMatchObject({ workspace_id: 'w1', project: 'orders-api', repo: '/Users/me/orders-api' });
    expect(saved).toHaveBeenCalled();
  });

  it('warns when Sentry cannot reach the Hub', async () => {
    hub({ 'GET /v1/autofix/hub/status': () => ({ body: status({ url: 'http://localhost:8090', public: false }) }) });
    render(<SentryConnect connected onSaved={() => undefined} />);
    expect(await screen.findByText(/Sentry cannot reach http:\/\/localhost:8090/)).toBeInTheDocument();
  });

  it('saves the client secret, asking to sign in again when the session expired', async () => {
    let signedIn = false;
    hub({
      'GET /v1/autofix/hub/status': () => ({ body: status() }),
      'PUT /v1/autofix/hub/secret': () => (signedIn ? { body: status({ integrations: [{ ...integration, has_secret: true }], has_local_secret: true }) } : { status: 401, body: { error: 'sign in to CSM Hub again to change the client secret' } }),
      'POST /v1/autofix/hub/signin': () => {
        signedIn = true;
        return { body: { url: 'https://hub.acme.dev', email: 'me@acme.dev', public: true, workspaces: [] } };
      },
      'POST /v1/autofix/hub/test': () => ({ body: { ok: true, message: 'The Hub verified the signature. No incident was created.' } }),
    });
    render(<SentryConnect connected onSaved={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('Client secret'), { target: { value: '0123456789abcdef0123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'me@acme.dev' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.change(await screen.findByLabelText('Client secret'), { target: { value: '0123456789abcdef0123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send a test' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send a test' }));
    expect(await screen.findByText('The Hub verified the signature. No incident was created.')).toBeInTheDocument();
  });

  it('explains each delivery result in plain words', () => {
    expect(deliveryHealth({ ...integration, has_secret: true, last_delivery_result: 'invalid_signature', last_delivery_at: new Date().toISOString() })).toMatchObject({ tone: 'err', text: expect.stringMatching(/does not match/) });
    expect(deliveryHealth({ ...integration, has_secret: true, last_delivery_result: 'recorded', last_delivery_at: new Date().toISOString() }).tone).toBe('ok');
    expect(deliveryHealth({ ...integration, has_secret: true }).text).toMatch(/No deliveries yet/);
  });
});
