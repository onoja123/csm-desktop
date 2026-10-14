import { invoke } from '@tauri-apps/api/core';
import { useData } from '@/store/data';
import { outputBus } from '@/lib/output-bus';
import type { Approval } from '@/types';

const approval: Approval = {
  id: 'a1',
  provider: 'claude',
  account: 'work',
  tool_name: 'Bash',
  command: 'npm test',
  destructive: false,
  requested_at: '2026-10-08T12:00:00Z',
};

describe('data store events', () => {
  beforeEach(() => {
    useData.setState({
      approvals: { pending: [], recent: [] },
      activity: [],
      runs: { runs: [], external: [] },
    });

    vi.mocked(invoke).mockReset();
  });

  it('adds and resolves approvals without a round trip', () => {
    const store = useData.getState();

    expect(store.applyEvent({ type: 'approval.requested', data: approval })).toEqual(['status']);
    expect(useData.getState().approvals.pending).toHaveLength(1);
    store.applyEvent({ type: 'approval.resolved', data: { ...approval, decision: 'allow' } });
    expect(useData.getState().approvals.pending).toHaveLength(0);
    expect(useData.getState().approvals.recent[0].decision).toBe('allow');
  });

  it('prepends activity and dedupes by id', () => {
    const store = useData.getState();

    const a = {
      id: 'x',
      at: '2026-10-08T12:00:00Z',
      kind: 'run.started',
      title: 'Claude Code started',
    };

    store.applyEvent({ type: 'activity', data: a });
    store.applyEvent({ type: 'activity', data: a });
    expect(useData.getState().activity).toHaveLength(1);
  });

  it('routes terminal output to subscribers as bytes', () => {
    const seen: Uint8Array[] = [];
    const off = outputBus.subscribe('r1', (b) => seen.push(b));

    useData.getState().applyEvent({ type: 'run.output', data: { run_id: 'r1', data: btoa('hi') } });
    off();
    expect(new TextDecoder().decode(seen[0])).toBe('hi');
    expect(outputBus.listenerCount('r1')).toBe(0);
  });

  it('maps change notices to the sections to refetch', () => {
    const store = useData.getState();

    expect(store.applyEvent({ type: 'accounts', data: null })).toEqual(['accounts', 'failover']);
    expect(store.applyEvent({ type: 'runs', data: null })).toEqual(['runs', 'status', 'accounts']);

    expect(store.applyEvent({ type: 'run.exit', data: { run_id: 'r', exit_code: 0 } })).toEqual([
      'runs',
      'status',
    ]);
  });

  it('records section errors instead of throwing', async () => {
    vi.mocked(invoke).mockRejectedValueOnce('socket gone');
    await useData.getState().refresh('accounts');
    expect(useData.getState().errors.accounts).toContain('socket gone');
  });
});

describe('terminal replay', () => {
  it('skips live chunks that the replayed output already contains', async () => {
    const { replayedChunks } = await import('@/lib/output-bus');
    const enc = (s: string) => new TextEncoder().encode(s);

    expect(replayedChunks(enc('banner\nwaiting\n'), [enc('waiting\n')])).toBe(1);

    expect(
      replayedChunks(enc('banner\nwaiting\n'), [enc('wait'), enc('ing\n'), enc('limit\n')]),
    ).toBe(2);

    expect(replayedChunks(enc('banner\n'), [enc('limit\n')])).toBe(0);
    expect(replayedChunks(enc(''), [enc('x')])).toBe(0);
  });
});
