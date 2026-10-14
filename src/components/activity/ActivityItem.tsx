import type { IconSvgElement } from '@hugeicons/react';
import { ArrowDataTransferHorizontalIcon, Bookmark02Icon, Cancel01Icon, FilterHorizontalIcon, FlashIcon, PlayIcon, PowerIcon, RadioButtonIcon, SecurityWarningIcon, StopIcon, Tick02Icon, UserIcon, WorkflowSquare03Icon } from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';
import { IconTile } from '@/components/ui';
import { providerIcon } from '@/lib/provider-icons';
import type { Activity, StatusTone } from '@/types';
import { ago } from '@/lib/format';

function iconFor(a: Activity): { icon: IconSvgElement; tone?: StatusTone } {
  switch (a.kind) {
    case 'run.started':
      return { icon: PlayIcon, tone: 'ok' };
    case 'run.exited':
      return { icon: PowerIcon };
    case 'run.stop':
      return { icon: StopIcon };
    case 'usage_limit':
      return { icon: FlashIcon, tone: 'limit' };
    case 'switch':
    case 'switch.requested':
      return { icon: ArrowDataTransferHorizontalIcon };
    case 'account.activated':
      return { icon: UserIcon };
    case 'approval.requested':
      return { icon: SecurityWarningIcon, tone: 'warn' };
    case 'approval.allowed':
      return { icon: Tick02Icon, tone: 'ok' };
    case 'approval.denied':
      return { icon: Cancel01Icon, tone: 'err' };
    case 'approval.expired':
      return { icon: SecurityWarningIcon };
    case 'checkpoint':
      return { icon: Bookmark02Icon };
    case 'failover.policy':
      return { icon: FilterHorizontalIcon };
    case 'session.resumed':
      return { icon: PlayIcon };
    default:
      if (a.kind.startsWith('build.')) return { icon: a.kind === 'build.fallback.handoff' || a.kind === 'build.fallback.account' ? ArrowDataTransferHorizontalIcon : WorkflowSquare03Icon, tone: a.kind.endsWith('failed') || a.kind.endsWith('attention') || a.kind.endsWith('conflict') ? 'err' : a.kind.endsWith('completed') ? 'ok' : undefined };
      if (a.kind.startsWith('handoff.')) return { icon: ArrowDataTransferHorizontalIcon, tone: a.kind.endsWith('failed') ? 'err' : a.kind.endsWith('target_started') ? 'ok' : undefined };
      return a.provider ? { icon: providerIcon(a.provider) } : { icon: RadioButtonIcon };
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
  const build = activity.refs?.build;
  if (build) {
    return (
      <Link to={`/build/${build}`} className={`activity ${dense ? 'activity--dense' : ''}`}>
        {body}
      </Link>
    );
  }
  if (activity.run_id) {
    return (
      <Link to={`/agents/${activity.run_id}`} className={`activity ${dense ? 'activity--dense' : ''}`}>
        {body}
      </Link>
    );
  }
  return <div className={`activity ${dense ? 'activity--dense' : ''}`}>{body}</div>;
}
