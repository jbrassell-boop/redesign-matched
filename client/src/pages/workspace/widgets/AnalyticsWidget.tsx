import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { getDashboardAnalytics } from '../../../api/dashboard';
import type { DashboardAnalyticsStats } from '../../dashboard/types';


export const AnalyticsWidget = () => {
  const [stats, setStats] = useState<DashboardAnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardAnalytics().then(r => setStats(r.stats)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 2 }} />;

  const items: { label: string; value: string; color: string }[] = [
    { label: 'In House',     value: String(stats?.inHouse ?? 0),           color: 'var(--navy)' },
    { label: 'Avg TAT',      value: `${(stats?.avgTat ?? 0).toFixed(1)}d`, color: 'var(--primary)' },
    { label: 'On-Time Ship', value: `${(stats?.onTimeShipPct ?? 0).toFixed(0)}%`, color: 'var(--success)' },
    { label: 'Throughput',   value: String(stats?.throughput ?? 0),         color: 'var(--success)' },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', fontSize: 11, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Analytics &mdash; This Month
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 14, flexWrap: 'wrap' }}>
        {items.map(item => (
          <div key={item.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 14px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', background: 'var(--bg)',
            minWidth: 80, flex: 1,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
