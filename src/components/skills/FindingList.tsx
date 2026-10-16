import { StatusText } from '@/components/ui';
import { INSPECTION_LABEL, inspectionTone, severityTone } from '@/lib/skills';
import type { SkillInspection } from '@/types';

export const SCAN_LIMITATION =
  'A static read cannot prove a skill is safe. It only points at instructions and files worth reading before you install.';

export function FindingList({ inspection }: { inspection: SkillInspection }) {
  const findings = inspection.findings ?? [];

  return (
    <div className="skill-findings">
      <StatusText tone={inspectionTone(inspection.status)}>
        {INSPECTION_LABEL[inspection.status]}
      </StatusText>

      {findings.length ? (
        <ul>
          {findings.map((f, i) => (
            <li key={i} className={`tone-${severityTone(f.severity)}`}>
              <span className="mono skill-findings__where">
                {f.file}
                {f.line ? `:${f.line}` : ''}
              </span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="muted skill-findings__limit">{SCAN_LIMITATION}</p>
    </div>
  );
}
