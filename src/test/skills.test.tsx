import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { api } from '@/lib/api';
import { STATE_LABEL, levelTone, stateTone, toFileDiff } from '@/lib/skills';
import { useData } from '@/store/data';
import { Skills } from '@/screens/Skills';
import { TaskSkills } from '@/components/skills/TaskSkills';
import { HandoffSkills } from '@/components/skills/HandoffSkills';
import type { Build, BuildTask, SkillRecord, SkillTaskManifest } from '@/types';

const mocked = vi.mocked(invoke);

const record: SkillRecord = {
  id: 'github.com/anthropics/skills/skills/pdf',
  name: 'pdf',
  description: 'Read and fill PDF forms.',
  source: { type: 'github', repo: 'anthropics/skills', path: 'skills/pdf' },
  revision: 'dbd4588f9e10a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  hash: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  upstream_hash: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  license: 'Proprietary',
  enabled: true,
  global: true,
  skill: { name: 'pdf', description: 'Read and fill PDF forms.', files: [], hash: 'aaaa' },
  inspection: {
    status: 'review',
    findings: [
      { severity: 'warning', file: 'SKILL.md', line: 3, message: 'refers to credentials or keys' },
    ],
  },
  projections: [
    {
      provider: 'claude',
      account: 'work',
      scope: 'global',
      dir: '/p/work/skills/pdf',
      hash: 'x',
      canonical: 'aaaa',
      at: '2026-10-14T10:00:00Z',
    },
    {
      provider: 'codex',
      account: 'c1',
      scope: 'global',
      dir: '/p/c1/skills/pdf',
      hash: 'y',
      canonical: 'aaaa',
      at: '2026-10-14T10:00:00Z',
    },
  ],
  installed_at: '2026-10-14T10:00:00Z',
  updated_at: '2026-10-14T10:00:00Z',
  compatibility: [
    { provider: 'claude', level: 'compatible' },
    {
      provider: 'codex',
      level: 'adapted',
      adaptations: ['${CLAUDE_SKILL_DIR} replaced with the skill folder'],
    },
    {
      provider: 'cursor',
      level: 'partial',
      reasons: ['Cursor CLI ignores context, which runs the skill in a separate subagent'],
    },
  ],
  placement_states: {
    '/p/work/skills/pdf': 'ok',
    '/p/c1/skills/pdf': 'edited after csm placed it',
  },
  version: 'dbd4588f9e10',
};

describe('skills api', () => {
  beforeEach(() => mocked.mockReset());

  it('sends skill actions and queries to the service paths', async () => {
    mocked.mockResolvedValue({ status: 200, body: '{}' });
    await api.skillAction('enable', { id: record.id, providers: ['codex'] });

    expect(mocked).toHaveBeenLastCalledWith('csm_request', {
      method: 'POST',
      path: '/v1/skills/enable',
      body: JSON.stringify({ id: record.id, providers: ['codex'] }),
    });

    mocked.mockResolvedValue({ status: 200, body: '{"record":{}}' });
    await api.skillDetail(record.id);

    expect(mocked).toHaveBeenLastCalledWith('csm_request', {
      method: 'GET',
      path: '/v1/skills/detail?id=github.com%2Fanthropics%2Fskills%2Fskills%2Fpdf',
      body: null,
    });
  });
});

describe('skill states', () => {
  it('only treats evidence of loading as verified use', () => {
    expect(stateTone('invoked')).toBe('ok');
    expect(stateTone('projected')).toBe('idle');
    expect(stateTone('requested')).toBe('idle');
    expect(stateTone('unverified')).toBe('warn');
    expect(STATE_LABEL.projected).not.toMatch(/used|loaded/i);
    expect(levelTone('unsupported')).toBe('err');
  });

  it('turns a unified diff into a diff block', () => {
    const d = toFileDiff({
      path: 'SKILL.md',
      change: 'modified',
      diff: '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -1 +1 @@\n-old\n+new\n',
    });

    expect(d).toMatchObject({ added: 1, removed: 1 });
    expect(d.lines[0]).toBe('@@ -1 +1 @@');
  });
});

describe('Skills screen', () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({ status: 200, body: JSON.stringify({ record, preview: 'Steps.' }) });

    useData.setState({
      skills: [record],
      projects: [],
      loaded: { skills: true, projects: true },
      errors: {},
    });
  });

  it('shows installed skills with real placements, compatibility and findings', async () => {
    render(
      <MemoryRouter>
        <Skills />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Steps.')).toBeInTheDocument());
    expect(screen.getAllByText('pdf').length).toBeGreaterThan(0);
    expect(screen.getByText('edited after csm placed it')).toBeInTheDocument();
    expect(screen.getByText(/CSM adapts the copy/)).toBeInTheDocument();
    expect(screen.getByText(/refers to credentials or keys/)).toBeInTheDocument();
    expect(screen.getAllByText(/cannot prove a skill is safe/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Review 1 edited copy/ })).toBeInTheDocument();
  });

  it('offers to find skills when none are installed', () => {
    useData.setState({ skills: [] });

    render(
      <MemoryRouter>
        <Skills />
      </MemoryRouter>,
    );

    expect(screen.getByText('No skills installed')).toBeInTheDocument();
  });
});

const build = { id: 'b1', repo: '/repo', tasks: [], attempts: [], live: {} } as unknown as Build;

const task = {
  id: 't1',
  kind: 'implement',
  title: 'Export PDF',
  objective: 'Add a PDF export',
  status: 'completed',
  order: 0,
  skill_manifest: '/m/t1.json',
} as BuildTask;

const manifest: SkillTaskManifest = {
  mode: 'recommended',
  skills: [
    {
      id: record.id,
      name: 'pdf',
      source: 'github.com/anthropics/skills/skills/pdf',
      revision: record.revision,
      hash: record.hash,
      origin: 'explicit',
      reason: 'selected for this task',
      state: 'unverified',
      placements: [
        {
          provider: 'claude',
          account: 'work',
          state: 'invoked',
          dir: '/w/.claude/skills/pdf',
          at: '2026-10-14T10:00:00Z',
          evidence: [
            { skill: 'pdf', provider: 'claude', kind: 'Skill tool call', session: 'abcdef123456' },
          ],
        },
        {
          provider: 'codex',
          account: 'c1',
          state: 'unverified',
          dir: '/w/.agents/skills/pdf',
          handoff: true,
          problem: 'no record of Codex loading it in session s2',
          at: '2026-10-14T10:05:00Z',
        },
      ],
    },
  ],
  missing: ['xlsx'],
};

describe('TaskSkills', () => {
  it('separates verified loading from availability and reports missing skills', async () => {
    mocked.mockReset();
    mocked.mockResolvedValue({ status: 200, body: JSON.stringify(manifest) });

    render(<TaskSkills build={build} task={task} onAct={async () => undefined} />);

    await waitFor(() => expect(screen.getByText('Loaded (verified)')).toBeInTheDocument());
    expect(screen.getAllByText('Use unverified').length).toBeGreaterThan(0);
    expect(screen.getByText(/Evidence: Skill tool call/)).toBeInTheDocument();
    expect(screen.getByText(/no record of Codex loading it/)).toBeInTheDocument();
    expect(screen.getByText(/xlsx was picked but is not installed/)).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /Pick skills|Change skills/ }),
    ).not.toBeInTheDocument();
  });
});

describe('HandoffSkills', () => {
  it('lists what was carried and why the rest was not', () => {
    render(
      <HandoffSkills
        home="/Users/me"
        skills={{
          carried: [
            {
              name: 'pdf',
              version: 'dbd4588f9e10',
              level: 'adapted',
              used: 'invoked',
              to: '/w/.agents/skills/pdf',
              use: '$pdf',
            },
          ],
          not_carried: [
            {
              name: 'deploy-hooks',
              reason:
                'it defines hooks, which Claude Code would run on its own; csm never activates hooks in a handoff',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('1 carried · 1 not carried')).toBeInTheDocument();
    expect(screen.getByText(/the previous agent loaded it/)).toBeInTheDocument();
    expect(screen.getByText(/never activates hooks in a handoff/)).toBeInTheDocument();
    expect(screen.getByText(/not proof that the agent loads or follows it/)).toBeInTheDocument();
  });
});
