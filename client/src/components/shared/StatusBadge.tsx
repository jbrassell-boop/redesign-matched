import './StatusBadge.css';

type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'cyan' | 'teal' | 'orange';

const STATUS_MAP: Record<string, BadgeVariant> = {
  'received': 'blue', 'new': 'blue', 'open': 'blue', 'info': 'blue', 'standard': 'blue',
  'approved': 'green', 'complete': 'green', 'completed': 'green', 'active': 'green',
  'yes': 'green', 'sent': 'green', 'shipped': 'purple',
  'pending': 'amber', 'pending qc': 'amber', 'pending ship': 'amber',
  'expiring': 'amber', 'in-progress': 'amber', 'in progress': 'amber', 'warning': 'amber',
  'overdue': 'red', 'expired': 'red', 'hold': 'red', 'on hold': 'red',
  'locked': 'red', 'cancelled': 'red', 'urgent': 'red', 'no': 'red', 'flagged': 'red',
  'at vendor': 'blue',
  'returned': 'green', 'validated': 'green',
  'pending review': 'amber',
  'closed': 'gray', 'neutral': 'gray', 'draft': 'gray', 'inactive': 'gray',
  'admin': 'purple',
  'tech': 'cyan', 'flexible': 'cyan', 'client': 'cyan',
  'accounting': 'teal',
  'repair': 'orange', 'scope': 'orange',
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export const StatusBadge = ({ status, variant, className }: StatusBadgeProps) => {
  const resolved = variant ?? STATUS_MAP[status.toLowerCase()] ?? 'gray';
  return (
    <span className={`status-badge status-badge--${resolved}${className ? ` ${className}` : ''}`}>
      {status}
    </span>
  );
};
