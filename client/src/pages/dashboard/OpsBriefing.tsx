import { useState, useEffect } from 'react';
import { getDashboardBriefing } from '../../api/dashboard';
import apiClient from '../../api/client';
import type { BriefingStats, DashboardStats } from './types';

interface Props {
  stats: DashboardStats | null;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Section Card ──
const Section = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--neutral-200)',
    borderRadius: 6, overflow: 'hidden',
    borderTop: accent ? `3px solid ${accent}` : undefined,
  }}>
    <div style={{
      padding: '8px 14px', background: 'var(--neutral-50)',
      borderBottom: '1px solid var(--neutral-200)',
      fontSize: 11, fontWeight: 800, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      {title}
    </div>
    <div style={{ padding: 0 }}>{children}</div>
  </div>
);

// ── KPI Pill ──
const Kpi = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div style={{ textAlign: 'center', padding: '12px 16px', flex: 1, minWidth: 100 }}>
    <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Flow Table Row ──
const FlowRow = ({ type, inn, closed, missed, net, bold }: {
  type: string; inn: number; closed: number; missed: number; net: number; bold?: boolean;
}) => {
  const td: React.CSSProperties = {
    padding: '6px 12px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)',
    fontWeight: bold ? 700 : 400, background: bold ? 'var(--neutral-50)' : undefined,
  };
  const numTd: React.CSSProperties = { ...td, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' };
  return (
    <tr>
      <td style={td}>{type}</td>
      <td style={numTd}>{inn}</td>
      <td style={numTd}>{closed}</td>
      <td style={{ ...numTd, color: missed > 0 ? 'var(--danger)' : 'var(--muted)' }}>{missed}</td>
      <td style={{ ...numTd, color: net > 0 ? 'var(--danger)' : net < 0 ? 'var(--success)' : 'var(--muted)', fontWeight: 700 }}>
        {net > 0 ? `+${net}` : net}
      </td>
    </tr>
  );
};

export const OpsBriefing = ({ stats }: Props) => {
  const [briefing, setBriefing] = useState<BriefingStats | null>(null);
  const [kpi, setKpi] = useState<{ backlog1to7: number; backlog8to14: number; backlog15to30: number; backlog30Plus: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardBriefing(),
      apiClient.get('/dashboard/executive-kpi').then(r => r.data).catch(() => null),
    ]).then(([b, k]) => { setBriefing(b); setKpi(k); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 120, background: 'var(--neutral-100)', borderRadius: 6 }} />
      ))}
    </div>
  );

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const received = briefing?.received ?? 0;
  const shipped = briefing?.shipped ?? 0;
  const netFlow = received - shipped;
  const open = stats?.openRepairs ?? 0;
  const urgent = stats?.urgentRepairs ?? 0;
  const pendingQC = stats?.pendingQC ?? 0;
  const pendingShip = stats?.pendingShip ?? 0;

  return (
    <div style={{ padding: 16, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #1a365d 100%)',
        borderRadius: 8, padding: '16px 20px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{greeting}</div>
          <div style={{ fontSize: 11, opacity: .5, marginTop: 2 }}>{dateStr} — Daily Operations Briefing</div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{open.toLocaleString()}</div>
            <div style={{ fontSize: 9, opacity: .5, textTransform: 'uppercase' }}>Open Repairs</div>
          </div>
          {urgent > 0 && (
            <div style={{ textAlign: 'center', background: 'rgba(239,68,68,.2)', padding: '8px 16px', borderRadius: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fca5a5' }}>{urgent}</div>
              <div style={{ fontSize: 9, opacity: .7, textTransform: 'uppercase' }}>Urgent</div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left: Flow table */}
        <Section title="Overall Flow — Previous Work Day" accent="var(--primary)">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Type', 'IN', 'Closed Out', 'Missed', 'Net'].map(h => (
                  <th key={h} style={{
                    padding: '6px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--muted)', letterSpacing: '.04em', textAlign: h === 'Type' ? 'left' : 'right',
                    borderBottom: '1px solid var(--neutral-200)',
                    background: 'linear-gradient(180deg, #e8f0f8, #d4e4f0)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FlowRow type="Flexible" inn={received} closed={shipped} missed={0} net={netFlow} />
              <FlowRow type="Rigid" inn={0} closed={0} missed={0} net={0} />
              <FlowRow type="Instruments" inn={0} closed={0} missed={0} net={0} />
              <FlowRow type="Total" inn={received} closed={shipped} missed={0} net={netFlow} bold />
            </tbody>
          </table>
        </Section>

        {/* Right: KPI Summary */}
        <Section title="Key Performance Indicators" accent="var(--navy)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--neutral-100)' }}>
            <Kpi label="Avg TAT" value={`${(briefing?.avgTat ?? 0).toFixed(1)}d`}
              color={(briefing?.avgTat ?? 0) > 14 ? 'var(--danger)' : 'var(--success)'}
              sub="Target: ≤14 days" />
            <Kpi label="Revenue Yesterday" value={fmt$(briefing?.revenue ?? 0)}
              color="var(--navy)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Kpi label="Overdue (>14d)" value={`${briefing?.overdue ?? 0}`}
              color={(briefing?.overdue ?? 0) > 0 ? 'var(--danger)' : 'var(--success)'}
              sub="Repairs past target" />
            <Kpi label="Approved Yesterday" value={`${briefing?.approved ?? 0}`}
              color="var(--primary)" />
          </div>
        </Section>
      </div>

      {/* Today's Priorities */}
      <Section title="Today's Priorities" accent="var(--amber)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {urgent > 0 && (
            <Kpi label="Hot List" value={`${urgent}`} color="var(--danger)" sub="Immediate attention" />
          )}
          <Kpi label="Pending QC" value={`${pendingQC}`}
            color={pendingQC > 20 ? 'var(--amber)' : 'var(--navy)'} sub="Ready for inspection" />
          <Kpi label="Ready to Ship" value={`${pendingShip}`}
            color="var(--primary)" sub="Passed QC" />
          <Kpi label="Received Yesterday" value={`${received}`}
            color="var(--navy)" sub="New intake" />
          <Kpi label="Shipped Yesterday" value={`${shipped}`}
            color="var(--success)" sub="Completed" />
        </div>
      </Section>

      {/* Production Plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Section title="In-House Production Plan">
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)' }}>{open.toLocaleString()}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase' }}>In House</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{pendingQC}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase' }}>In QC</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--success)' }}>{pendingShip}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase' }}>Ready to Ship</div>
              </div>
            </div>
          </div>
        </Section>
        <Section title="Delay Tracking">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--success)' }}>{kpi?.backlog1to7 ?? '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>1-7 Days</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--amber)' }}>{kpi?.backlog8to14 ?? '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>8-14 Days</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--danger)' }}>{kpi?.backlog15to30 ?? '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>15-30 Days</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--danger)' }}>{kpi?.backlog30Plus ?? briefing?.overdue ?? 0}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>30+ Days</div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
