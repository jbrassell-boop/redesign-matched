import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getDashboardBriefing } from '../../api/dashboard';
import apiClient from '../../api/client';
import type { BriefingStats, DashboardStats } from './types';

interface Props {
  stats: DashboardStats | null;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Extracted static styles ──
const sectionCardBaseStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' };
const sectionHeaderStyle: React.CSSProperties = { padding: '8px 14px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.06em' };
const sectionBodyStyle: React.CSSProperties = { padding: 0 };
const kpiContainerStyle: React.CSSProperties = { textAlign: 'center', padding: '12px 16px', flex: 1, minWidth: 100 };
const kpiValueBaseStyle: React.CSSProperties = { fontSize: 28, fontWeight: 900, lineHeight: 1 };
const kpiLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 };
const kpiSubStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 };
const flowTdBaseStyle: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)' };
const briefingContainerStyle: React.CSSProperties = { padding: 16, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 };
const briefingHeaderStyle: React.CSSProperties = { background: 'var(--navy)', borderRadius: 8, padding: '16px 20px', color: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const greetingStyle: React.CSSProperties = { fontSize: 20, fontWeight: 900 };
const dateSubStyle: React.CSSProperties = { fontSize: 11, opacity: .5, marginTop: 2 };
const headerStatsRowStyle: React.CSSProperties = { display: 'flex', gap: 20, alignItems: 'center' };
const headerStatBoxStyle: React.CSSProperties = { textAlign: 'center' };
const headerStatValueStyle: React.CSSProperties = { fontSize: 28, fontWeight: 900 };
const headerStatLabelStyle: React.CSSProperties = { fontSize: 11, opacity: .5, textTransform: 'uppercase' };
const urgentBoxStyle: React.CSSProperties = { textAlign: 'center', background: 'rgba(var(--red-500-rgb), 0.2)', padding: '8px 16px', borderRadius: 6 };
const urgentValueStyle: React.CSSProperties = { fontSize: 28, fontWeight: 900, color: 'var(--danger-text-lt)' };
const urgentLabelStyle: React.CSSProperties = { fontSize: 11, opacity: .7, textTransform: 'uppercase' };
const twoColGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
const flowTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const flowThBaseStyle: React.CSSProperties = { padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em', borderBottom: '1px solid var(--neutral-200)', background: 'linear-gradient(180deg, var(--gradient-blue-start), var(--gradient-blue-end))' };
const kpiGrid2Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--neutral-100)' };
const kpiGrid2NoBorderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr' };
const prioritiesGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' };
const prodPlanPadStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' };
const prodGrid3Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 };
const delayPadStyle: React.CSSProperties = { padding: '12px 14px' };
const delayGrid4Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' };
const bigNumStyle: React.CSSProperties = { fontSize: 22, fontWeight: 900 };
const smallLabelStyle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase' };
const delayNumStyle: React.CSSProperties = { fontSize: 18, fontWeight: 900 };
const delayLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' };
const loadingContainerStyle: React.CSSProperties = { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
const loadingBlockStyle: React.CSSProperties = { height: 120, background: 'var(--neutral-100)', borderRadius: 6 };

// ── Section Card ──
const Section = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div style={{ ...sectionCardBaseStyle, borderTop: accent ? `3px solid ${accent}` : undefined }}>
    <div style={sectionHeaderStyle}>
      {title}
    </div>
    <div style={sectionBodyStyle}>{children}</div>
  </div>
);

// ── KPI Pill ──
const Kpi = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div style={kpiContainerStyle}>
    <div style={{ ...kpiValueBaseStyle, color }}>{value}</div>
    <div style={kpiLabelStyle}>{label}</div>
    {sub && <div style={kpiSubStyle}>{sub}</div>}
  </div>
);

// ── Flow Table Row ──
const FlowRow = ({ type, inn, closed, missed, net, bold }: {
  type: string; inn: number; closed: number; missed: number; net: number; bold?: boolean;
}) => {
  const td: React.CSSProperties = {
    ...flowTdBaseStyle,
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
  const [flow, setFlow] = useState<{ category: string; received: number; shipped: number }[]>([]);
  const [kpi, setKpi] = useState<{ backlog1to7: number; backlog8to14: number; backlog15to30: number; backlog30Plus: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardBriefing(),
      apiClient.get('/dashboard/executive-kpi').then(r => r.data).catch(() => { message.error('Failed to load executive KPI data'); return null; }),
    ]).then(([b, k]) => {
      setBriefing(b);
      setKpi(k);
      // Flow data comes back with the briefing now
      if ((b as any)?.flow) setFlow((b as any).flow);
    })
      .catch(() => { message.error('Failed to load ops briefing data'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={loadingContainerStyle}>
      {[1, 2, 3].map(i => (
        <div key={i} style={loadingBlockStyle} />
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
    <div style={briefingContainerStyle}>
      {/* Header */}
      <div style={briefingHeaderStyle}>
        <div>
          <div style={greetingStyle}>{greeting}</div>
          <div style={dateSubStyle}>{dateStr} — Daily Operations Briefing</div>
        </div>
        <div style={headerStatsRowStyle}>
          <div style={headerStatBoxStyle}>
            <div style={headerStatValueStyle}>{open.toLocaleString()}</div>
            <div style={headerStatLabelStyle}>Open Repairs</div>
          </div>
          {urgent > 0 && (
            <div style={urgentBoxStyle}>
              <div style={urgentValueStyle}>{urgent}</div>
              <div style={urgentLabelStyle}>Urgent</div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={twoColGridStyle}>
        {/* Left: Flow table */}
        <Section title="Overall Flow — Previous Work Day" accent="var(--primary)">
          <table style={flowTableStyle}>
            <thead>
              <tr>
                {['Type', 'IN', 'Closed Out', 'Missed', 'Net'].map(h => (
                  <th key={h} style={{ ...flowThBaseStyle, textAlign: h === 'Type' ? 'left' : 'right' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['Flexible', 'Rigid', 'Instrument', 'Camera'] as const).map(cat => {
                const f = flow.find(x => x.category === cat);
                return f ? <FlowRow key={cat} type={cat} inn={f.received} closed={f.shipped} missed={0} net={f.received - f.shipped} /> : null;
              })}
              <FlowRow type="Total" inn={received} closed={shipped} missed={0} net={netFlow} bold />
            </tbody>
          </table>
        </Section>

        {/* Right: KPI Summary */}
        <Section title="Key Performance Indicators" accent="var(--navy)">
          <div style={kpiGrid2Style}>
            <Kpi label="Avg TAT" value={`${(briefing?.avgTat ?? 0).toFixed(1)}d`}
              color={(briefing?.avgTat ?? 0) > 14 ? 'var(--danger)' : 'var(--success)'}
              sub="Target: ≤14 days" />
            <Kpi label="Revenue Yesterday" value={fmt$(briefing?.revenue ?? 0)}
              color="var(--navy)" />
          </div>
          <div style={kpiGrid2NoBorderStyle}>
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
        <div style={prioritiesGridStyle}>
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
      <div style={twoColGridStyle}>
        <Section title="In-House Production Plan">
          <div style={prodPlanPadStyle}>
            <div style={prodGrid3Style}>
              <div>
                <div style={{ ...bigNumStyle, color: 'var(--navy)' }}>{open.toLocaleString()}</div>
                <div style={smallLabelStyle}>In House</div>
              </div>
              <div>
                <div style={{ ...bigNumStyle, color: 'var(--primary)' }}>{pendingQC}</div>
                <div style={smallLabelStyle}>In QC</div>
              </div>
              <div>
                <div style={{ ...bigNumStyle, color: 'var(--success)' }}>{pendingShip}</div>
                <div style={smallLabelStyle}>Ready to Ship</div>
              </div>
            </div>
          </div>
        </Section>
        <Section title="Delay Tracking">
          <div style={delayPadStyle}>
            <div style={delayGrid4Style}>
              <div>
                <div style={{ ...delayNumStyle, color: 'var(--success)' }}>{kpi?.backlog1to7 ?? '—'}</div>
                <div style={delayLabelStyle}>1-7 Days</div>
              </div>
              <div>
                <div style={{ ...delayNumStyle, color: 'var(--amber)' }}>{kpi?.backlog8to14 ?? '—'}</div>
                <div style={delayLabelStyle}>8-14 Days</div>
              </div>
              <div>
                <div style={{ ...delayNumStyle, color: 'var(--danger)' }}>{kpi?.backlog15to30 ?? '—'}</div>
                <div style={delayLabelStyle}>15-30 Days</div>
              </div>
              <div>
                <div style={{ ...delayNumStyle, color: 'var(--danger)' }}>{kpi?.backlog30Plus ?? briefing?.overdue ?? 0}</div>
                <div style={delayLabelStyle}>30+ Days</div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
