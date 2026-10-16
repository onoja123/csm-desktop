import { useEffect, useState } from 'react';
import { AgentSkillView } from '@/components/skills/AgentSkillView';
import { Button, LoadingState, Panel, PanelHeader, StatusText } from '@/components/ui';
import { api } from '@/lib/api';
import { findingTone } from '@/lib/skills';
import { useData } from '@/store/data';
import { useHomeDir } from '@/hooks/useHomeDir';
import type { SkillAgentInfo, SkillAgentView, SkillDoctorFinding } from '@/types';

export function SkillAgents({ projectDir }: { projectDir?: string }) {
  const home = useHomeDir();
  const stamp = useData((s) => s.skills);
  const [views, setViews] = useState<SkillAgentView[]>();
  const [findings, setFindings] = useState<SkillDoctorFinding[]>();
  const [agents, setAgents] = useState<SkillAgentInfo[]>([]);
  const [error, setError] = useState<string>();
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setViews(undefined);

    Promise.all([api.skillAvailability(projectDir), api.skillDoctor(projectDir), api.skillAgents()])
      .then(([v, f, a]) => {
        setViews(v);
        setFindings(f);
        setAgents(a);
      })
      .catch((e: Error) => setError(e.message));
  }, [projectDir, stamp]);

  const verify = async () => {
    setVerifying(true);

    try {
      setFindings(await api.skillDoctor(projectDir, true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  if (error) return <p className="form-error selectable">{error}</p>;
  if (!views) return <LoadingState label="Reading the agents' skill folders" />;

  const problems = (findings ?? []).filter((f) => f.level !== 'ok');

  return (
    <div className="skill-agents">
      <Panel>
        <PanelHeader
          title="Checks"
          meta={problems.length ? `${problems.length} to look at` : 'no problems'}
          action={
            <Button size="sm" loading={verifying} onClick={() => void verify()}>
              Ask the agents
            </Button>
          }
        />

        <p className="muted">
          "Ask the agents" runs each agent's own skill listing, which makes no model request. Cursor
          CLI has no such command, so CSM cannot confirm what it loads.
        </p>

        <ul className="skill-outcomes">
          {(findings ?? []).map((f, i) => (
            <li key={i}>
              <StatusText tone={findingTone(f.level)}>{f.label}</StatusText>
              {f.detail ? (
                <span className="skill-outcomes__detail selectable">{f.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      {views.map((v) => (
        <AgentSkillView
          key={v.provider + (v.account ?? '')}
          view={v}
          info={agents.find((a) => a.provider === v.provider)}
          home={home}
        />
      ))}

      <p className="muted">
        Available means the agent can find the skill. Whether an agent loaded it shows only in a
        task, and only when the agent's own session record says so.
      </p>
    </div>
  );
}
