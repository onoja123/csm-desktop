import { useEffect, useState } from 'react';
import { Page } from '@/components/shell/Page';
import { DiscoverSkills } from '@/components/skills/DiscoverSkills';
import { InstalledSkills } from '@/components/skills/InstalledSkills';
import { SkillAgents } from '@/components/skills/SkillAgents';
import { SkillPacks } from '@/components/skills/SkillPacks';
import { SkillSelection } from '@/components/skills/SkillSelection';
import { LoadingState, PageHeader, Tabs } from '@/components/ui';
import { useData } from '@/store/data';
import type { SkillsTab } from '@/types';

export function Skills() {
  const { skills, projects, loaded, errors, refresh } = useData();
  const [tab, setTab] = useState<SkillsTab>('installed');
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const existing = projects.filter((p) => p.exists);
  const projectDir = project || existing[0]?.dir || undefined;

  useEffect(() => {
    if (!loaded.skills) void refresh('skills');
    if (!loaded.projects) void refresh('projects');
  }, [loaded.skills, loaded.projects, refresh]);

  return (
    <Page wide>
      <PageHeader
        title="Skills"
        subtitle="Install a skill once; CSM places it where each agent looks for skills, pins it to tasks and carries it through handoffs."
        action={
          <div className="input-row">
            {tab === 'installed' || tab === 'discover' ? (
              <input
                className="input input--sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'discover' ? 'Search the catalog' : 'Filter installed skills'}
                aria-label="Search skills"
              />
            ) : null}

            {tab === 'installed' || tab === 'agents' ? (
              <select
                className="input input--sm"
                value={projectDir ?? ''}
                onChange={(e) => setProject(e.target.value)}
                aria-label="Project"
              >
                {existing.length === 0 ? <option value="">No project</option> : null}

                {existing.map((p) => (
                  <option key={p.dir} value={p.dir}>
                    {p.display}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'installed', label: 'Installed', count: skills.length },
          { id: 'discover', label: 'Discover' },
          { id: 'packs', label: 'Packs' },
          { id: 'agents', label: 'Agents' },
          { id: 'selection', label: 'Selection' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {errors.skills ? <p className="form-error selectable">{errors.skills}</p> : null}

      {!loaded.skills && !errors.skills ? (
        <LoadingState label="Loading skills" />
      ) : tab === 'installed' ? (
        <InstalledSkills
          skills={skills}
          query={query}
          projectDir={projectDir}
          onDiscover={() => setTab('discover')}
        />
      ) : tab === 'discover' ? (
        <DiscoverSkills query={query} />
      ) : tab === 'packs' ? (
        <SkillPacks />
      ) : tab === 'agents' ? (
        <SkillAgents projectDir={projectDir} />
      ) : (
        <SkillSelection />
      )}
    </Page>
  );
}
