import { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '../../api/client';

interface KpiData {
  receivedThisWeek: number;
  shippedThisWeek: number;
  receivedThisMonth: number;
  shippedThisMonth: number;
  avgTatThisMonth: number;
  avgTatLastMonth: number;
  backlog1to7: number;
  backlog8to14: number;
  backlog15to30: number;
  backlog30Plus: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  warrantyItemsMonth: number;
  totalItemsMonth: number;
  onTimeShipped: number;
  totalShippedMonth: number;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const trend = (curr: number, prev: number) => {
  if (prev === 0) return { arrow: '', color: 'var(--muted)' };
  const diff = ((curr - prev) / prev) * 100;
  if (diff > 5) return { arrow: '▲', color: 'var(--success)' };
  if (diff < -5) return { arrow: '▼', color: 'var(--danger)' };
  return { arrow: '—', color: 'var(--muted)' };
};

const KpiCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <div style={{
    background: 'var(--card)', borderRadius: 8,
    padding: '14px 16px', flex: 1, minWidth: 140,
    border: '1px solid var(--neutral-200)',
    display: 'flex', flexDirection: 'column', gap: 2,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 900, color: color || 'var(--navy)', lineHeight: 1.1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
  </div>
);

export const ExecutiveKpi = () => {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/dashboard/executive-kpi')
      .then(r => setData(r.data))
      .catch(() => { message.error('Failed to load KPI data'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: '12px 16px', display: 'flex', gap: 10 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ flex: 1, height: 72, background: 'var(--neutral-100)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );

  if (!data) return null;

  const tatTrend = trend(data.avgTatThisMonth, data.avgTatLastMonth);
  // For TAT, lower is better — flip the colors
  const tatColor = data.avgTatThisMonth < data.avgTatLastMonth ? 'var(--success)' : data.avgTatThisMonth > data.avgTatLastMonth ? 'var(--danger)' : 'var(--muted)';
  const revTrend = trend(data.revenueThisMonth, data.revenueLastMonth);
  const totalBacklog = data.backlog1to7 + data.backlog8to14 + data.backlog15to30 + data.backlog30Plus;
  const onTimePct = data.totalShippedMonth > 0 ? Math.round((data.onTimeShipped / data.totalShippedMonth) * 100) : 0;
  const warrantyPct = data.totalItemsMonth > 0 ? Math.round((data.warrantyItemsMonth / data.totalItemsMonth) * 100) : 0;

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--navy)',
      borderBottom: '2px solid var(--primary)',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>
          Executive Dashboard
        </h2>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <KpiCard
          label="Throughput (Month)"
          value={`${data.shippedThisMonth}`}
          sub={`${data.receivedThisMonth} received · ${data.shippedThisWeek} shipped this week`}
        />
        <KpiCard
          label="Avg Turnaround"
          value={`${data.avgTatThisMonth.toFixed(1)}d`}
          sub={`${tatTrend.arrow} vs last month (${data.avgTatLastMonth.toFixed(1)}d)`}
          color={tatColor}
        />
        <KpiCard
          label="On-Time Delivery"
          value={`${onTimePct}%`}
          sub={`${data.onTimeShipped} of ${data.totalShippedMonth} within 14 days`}
          color={onTimePct >= 90 ? 'var(--success)' : onTimePct >= 75 ? 'var(--amber)' : 'var(--danger)'}
        />
        <KpiCard
          label="Backlog"
          value={`${totalBacklog}`}
          sub={`${data.backlog1to7} <7d · ${data.backlog8to14} 8-14d · ${data.backlog15to30} 15-30d · ${data.backlog30Plus} >30d`}
          color={data.backlog30Plus > 10 ? 'var(--danger)' : 'var(--navy)'}
        />
        <KpiCard
          label="Revenue (Month)"
          value={fmt$(data.revenueThisMonth)}
          sub={`${revTrend.arrow} vs last month (${fmt$(data.revenueLastMonth)})`}
          color={revTrend.color}
        />
        <KpiCard
          label="Warranty Mix"
          value={`${warrantyPct}%`}
          sub={`${data.warrantyItemsMonth} warranty of ${data.totalItemsMonth} items`}
          color={warrantyPct > 30 ? 'var(--amber)' : 'var(--navy)'}
        />
      </div>
    </div>
  );
};
