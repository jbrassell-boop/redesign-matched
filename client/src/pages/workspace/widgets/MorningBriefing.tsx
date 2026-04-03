import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { getDashboardStats } from '../../../api/dashboard';
import type { DashboardStats } from '../../dashboard/types';
import './MorningBriefing.css';

const fmtDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const MorningBriefing = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 2 }} />;

  const items: { label: string; value: string | number; color: string }[] = [
    { label: 'Received',  value: stats?.receivedToday ?? 0,  color: 'var(--navy)' },
    { label: 'Completed', value: stats?.completedToday ?? 0, color: 'var(--success)' },
    { label: 'Open',      value: stats?.openRepairs ?? 0,    color: 'var(--primary)' },
    { label: 'Urgent',    value: stats?.urgentRepairs ?? 0,  color: 'var(--danger)' },
    { label: 'QC Hold',   value: stats?.pendingQC ?? 0,      color: 'var(--warning)' },
    { label: 'Ship Ready', value: stats?.pendingShip ?? 0,   color: 'var(--success)' },
  ];

  return (
    <div className="briefing-card">
      <div className="briefing-card__header">
        <span className="briefing-card__title">Morning Briefing &mdash; Yesterday</span>
        <span className="briefing-card__date">{fmtDate()}</span>
      </div>
      <div className="briefing-card__body">
        {items.map(item => (
          <div key={item.label} className="briefing-card__stat">
            <div className="briefing-card__stat-value" style={{ color: item.color }}>{item.value}</div>
            <div className="briefing-card__stat-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
