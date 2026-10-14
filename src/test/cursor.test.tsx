import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Cursor02Icon } from '@hugeicons/core-free-icons';
import { providerIcon } from '@/lib/provider-icons';
import { canReceiveHandoff, limitations } from '@/lib/capabilities';
import { PROVIDERS, PROVIDER_LONG_NAMES, providerName } from '@/lib/format';
import type { Account, ProviderCapabilities, ProviderInfo, ServiceStatus } from '@/types';
import { Accounts } from '@/screens/Accounts';
import { AccountDetail } from '@/screens/AccountDetail';
import { Settings } from '@/screens/Settings';
import { useData } from '@/store/data';

const all: ProviderCapabilities = {
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
};

const cursor: ProviderInfo = {
  id: 'cursor',
  name: 'Cursor CLI',
  installed: true,
  version: '2026.10.14-0f9edde',
  resume: true,
  shared_login: true,
  capabilities: { ...all, handoff_context: false, usage_limits: false, usage_report: false, account_switching: false, mcp: false },
};

const claude: ProviderInfo = { id: 'claude', name: 'Claude Code', installed: true, version: '2.1.294', resume: true, capabilities: all };

const status: ServiceStatus = {
  service: { version: '0.12.0', pid: 1, started_at: '2026-10-14T09:00:00Z', socket: '/tmp/csm.sock', home: '/Users/me/.csm' },
  failover_policy: 'automatic',
  providers: [claude, { id: 'codex', name: 'Codex', installed: false }, cursor],
  accounts: 2,
  live_runs: 0,
  pending_approvals: 0,
  approvals_enabled: true,
};

const cursorAccount: Account = {
  name: 'cursor-main',
  provider: 'cursor',
  provider_name: 'Cursor CLI',
  email: 'dev@example.test',
  active: true,
  enabled: true,
  health: 'healthy',
  status: 'ready',
  priority: 1,
  usage_label: 'unknown',
  failures_24h: 0,
  created_at: '2026-10-14T00:00:00Z',
  profile_dir: '~/.csm/accounts/cursor-main',
  failover_eligible: true,
  running: false,
};

describe('Cursor as a provider', () => {
  it('is listed with its own name and icon', () => {
    expect(PROVIDERS).toContain('cursor');
    expect(PROVIDER_LONG_NAMES.cursor).toBe('Cursor CLI');
    expect(providerName('cursor')).toBe('Cursor');
    expect(providerIcon('cursor')).toBe(Cursor02Icon);
  });

  it('states every capability CSM lacks for Cursor, and nothing it has', () => {
    const limits = limitations(cursor);
    expect(limits).toEqual([
      'One sign-in per user: CSM manages a single account for it and cannot switch accounts.',
      'Usage limits are not detected, so failover and automatic handoff never start from it.',
      'Its sessions cannot be read; a handoff from it carries the repository state only.',
      'CSM does not manage its MCP servers.',
    ]);
    expect(limitations(claude)).toEqual([]);
    expect(limitations({ ...cursor, installed: false })).toEqual([]);
    expect(limitations({ ...cursor, capabilities: undefined })).toEqual([]);
  });

  it('describes an old Cursor CLI that cannot take tasks', () => {
    const old = limitations({ ...cursor, capabilities: { ...cursor.capabilities!, interactive: false, tasks: false, handoff_target: false, session_resume: false } });
    expect(old).toContain('This version lacks the profile login and session supervision CSM needs; upgrade it.');
    expect(old).toContain('It takes no opening instruction, so it cannot run Build Room tasks or reviews.');
    expect(old).toContain('It cannot receive a handoff.');
    expect(old).toContain('Its sessions cannot be resumed.');
  });

  it('only blocks a handoff target the service says cannot receive one', () => {
    expect(canReceiveHandoff(cursor)).toBe(true);
    expect(canReceiveHandoff(undefined)).toBe(true);
    expect(canReceiveHandoff({ ...cursor, capabilities: { ...cursor.capabilities!, handoff_target: false } })).toBe(false);
  });
});

describe('Cursor in the screens', () => {
  beforeEach(() => {
    useData.setState({
      status,
      accounts: [cursorAccount],
      failover: { policy: 'automatic', description: '', providers: [], handoff_to: [] },
      loaded: {},
      errors: {},
    });
  });

  it('shows Cursor in Settings with its version and its limitations', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Cursor CLI').length).toBeGreaterThan(0);
    expect(screen.getByText('2026.10.14-0f9edde')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'What CSM cannot do with Cursor CLI' });
    expect(list).toHaveTextContent('cannot switch accounts');
    expect(list).toHaveTextContent('Usage limits are not detected');
    expect(screen.queryByRole('list', { name: 'What CSM cannot do with Claude Code' })).toBeNull();
  });

  it('explains the shared sign-in on the Accounts screen', () => {
    render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>,
    );
    expect(screen.getByText(/keeps one sign-in for your user account, so CSM manages a single Cursor CLI account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cursor CLI' })).toBeEnabled();
  });

  it('disables a handoff target that cannot receive one', () => {
    useData.setState({ status: { ...status, providers: [claude, { ...cursor, capabilities: { ...cursor.capabilities!, handoff_target: false } }] } });
    render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Cursor CLI' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Claude Code' })).toBeEnabled();
  });

  it('does not offer a usage check Cursor cannot answer', () => {
    render(
      <MemoryRouter initialEntries={['/accounts/cursor-main']}>
        <Routes>
          <Route path="/accounts/:name" element={<AccountDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Check usage/ })).toBeDisabled();
    expect(screen.getByText('Cursor CLI does not report plan usage, so CSM shows none and cannot see a limit coming.')).toBeInTheDocument();
  });
});
