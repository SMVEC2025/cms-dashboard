import clsx from 'clsx';
import { formatStatusLabel } from '@/lib/utils';

function StatusBadge({ status }) {
  return <span className={clsx('status-badge', `status-badge--${status}`)}>{formatStatusLabel(status)}</span>;
}

export default StatusBadge;

