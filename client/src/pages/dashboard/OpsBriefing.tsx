import { useState, useEffect } from 'react';
import { getDashboardBriefing } from '../../api/dashboard';
import type { BriefingStats, DashboardStats } from './types';

interface Props {
  stats: DashboardStats | null;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const BriefingCard = ({ label, value, sub, icon, color, alert }: {
  label: string; value: string; sub?: string; icon: string; color: string; alert?: boolean;
}) => (
  <div style={{
    background: 'var(--card)', border: alert ? `2px solid ${color}` : '1px solid var(--neutral-200)',
    borderRadius: 8, padding: '16px 20px',
    display: 'flex', gap: 14, alignItems: 'flex-start',
    animation: alert ? 'pulse 2s infinite' : undefined,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 8,
      background: `${color}15`, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

export const OpsBriefing = ({ stats }: Props) => {
  const [briefing, setBriefing] = useState<BriefingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardBriefing()
      .then(setBriefing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ flex: '1 1 280px', height: 90, background: 'var(--neutral-100)', borderRadius: 8 }} />
      ))}
    </div>
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy)' }}>Good Morning</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{today} — Daily Operations Briefing</div>
      </div>

      {/* Yesterday's Activity */}
      {briefing && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Yesterday's Activity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            <BriefingCard icon="📥" label="Received" value={`${briefing.received}`} color="var(--primary)" sub="Repairs checked in yesterday" />
            <BriefingCard icon="📦" label="Shipped" value={`${briefing.shipped}`} color="var(--success)" sub="Repairs shipped out yesterday" />
            <BriefingCard icon="✓" label="Approved" value={`${briefing.approved}`} color="var(--success)" sub="Quotes approved yesterday" />
            <BriefingCard icon="$" label="Revenue" value={fmt$(briefing.revenue)} color="var(--primary)" sub="Billed on shipped repairs" />
            <BriefingCard icon="⏱" label="Avg TAT" value={`${briefing.avgTat.toFixed(1)}d`} color={briefing.avgTat > 14 ? 'var(--danger)' : 'var(--navy)'} sub="Current open repair average" />
            <BriefingCard icon="⚠" label="Overdue (>14d)" value={`${briefing.overdue}`} color="var(--danger)" sub="Open repairs past 14 day target" alert={briefing.overdue > 0} />
          </div>
        </div>
      )}

      {/* Today's Priorities */}
      {stats && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Today's Priorities
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {stats.urgentRepairs > 0 && (
              <BriefingCard icon="🔴" label="Urgent / Hot List" value={`${stats.urgentRepairs}`} color="var(--danger)" sub="Requires immediate attention" alert />
            )}
            <BriefingCard icon="🔬" label="Pending QC" value={`${stats.pendingQC}`} color="var(--amber)" sub="Ready for quality inspection" alert={stats.pendingQC > 20} />
            <BriefingCard icon="🚚" label="Ready to Ship" value={`${stats.pendingShip}`} color="var(--primary)" sub="Passed QC, awaiting shipment" />
            <BriefingCard icon="📋" label="Total Open" value={`${stats.openRepairs}`} color="var(--navy)" sub="All repairs currently in-house" />
          </div>
        </div>
      )}
    </div>
  );
};
