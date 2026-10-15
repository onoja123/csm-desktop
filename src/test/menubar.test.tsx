import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { MenuBar } from '@/screens/MenuBar';
import {
  failoverTarget,
  handoffFacts,
  headline,
  redactEmail,
  resumeBlocker,
  sessionRoute,
  splitSessions,
  switchFacts,
} from '@/lib/menubar';
import { useConnection } from '@/store/connection';
import { useData } from '@/store/data';
import { useMenuBar } from '@/store/menubar';
import type {
  Account,
  AgentSession,
  Approval,
  ExternalRun,
  Failover,
  HandoffPreview,
  MenuState,
  Run,
  ServiceStatus,
} from '@/types';

const SOON = new Date(Date.now() + 2 * 3600_000).toISOString();
const EARLIER = new Date(Date.now() - 20 * 60_000).toISOString();

const caps = (over: Partial<Record<string, boolean>> = {}) => ({
  interactive: true,
  session_tracking: true,
  session_resume: true,
  tasks: true,
  handoff_target: true,
  handoff_context: true,
  usage_limits: true,
  usage_report: true,
  account_switching: true,
  mcp: true,
  ...over,
});

const status: ServiceStatus = {
  service: { version: '0.13.0', pid: 1, started_at: EARLIER, socket: '/tmp/s', home: '/tmp' },
  failover_policy: 'automatic',
  providers: [
    { id: 'claude', name: 'Claude Code', installed: true, resume: true, capabilities: caps() },
    { id: 'codex', name: 'Codex', installed: true, capabilities: caps({ session_resume: false }) },
    {
      id: 'gemini',
      name: 'Gemini CLI',
      installed: true,
      capabilities: caps({ usage_report: false, usage_limits: false }),
    },
  ],
  accounts: 5,
  live_runs: 1,
  pending_approvals: 1,
  approvals_enabled: true,
};

function account(over: Partial<Account>): Account {
  return {
    name: 'work',
    provider: 'claude',
    provider_name: 'Claude Code',
    active: false,
    enabled: true,
    health: 'healthy',
    status: 'ready',
    priority: 1,
    usage_label: 'unknown',
    failures_24h: 0,
    created_at: EARLIER,
    profile_dir: '~/.csm/accounts/x',
    failover_eligible: true,
    running: false,
    ...over,
  };
}

const accounts: Account[] = [
  account({
    name: 'work',
    active: true,
    running: true,
    email: 'godwin@example.com',
    usage_label: '5h 42% · 7d 13%',
    usage: {
      five_hour: { used_percent: 42, resets_at: SOON },
      seven_day: { used_percent: 13, resets_at: SOON },
    },
    usage_updated_at: EARLIER,
  }),
  account({ name: 'personal', priority: 2 }),
  account({
    name: 'spare',
    priority: 3,
    health: 'rate_limited',
    status: 'cooldown',
    last_failure: 'usage_limit',
    last_failure_text: 'known usage limit',
    last_failure_at: EARLIER,
    cooldown_until: SOON,
    failover_eligible: false,
  }),
  account({ name: 'codex-main', provider: 'codex', provider_name: 'Codex' }),
  account({ name: 'gemini-main', provider: 'gemini', provider_name: 'Gemini CLI', running: true }),
];

const failover: Failover = {
  policy: 'automatic',
  description: 'Switch automatically',
  providers: [
    { provider: 'claude', provider_name: 'Claude Code', priority: [], would_switch: ['personal'] },
  ],
};

const run: Run = {
  id: 'r1',
  kind: 'agent',
  provider: 'claude',
  account: 'work',
  project_dir: '/Users/me/storefront',
  branch: 'feature/checkout-retry',
  status: 'running',
  started_at: EARLIER,
  last_output_at: new Date().toISOString(),
  csm_pid: 10,
  session_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  task: { summary: 'Retry failed checkout payments with exponential backoff' },
  duration_seconds: 1200,
};

const external: ExternalRun = {
  id: 'external-77',
  kind: 'external',
  provider: 'gemini',
  account: 'gemini-main',
  project_dir: '/Users/me/docs',
  status: 'running',
  started_at: EARLIER,
  csm_pid: 77,
  duration_seconds: 1200,
};

const approval: Approval = {
  id: 'a1',
  run_id: 'r1',
  provider: 'claude',
  account: 'work',
  tool_name: 'Bash',
  command: 'npm test',
  destructive: false,
  requested_at: new Date().toISOString(),
};

const menu: MenuState = {
  connected: true,
  live: 2,
  waiting: 1,
  attention: [
    {
      key: 'login:gemini/old',
      kind: 'login',
      provider: 'gemini',
      account: 'old',
      title: 'Login required',
      reason: 'Gemini CLI account old needs to sign in again',
      detail: 'Run: csm account login old',
    },
  ],
};

const preview: HandoffPreview = {
  mode: 'session',
  source: 'claude',
  source_account: 'work',
  target: 'codex',
  target_account: 'codex-main',
  task_context: '3 requests, 2 files changed',
  git_state: 'feature/checkout-retry, 2 files modified',
  message: '',
};

type Handler = (method: string, path: string, body: Record<string, unknown> | undefined) => unknown;
type Command = (args: Record<string, unknown>) => unknown;

function serve(handler: Handler = () => null, commands: Record<string, Command> = {}) {
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd === 'csm_request') {
      const a = args as { method: string; path: string; body: string | null };

      try {
        if (a.method === 'GET' && a.path === '/v1/approvals')
          return { status: 200, body: JSON.stringify({ pending: [], recent: [] }) };

        const out = handler(a.method, a.path, a.body ? JSON.parse(a.body) : undefined);

        return { status: 200, body: JSON.stringify(out ?? null) };
      } catch (e) {
        const [code, message] = (e as Error).message.split('|');

        return { status: Number(code) || 409, body: JSON.stringify({ error: message }) };
      }
    }

    if (cmd in commands) return commands[cmd]((args ?? {}) as Record<string, unknown>);
    if (cmd === 'menubar_state') return menu;

    if (cmd === 'menubar_prefs')
      return {
        dock_supported: true,
        prefs: {
          show_in_dock: true,
          recent_limit: 3,
          notifications: {
            enabled: true,
            approvals: true,
            failures: true,
            rate_limits: true,
            auth: true,
            handoffs: true,
            recovery: true,
            completed: true,
            quiet_hours: null,
          },
        },
      };

    if (cmd === 'login_item') return { supported: true, enabled: false };

    return undefined;
  });
}

function writes() {
  return vi.mocked(invoke).mock.calls.filter(([cmd, a]) => {
    const req = a as { method?: string } | undefined;

    return cmd === 'csm_request' && req?.method !== 'GET';
  });
}

function requests(method: string, prefix: string) {
  return vi.mocked(invoke).mock.calls.filter(([cmd, a]) => {
    const req = a as { method?: string; path?: string } | undefined;

    return cmd === 'csm_request' && req?.method === method && req.path?.startsWith(prefix);
  });
}

function seed(over: Partial<ReturnType<typeof useData.getState>> = {}) {
  useConnection.setState({ phase: 'connected', error: undefined });

  useMenuBar.setState({
    view: 'list',
    tab: 'overview',
    selectedId: undefined,
    inspectedAccount: undefined,
  });

  useData.setState({
    status,
    accounts,
    failover,
    runs: { runs: [run], external: [external] },
    approvals: { pending: [approval], recent: [] },
    activity: [],
    ...over,
  });
}

async function openInspector(task = 'Retry failed checkout payments with exponential backoff') {
  render(<MenuBar />);
  fireEvent.click(screen.getAllByTitle(task)[0]);
  await screen.findByRole('tablist', { name: 'Agent details' });
}

function session(over: Partial<AgentSession>): AgentSession {
  return {
    id: 's1',
    kind: 'agent',
    provider: 'claude',
    providerName: 'Claude Code',
    account: 'work',
    projectDir: '/Users/me/shop',
    project: 'shop',
    status: 'running',
    label: 'Running',
    startedAt: '2026-10-15T10:00:00Z',
    live: true,
    observable: true,
    filesModified: 0,
    canResume: false,
    ...over,
  };
}

describe('menu bar summary', () => {
  it('says what is running, waiting and needs attention', () => {
    expect(headline('disconnected', 2, 0)).toBe('Not connected to csm');
    expect(headline('connected', 0, 0)).toBe('No agents running');
    expect(headline('connected', 1, 0)).toBe('1 agent running');

    expect(headline('connected', 3, 1, 2)).toBe(
      '3 agents running · 1 approval waiting · 2 need attention',
    );
  });

  it('lists live sessions and only the most recently finished ones, up to the limit', () => {
    const finished = [1, 2, 3, 4].map((n) =>
      session({
        id: `done-${n}`,
        live: false,
        status: 'completed',
        endedAt: `2026-10-15T10:0${n}:00Z`,
      }),
    );

    const all = [...finished, session({ id: 'live' })];

    expect(splitSessions(all).finished.map((s) => s.id)).toEqual(['done-4', 'done-3', 'done-2']);
    expect(splitSessions(all, 0).finished).toEqual([]);
    expect(splitSessions(all).live.map((s) => s.id)).toEqual(['live']);
  });

  it('routes runs to their page and other sessions to Mission Control', () => {
    expect(sessionRoute(session({ runId: 'r9' }))).toBe('/agents/r9');
    expect(sessionRoute(session({ kind: 'external' }))).toBe('/mission');
  });

  it('keeps enough of an email to recognise it', () => {
    expect(redactEmail('godwin@example.com')).toBe('go••••@example.com');
    expect(redactEmail(undefined)).toBeUndefined();
  });

  it('only offers resume where csm can actually resume the agent', () => {
    const done = { live: false, status: 'completed' as const, sessionId: 'abc' };

    expect(resumeBlocker(session(done), status)).toBeUndefined();

    expect(
      resumeBlocker(session({ ...done, provider: 'codex', providerName: 'Codex' }), status),
    ).toMatch(/Codex/);

    expect(resumeBlocker(session({ ...done, sessionId: undefined }), status)).toMatch(/session id/);
    expect(resumeBlocker(session({}), status)).toMatch(/still running/);
  });

  it('explains what a switch changes before it happens', () => {
    const facts = switchFacts(session({}), account({ name: 'personal' }), status);

    expect(facts.join(' ')).toMatch(/resumes the same conversation/);
    expect(facts.join(' ')).toMatch(/personal also becomes the active Claude Code account/);

    const cursor = switchFacts(
      session({ provider: 'cursor', providerName: 'Cursor CLI' }),
      account({ name: 'other', provider: 'cursor' }),
      status,
    );

    expect(cursor.join(' ')).toMatch(/does not carry over/);
  });

  it('never claims a handoff target follows the brief', () => {
    const facts = handoffFacts(preview, accounts[3]);

    expect(facts[0]).toBe(
      'The running session continues as Codex (codex-main) in the same process.',
    );

    expect(facts.at(-1)).toMatch(/can't confirm the agent follows it/);
  });

  it('recovers with the first ready account in the failover order', () => {
    const s = session({});

    expect(failoverTarget(failover, accounts, s)?.name).toBe('personal');

    expect(
      failoverTarget(
        { ...failover, providers: [{ ...failover.providers[0], would_switch: ['spare'] }] },
        accounts,
        s,
      ),
    ).toBeUndefined();
  });
});

describe('menu bar panel', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    serve();
    seed();
  });

  it('shows the state the menu bar icon is built from', async () => {
    render(<MenuBar />);

    expect(
      await screen.findByText('2 agents running · 1 approval waiting · 1 needs attention'),
    ).toBeInTheDocument();

    expect(screen.getByRole('region', { name: 'Waiting for you' })).toBeInTheDocument();
    expect(screen.getByText('npm test')).toBeInTheDocument();
    expect(screen.getByText('Gemini CLI account old needs to sign in again')).toBeInTheDocument();

    const working = screen.getByRole('region', { name: 'Working now' });

    expect(within(working).getByText('Running in a terminal')).toBeInTheDocument();

    expect(
      within(working).getByText('Retry failed checkout payments with exponential backoff'),
    ).toBeInTheDocument();
  });

  it('opens the inspector for the chosen agent without changing anything', async () => {
    await openInspector();

    expect(screen.getByText('Agent details')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    for (const name of ['Account', 'Rate limits', 'Actions', 'Overview']) {
      fireEvent.click(screen.getByRole('tab', { name }));
    }

    expect(writes()).toEqual([]);
  });

  it('lets you look at another account while the session keeps its own', async () => {
    await openInspector();
    fireEvent.click(screen.getByRole('tab', { name: 'Account' }));
    fireEvent.click(screen.getByRole('button', { name: /personal/ }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Viewing personal. The session still uses work.',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Rate limits' }));

    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing personal, not the session's account.",
    );

    expect(writes()).toEqual([]);
  });

  it('separates reported usage from observed limits and never invents numbers', async () => {
    await openInspector();
    fireEvent.click(screen.getByRole('tab', { name: 'Rate limits' }));

    expect(screen.getByText(/Claude Code reported these for work/)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
    expect(screen.getByText('No limit errors recorded for work.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Account' }));
    fireEvent.click(screen.getByRole('button', { name: /spare/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Rate limits' }));

    expect(screen.getByText(/known usage limit/)).toBeInTheDocument();
    expect(screen.getByText('CSM pause')).toBeInTheDocument();
    expect(screen.getByText(/fixed one-hour wait/)).toBeInTheDocument();
    expect(screen.getByText(/hasn't reported usage for spare yet/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('says plainly when an agent reports no usage at all', async () => {
    await openInspector('Request not visible from here');
    fireEvent.click(screen.getByRole('tab', { name: 'Rate limits' }));

    expect(screen.getByText(/Gemini CLI doesn't report usage/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText('Check usage now')).not.toBeInTheDocument();
  });

  it('cancelling an account switch changes nothing; confirming uses the account service', async () => {
    serve((method, path) => {
      if (method === 'POST' && path === '/v1/accounts/personal/switch')
        return { mode: 'session', account: 'personal', message: 'Switch requested' };

      return null;
    });

    await openInspector();
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose account…' }));
    fireEvent.click(screen.getByRole('button', { name: /personal/ }));

    expect(screen.getByRole('alertdialog', { name: 'Switch to personal' })).toHaveTextContent(
      'resumes the same conversation',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(writes()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Choose account…' }));
    fireEvent.click(screen.getByRole('button', { name: /personal/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch account' }));

    await screen.findByText('Switch requested');

    const [[, req]] = requests('POST', '/v1/accounts/personal/switch');

    expect(JSON.parse((req as { body: string }).body)).toEqual({
      project_dir: '/Users/me/storefront',
    });
  });

  it('recovers through the failover order only when asked', async () => {
    serve((method, path) =>
      method === 'POST' && path === '/v1/accounts/personal/switch'
        ? { mode: 'session', account: 'personal', message: 'Switch requested' }
        : null,
    );

    await openInspector();
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));

    expect(screen.getByText('Uses your failover order: next is personal.')).toBeInTheDocument();
    expect(writes()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Review…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recover' }));

    await waitFor(() => expect(requests('POST', '/v1/accounts/personal/switch')).toHaveLength(1));
  });

  it('previews a handoff before starting it through the handoff service', async () => {
    serve((method, path, body) => {
      if (method === 'POST' && path === '/v1/handoffs')
        return body?.preview ? preview : { ...preview, message: 'Handoff requested' };

      return null;
    });

    await openInspector();
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose agent…' }));

    await screen.findByText(/The running session continues as Codex/);

    const previews = requests('POST', '/v1/handoffs');

    expect(previews).toHaveLength(1);

    expect(JSON.parse((previews[0][1] as { body: string }).body)).toMatchObject({
      project_dir: '/Users/me/storefront',
      target_account: 'codex-main',
      preview: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hand off' }));
    await screen.findByText('Handoff requested');

    const all = requests('POST', '/v1/handoffs');

    expect(JSON.parse((all[1][1] as { body: string }).body).preview).toBeUndefined();
  });

  it('only stops agents CSM started, and only after confirmation', async () => {
    serve((method, path) =>
      method === 'POST' && path === '/v1/runs/r1/stop' ? { ok: true } : null,
    );

    await openInspector('Request not visible from here');
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));

    expect(screen.getByText(/Started in a terminal: stop it there/)).toBeInTheDocument();

    act(() => useMenuBar.getState().openInspector('r1', 'actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Stop…' }));

    expect(writes()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Stop agent' }));
    await waitFor(() => expect(requests('POST', '/v1/runs/r1/stop')).toHaveLength(1));
  });

  it('reports an approval that was already answered or expired', async () => {
    serve((method, path) => {
      if (method === 'POST' && path === '/v1/approvals/a1/decision')
        throw new Error('404|no pending approval with that id');

      return null;
    });

    render(<MenuBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByText('This request was already answered or it expired.'),
    ).toBeInTheDocument();
  });

  it('opens the agent a notification pointed at', async () => {
    serve(() => null, { menubar_take_target: () => ({ open: 'panel', session: 'r1' }) });
    render(<MenuBar />);

    expect(await screen.findByRole('tablist', { name: 'Agent details' })).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys and back to the list with Escape', async () => {
    await openInspector();

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByRole('region', { name: 'Working now' })).toBeInTheDocument();
  });

  it('says what quitting does to running agents before quitting', async () => {
    render(<MenuBar />);
    await screen.findByText('2 agents running · 1 approval waiting · 1 needs attention');
    fireEvent.click(screen.getByRole('button', { name: 'Quit CSM' }));

    expect(screen.getByRole('alertdialog', { name: 'Quit CSM' })).toHaveTextContent(
      '2 agents keep running in the csm service',
    );

    expect(invoke).not.toHaveBeenCalledWith('quit_app');

    fireEvent.click(screen.getByRole('button', { name: 'Quit' }));
    expect(invoke).toHaveBeenCalledWith('quit_app');
  });

  it('shows the connection problem instead of stale agents', async () => {
    useConnection.setState({ phase: 'disconnected', error: 'csm service is not running' });
    render(<MenuBar />);

    expect(await screen.findByText('csm service is not running')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Working now' })).not.toBeInTheDocument();
  });

  it('handles many agents with long names', async () => {
    const long = 'Refactor the payment reconciliation pipeline '.repeat(6).trim();

    const many = Array.from({ length: 40 }, (_, i) => ({
      ...run,
      id: `run-${i}`,
      project_dir: `/Users/me/${'very-long-project-name-'.repeat(4)}${i}`,
      branch: `feature/${'extremely-long-branch-name-'.repeat(3)}${i}`,
      task: { summary: long },
    }));

    seed({ runs: { runs: many, external: [] }, approvals: { pending: [], recent: [] } });
    render(<MenuBar />);

    expect(await screen.findAllByTitle(long)).toHaveLength(40);
  });

  it('saves notification and login settings only when you change them', async () => {
    serve(() => null, {
      set_menubar_prefs: ({ prefs }) => ({ dock_supported: true, prefs }),
      set_login_item: ({ enabled }) => ({ supported: true, enabled }),
    });

    act(() => useMenuBar.getState().openSettings());
    render(<MenuBar />);

    const finishes = await screen.findByRole('switch', { name: 'An agent finishes' });

    expect(invoke).not.toHaveBeenCalledWith('set_menubar_prefs', expect.anything());

    fireEvent.click(finishes);

    expect(invoke).toHaveBeenCalledWith(
      'set_menubar_prefs',
      expect.objectContaining({
        prefs: expect.objectContaining({
          notifications: expect.objectContaining({ completed: false }),
        }),
      }),
    );

    await waitFor(() => expect(finishes).toHaveAttribute('aria-checked', 'false'));

    const login = screen.getByRole('switch', { name: 'Open at login' });

    fireEvent.click(login);
    expect(invoke).toHaveBeenCalledWith('set_login_item', { enabled: true });
    await waitFor(() => expect(login).toHaveAttribute('aria-checked', 'true'));
  });
});
