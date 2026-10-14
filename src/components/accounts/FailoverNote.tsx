import { Link } from 'react-router-dom';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Icon, Panel } from '@/components/ui';
import { useData } from '@/store/data';

export function FailoverNote() {
  const activity = useData((s) => s.activity);
  const sw = activity.find((a) => a.kind === 'switch');
  if (!sw) return null;
  const limit = activity.find((a) => a.kind === 'usage_limit' && new Date(a.at) <= new Date(sw.at));
  return (
    <Panel className="failover-note">
      <div className="failover-note__body">
        <h3>{limit ? limit.title : 'CSM switched accounts'}</h3>
        <p>{sw.title}</p>
        {sw.detail ? <p className="failover-note__detail">Reason: {sw.detail}</p> : null}
      </div>
      <Link to="/activity" className="failover-note__link">
        Activity <Icon icon={ArrowRight02Icon} size="sm" />
      </Link>
    </Panel>
  );
}
