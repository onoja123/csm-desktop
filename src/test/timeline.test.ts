import { buildTimeline, duration, offset } from '@/lib/timeline';
import type { Build, BuildEvent, CheckResult } from '@/types';

const at = (s: number) => new Date(Date.UTC(2026, 9, 12, 10, 0, 0, s * 1000)).toISOString();

const ev = (s: number, kind: string, message = '', task_id?: string): BuildEvent => ({
  at: at(s),
  kind,
  message,
  task_id,
});

const check = (
  name: string,
  stage: 'baseline' | 'integration',
  ms: number,
  state: CheckResult['state'] = 'passed',
): CheckResult => ({
  name,
  command: [],
  source: '',
  stage,
  state,
  duration_ms: ms,
  at: at(0),
});

function run(events: BuildEvent[], over: Partial<Build> = {}): Build {
  return {
    id: 'r',
    kind: 'autofix',
    instruction: '',
    title: '',
    repo: '/r',
    repo_name: 'r',
    base_branch: 'main',
    base_commit: 'abc',
    status: 'awaiting_final_approval',
    policy: {
      max_parallel: 1,
      require_plan_approval: false,
      review: true,
      max_review_cycles: 2,
      run_baseline: true,
      allow_remote: true,
    },
    plan: {},
    tasks: [
      {
        id: 'fix',
        title: 'Fix the divide',
        kind: 'implement',
        status: 'completed',
      } as Build['tasks'][number],
    ],
    integration: {},
    pr: { state: 'prepared' },
    cycle: 1,
    created_at: at(0),
    updated_at: at(0),
    events,
    live: {},
    ops: [],
    summary: {} as Build['summary'],
    verified: true,
    check_summary: { Passed: 0, Failed: 0, Baseline: 0, Blocked: 0, Skipped: 0, NotRun: 0 },
    checks: [check('go test', 'baseline', 1400), check('go test', 'integration', 600)],
    verification: {
      reproduction: 'reproduced',
      reproduction_reason: 'TestX failed on the current code (exit 1)',
      failure_gone: true,
      test_unchanged: true,
      verdict: 'fixed_and_verified',
    },
    ...over,
  };
}

const flow = [
  ev(0, 'investigation.started'),
  ev(4, 'investigation.completed', 'Investigation by Claude Code (work): code defect.'),
  ev(4, 'reproduction.started'),
  ev(13, 'reproduction.completed'),
  ev(12.9, 'baseline.started'),
  ev(13, 'agent.started', 'Claude Code (work) started Fix the divide', 'fix'),
  ev(13, 'task.scheduled', 'Task "Fix the divide" assigned to Claude Code (work)', 'fix'),
  ev(15, 'baseline.completed'),
  ev(17, 'task.completed', '', 'fix'),
  ev(17, 'integration.started'),
  ev(18, 'validation.started'),
  ev(19, 'verification.started'),
  ev(20, 'validation.completed'),
  ev(20, 'verification.completed'),
  ev(20, 'review.started', 'Review round 1 by Codex (codex-main)'),
  ev(24, 'review.completed', 'Review round 1: 1 finding(s), 0 blocking'),
  ev(24, 'final.ready'),
];

describe('run timeline', () => {
  it('pairs each start with its end and groups steps into phases', () => {
    const tl = buildTimeline(run(flow));

    expect(tl.phases.map((p) => p.name)).toEqual([
      'Investigate',
      'Reproduce',
      'Fix',
      'Integrate',
      'Verify',
      'Review',
      'Approve',
    ]);

    const inv = tl.steps.find((s) => s.label === 'Investigation');

    expect(inv).toMatchObject({ state: 'done', agent: 'Claude Code (work)' });
    expect(inv!.end! - inv!.start).toBe(4000);
    expect(tl.end - tl.origin).toBe(24000);
    expect(tl.live).toBe(false);
  });

  it('lists the agent task before the checks running alongside it, and keeps those out of the bar', () => {
    const fix = buildTimeline(run(flow)).phases.find((p) => p.name === 'Fix')!;

    expect(fix.steps.map((s) => s.label)).toEqual(['Fix the divide', 'Checks on the base commit']);
    expect(fix.steps[0].agent).toBe('Claude Code (work)');
    expect(fix.steps[1].background).toBe(true);
  });

  it('reads checks and the regression test against the base commit', () => {
    const tl = buildTimeline(run(flow));

    expect(tl.steps.find((s) => s.label === 'Checks on the result')?.notes).toEqual([
      { text: 'go test · 1s', was: '1s' },
    ]);

    expect(tl.steps.find((s) => s.label === 'Regression test on the fix')?.notes[0]).toEqual({
      text: 'passes now',
      was: 'failing on base',
    });

    expect(tl.steps.find((s) => s.label === 'Review round 1')).toMatchObject({
      agent: 'Codex (codex-main)',
      notes: [{ text: '1 finding' }],
    });
  });

  it('marks the latest phase as current and a running step as live', () => {
    const settled = buildTimeline(run(flow));

    expect(settled.phases.find((p) => p.current)?.name).toBe('Review');

    const live = buildTimeline(
      run(flow.slice(0, 3), { status: 'reproducing' }),
      new Date(at(10)).getTime(),
    );

    expect(live.live).toBe(true);
    expect(live.steps.at(-1)?.state).toBe('running');
    expect(live.steps.at(-1)?.end).toBeUndefined();
    expect(live.end - live.origin).toBe(10000);
  });

  it('shows a failed reproduction and an attention stop', () => {
    const tl = buildTimeline(
      run(
        [
          ev(0, 'reproduction.started'),
          ev(5, 'reproduction.completed'),
          ev(5, 'attention', 'The failure was not reproduced'),
        ],
        {
          status: 'needs_attention',
          verification: {
            reproduction: 'not_reproduced',
            reproduction_reason: 'the test passed on the current code',
            verdict: 'not_run',
          },
        },
      ),
    );

    expect(tl.steps.map((s) => [s.label, s.state])).toEqual([
      ['Reproduce the failure', 'failed'],
      ['Needs your attention', 'failed'],
    ]);
  });

  it('formats offsets and durations like a stopwatch', () => {
    expect(offset(65_000)).toBe('01:05');
    expect(duration(4_200)).toBe('4s');
    expect(duration(64_000)).toBe('1m 04s');
  });
});
