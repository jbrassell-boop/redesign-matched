import { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '../../../api/client';

interface Props {
  clientKey: number;
}

interface ReportCard {
  clientName: string;
  repairsCompletedYTD: number;
  avgTatYTD: number;
  onTimePctYTD: number;
  revenueYTD: number;
  inHouseNow: number;
  warrantyPctYTD: number;
  departmentsServedYTD: number;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Metric = ({ label, value, sub, color, large }: { label: string; value: string; sub?: string; color?: string; large?: boolean }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8,
    padding: large ? '20px 24px' : '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 3,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    <div style={{ fontSize: large ? 28 : 20, fontWeight: 900, color: color || 'var(--navy)', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
  </div>
);

export const ReportCardTab = ({ clientKey }: Props) => {
  const [data, setData] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/clients/${clientKey}/report-card`)
      .then(r => setData(r.data))
      .catch(() => message.error('Failed to load report card'))
      .finally(() => setLoading(false));
  }, [clientKey]);

  if (loading) return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Loading report card...</div>;
  if (!data) return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>No data available</div>;

  const year = new Date().getFullYear();

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)',
        borderRadius: 8, padding: '16px 20px', color: 'var(--card)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .6, marginBottom: 4 }}>
          Client Performance Report Card — {year} YTD
        </div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{data.clientName}</div>
      </div>

      {/* Top metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Metric label="Repairs Completed" value={`${data.repairsCompletedYTD}`} sub={`${year} year to date`} large />
        <Metric
          label="Avg Turnaround"
          value={`${data.avgTatYTD.toFixed(1)}d`}
          sub="Average days in-house"
          color={data.avgTatYTD <= 7 ? 'var(--success)' : data.avgTatYTD <= 14 ? 'var(--amber)' : 'var(--danger)'}
          large
        />
        <Metric
          label="On-Time Delivery"
          value={`${data.onTimePctYTD}%`}
          sub="Shipped within 14 days"
          color={data.onTimePctYTD >= 90 ? 'var(--success)' : data.onTimePctYTD >= 75 ? 'var(--amber)' : 'var(--danger)'}
          large
        />
        <Metric label="Revenue YTD" value={fmt$(data.revenueYTD)} sub={`${year} total billed`} large />
      </div>

      {/* Secondary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Metric
          label="Currently In-House"
          value={`${data.inHouseNow}`}
          sub="Active repairs right now"
          color={data.inHouseNow > 0 ? 'var(--primary)' : 'var(--muted)'}
        />
        <Metric
          label="Warranty Mix"
          value={`${data.warrantyPctYTD}%`}
          sub="Warranty items vs total"
          color={data.warrantyPctYTD > 30 ? 'var(--amber)' : 'var(--navy)'}
        />
        <Metric
          label="Departments Served"
          value={`${data.departmentsServedYTD}`}
          sub="Active locations this year"
        />
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 6,
        padding: '10px 14px', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic',
      }}>
        Performance data refreshed in real-time from repair management system. On-time delivery measured as repairs shipped within 14 business days of receipt.
        ISO 13485:2016 certified processes.
      </div>
    </div>
  );
};
