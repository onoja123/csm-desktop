import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { HandoffCard } from '@/components/handoffs/HandoffCard';
import { HandoffDetail } from '@/screens/Handoffs';
import { driftOf, parseSteps, stepsOf, taskOf } from '@/lib/checkpoint';
import type { Handoff } from '@/lib/types';

function checkpoint(over: Partial<Handoff> = {}): Handoff {
  return {
    version: 1,
    id: '20261012T100000Z-claude-checkpoint',
    kind: 'checkpoint',
    created_at: '2026-10-12T10:00:00Z',
    stage: 'saved',
    completeness: 'complete',
    source: { provider: 'claude', account: 'personal', session_id: 'abc12345-0000' },
    target: { provider: '', account: '' },
    context: {
      user_requests: ['Add retry logic to the webhook'],
      last_assistant: 'Backoff is in; the jitter test is still missing.',
      files_modified: ['internal/webhook.go'],
      commands: ['go test ./...'],
      next_steps: ['Cap retries at 5'],
    },
    git: { root: '/Users/me/shop', working_dir: '/Users/me/shop', branch: 'feature/retry', head: '0123456789abcdef', head_subject: 'init', staged: 0, unstaged: 1, untracked: 0 },
    project: 'shop-3f2a',
    dir: '/x',
    current: { checked_at: '2026-10-12T10:05:00Z', repo_exists: true, same_root: true, branch_was: 'feature/retry', branch_now: 'feature/retry', head_was: '0123456789abcdef', head_now: '0123456789abcdef', tree_changed: false },
    ...over,
  };
}

describe('checkpoint model', () => {
  it('prefers the user edit and says where the task came from', () => {
    expect(taskOf(checkpoint())).toEqual({ text: 'Add retry logic to the webhook', origin: 'session' });
    const edited = checkpoint({ edits: { task: 'Finish webhook retries', next_steps: ['Add a jitter test'] } });
    expect(taskOf(edited)).toEqual({ text: 'Finish webhook retries', origin: 'user' });
    expect(stepsOf(edited)).toEqual(['Add a jitter test']);
    expect(taskOf(checkpoint({ context: {} })).origin).toBe('none');
  });

  it('describes drift the same way as the brief', () => {
    expect(driftOf(checkpoint().current!)).toEqual([]);
    const v = { ...checkpoint().current!, branch_now: 'main', head_now: 'fedcba9876543210', tree_changed: true, missing_files: ['a.go'] };
    expect(driftOf(v)).toEqual([
      'The branch changed from feature/retry to main since the checkpoint.',
      'HEAD moved from 0123456 to fedcba9 since the checkpoint.',
      'The working tree changed since the checkpoint.',
      'Files named in the checkpoint are missing: a.go.',
    ]);
    expect(driftOf({ ...v, repo_exists: false })).toEqual(['The repository recorded in the checkpoint no longer exists.']);
  });

  it('parses next steps typed one per line, with or without list markers', () => {
    expect(parseSteps('1. Cap retries\n- Add jitter test\n\n  * Update docs ')).toEqual(['Cap retries', 'Add jitter test', 'Update docs']);
  });
});

describe('checkpoint views', () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it('lists a checkpoint with its project, branch and step count', () => {
    render(
      <MemoryRouter>
        <HandoffCard handoff={checkpoint()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Add retry logic to the webhook')).toBeInTheDocument();
    expect(screen.getByText(/shop · feature\/retry · 1 next step/)).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows a partial handoff as partly completed, not as success', () => {
    const h = checkpoint({ kind: undefined, stage: 'target_started', target: { provider: 'codex', account: 'work' }, outcome: { status: 'partial', delivery: 'opening_instruction', started: true, verification: checkpoint().current!, problems: ['The working tree changed since the checkpoint.'] } });
    render(
      <MemoryRouter>
        <HandoffCard handoff={h} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Partly completed')).toBeInTheDocument();
  });

  it('separates verified repository facts from the agent report, and saves edits', async () => {
    const cp = checkpoint({ current: { ...checkpoint().current!, tree_changed: true } });
    vi.mocked(invoke).mockImplementation(async (_cmd, args) => {
      const a = (args ?? {}) as { method?: string; body?: string | null };
      if (a.method === 'PATCH') {
        const body = JSON.parse(a.body!);
        return { status: 200, body: JSON.stringify({ ...cp, edits: { task: body.task, next_steps: body.next_steps } }) };
      }
      return { status: 200, body: JSON.stringify(cp) };
    });
    render(
      <MemoryRouter initialEntries={[`/handoffs/${cp.project}/${cp.id}`]}>
        <Routes>
          <Route path="/handoffs/:project/:id" element={<HandoffDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Add retry logic to the webhook')).toBeInTheDocument();
    expect(screen.getByText('verified by CSM')).toBeInTheDocument();
    expect(screen.getByText("reported by the agent's session record")).toBeInTheDocument();
    expect(screen.getByText('The working tree changed since the checkpoint.')).toBeInTheDocument();
    expect(screen.getByText('a record; never run again by CSM')).toBeInTheDocument();
    expect(screen.getByText(/Last request in the Claude Code session record/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit'));
    const [task, steps] = screen.getAllByRole('textbox');
    fireEvent.change(task, { target: { value: 'Finish webhook retries' } });
    fireEvent.change(steps, { target: { value: '1. Cap retries at 5\n2. Add a jitter test' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(screen.getByText('Finish webhook retries')).toBeInTheDocument());
    expect(screen.getByText('Written by you')).toBeInTheDocument();
    const patch = vi.mocked(invoke).mock.calls.find((c) => (c[1] as { method?: string } | undefined)?.method === 'PATCH');
    expect(JSON.parse((patch![1] as { body: string }).body)).toMatchObject({ task: 'Finish webhook retries', next_steps: ['Cap retries at 5', 'Add a jitter test'] });
  });
});
