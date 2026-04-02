import { useState, useEffect } from 'react';
import { Table, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardAnalytics } from '../../../api/dashboard';
import type { DashboardAnalyticsMetric, DashboardAnalyticsStats } from '../types';

const COLUMNS: ColumnsType<DashboardAnalyticsMetric> = [
  { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 48, align: 'center', render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--muted)' }}>{v}</span> },
  { title: 'Scope Type', dataIndex: 'scopeType', key: 'scopeType', render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{v}</span> },
  { title: 'Repair Count', dataIndex: 'repairCount', key: 'repairCount', align: 'right', width: 110, sorter: (a, b) => a.repairCount - b.repairCount },
  { title: 'Avg TAT (days)', dataIndex: 'avgTat', key: 'avgTat', align: 'right', width: 120, render: (v: number) => v > 0 ? v.toFixed(1) : '\u2014' },
  { title: 'In Progress', dataIndex: 'inProgress', key: 'inProgress', align: 'right', width: 100 },
  { title: 'Completed', dataIndex: 'completed', key: 'completed', align: 'right', width: 100 },
];

const MetricCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)' }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    {sub && <div style={{ fontSize: 10, marginTop: 6, color: 'var(--label)' }}>{sub}</div>}
  </div>
);

const StatChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRight: '1px solid var(--neutral-200)' }}>
    <div style={{ width: 24, height: 24, borderRadius: 4, background: `rgba(${color}, 0.13)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${color})` }} />
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  </div>
);

export const AnalyticsTab = () => {
  const [metrics, setMetrics] = useState<DashboardAnalyticsMetric[]>([]);
  const [stats, setStats] = useState<DashboardAnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardAnalytics()
      .then(r => { setMetrics(r.metrics); setStats(r.stats); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
        <StatChip label="In-House" value={String(stats?.inHouse ?? 0)} color="var(--navy-rgb)" />
        <StatChip label="Avg TAT (days)" value={stats?.avgTat ? stats.avgTat.toFixed(1) : '\u2014'} color="var(--primary-rgb)" />
        <StatChip label="On-Time Ship %" value={stats?.onTimeShipPct ? `${stats.onTimeShipPct.toFixed(0)}%` : '\u2014'} color="var(--success-rgb)" />
        <StatChip label="Throughput" value={String(stats?.throughput ?? 0)} color="var(--navy-rgb)" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 12, padding: 16 }}>
          <MetricCard label="Avg TAT" value={stats?.avgTat ? stats.avgTat.toFixed(1) : '\u2014'} />
          <MetricCard label="Throughput" value={String(stats?.throughput ?? 0)} />
          <MetricCard label="On-Time Ship %" value={stats?.onTimeShipPct ? `${stats.onTimeShipPct.toFixed(0)}%` : '\u2014'} />
          <MetricCard label="Total In-House" value={String(stats?.inHouse ?? 0)} />
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '14px 0 8px' }}>Top Scope Types by Volume</div>
          <Table<DashboardAnalyticsMetric>
            dataSource={metrics} columns={COLUMNS} rowKey="rank" size="small" pagination={false}
          />
        </div>
      </div>
    </div>
  );
};
