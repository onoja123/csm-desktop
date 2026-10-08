import { ArrowLeftRight, Check, CircleDot, Play, Power, ShieldAlert, Square, UserRound, Zap, type LucideIcon, Bookmark, Settings2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconTile } from '@/components/ui';
import { providerIcon } from '@/components/agents/AgentIcon';
import type { Activity } from '@/lib/types';
import type { Tone } from '@/design/tokens';
import { ago } from '@/lib/format';

function iconFor(a: Activity): { icon: LucideIcon; tone?: Tone } {
  switch (a.kind) {
    case 'run.started':
      return { icon: Play, tone: 'ok' };
    case 'run.exited':
      return { icon: Power };
    case 'run.stop':
      return { icon: Square };
    case 'usage_limit':
      return { icon: Zap, tone: 'limit' };
    case 'switch':
    case 'switch.requested':
      return { icon: ArrowLeftRight };
    case 'account.activated':
      return { icon: UserRound };
    case 'approval.requested':
      return { icon: ShieldAlert, tone: 'warn' };
    case 'approval.allowed':
      return { icon: Check, tone: 'ok' };
    case 'approval.denied':
      return { icon: X, tone: 'err' };
    case 'approval.expired':
      return { icon: ShieldAlert };
    case 'checkpoint':
      return { icon: Bookmark };
    case 'failover.policy':
      return { icon: Settings2 };
    case 'session.resumed':
      return { icon: Play };
    default:
      if (a.kind.startsWith('handoff.')) return { icon: ArrowLeftRight, tone: a.kind.endsWith('failed') ? 'err' : a.kind.endsWith('target_started') ? 'ok' : undefined };
      return a.provider ? { icon: providerIcon(a.provider) } : { icon: CircleDot };
  }
}

export function ActivityItem({ activity, dense = false }: { activity: Activity; dense?: boolean }) {
  const { icon, tone } = iconFor(activity);
  const body = (
    <>
      <IconTile icon={icon} size={dense ? 'md' : 'lg'} tone={tone} />
      <div className="activity__main">
        <span className="activity__title">{activity.title}</span>
        {activity.detail ? <span className="activity__detail">{activity.detail}</span> : null}
      </div>
      <time className="activity__time" dateTime={activity.at}>
        {ago(activity.at)}
      </time>
    </>
  );
  if (activity.run_id) {
    return (
      <Link to={`/agents/${activity.run_id}`} className={`activity ${dense ? 'activity--dense' : ''}`}>
        {body}
      </Link>
    );
  }
  return <div className={`activity ${dense ? 'activity--dense' : ''}`}>{body}</div>;
}
