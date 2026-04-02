import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getWorkspaceData } from '../../api/workspace';
import { StatusBadge, DetailHeader } from '../../components/shared';
import type { WorkspaceData } from './types';

const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const WidgetCard = ({ title, icon, span = 1, children }: { title: string; icon: string; span?: number; children: React.ReactNode }) => (
  <div style={{
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(var(--primary-rgb), 0.05)',
    gridColumn: span > 1 ? `span ${span}` : undefined,
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 14px', borderBottom: '1px solid var(--border)',
      background: 'var(--neutral-50)',
    }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1 }}>{title}</span>
    </div>
    <div style={{ padding: '12px 14px' }}>
      {children}
    </div>
  </div>
);

const Chip = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '6px 12px', border: '1px solid var(--border)',
    borderRadius: 8, background: 'var(--bg)', minWidth: 54,
  }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: color || 'var(--navy)' }}>{value}</div>
    <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
  </div>
);

const MiniTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {headers.map(h => (
          <th key={h} style={{
            fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
            letterSpacing: '0.04em', padding: '4px 8px', borderBottom: '1.5px solid var(--border-dk)',
            textAlign: 'left',
          }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);

const StatRow = ({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px', borderRadius: 6, marginBottom: 5,
    border: '1px solid var(--border)', cursor: 'pointer',
    transition: 'background 0.1s',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-light)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--label)' }}>{label}</span>
    </div>
    <span style={{ fontSize: 15, fontWeight: 800, color: color || 'var(--navy)' }}>{value}</span>
  </div>
);

const tdStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', color: 'var(--text)',
};

export const WorkspacePage = () => {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkspaceData().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <Spin size="large" />
    </div>
  );

  const rq = data?.repairQueue;
  const od = data?.overdue;
  const inv = data?.invoices;
  const ce = data?.contractsExpiring;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'auto', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <DetailHeader
        title="My Workspace"
        subtitle={getGreeting()}
      />

      {/* Widget Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        padding: 20,
        alignItems: 'start',
      }}>
        {/* Repair Queue — span 2 */}
        <WidgetCard title="Repair Queue" icon="&#128295;" span={2}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Chip label="Received" value={rq?.received ?? 0} />
            <Chip label="In Repair" value={rq?.inRepair ?? 0} color="var(--warning)" />
            <Chip label="QC Hold" value={rq?.qcHold ?? 0} color="var(--danger)" />
            <Chip label="Ship Ready" value={rq?.shipReady ?? 0} color="var(--success)" />
            <Chip label="Overdue" value={rq?.overdue ?? 0} color="var(--danger)" />
          </div>
          {rq?.recentItems && rq.recentItems.length > 0 && (
            <MiniTable headers={['WO #', 'Client', 'Scope', 'TAT/SLA', 'Status']}>
              {rq.recentItems.map(item => {
                const over = item.daysIn > 7;
                return (
                  <tr key={item.wo} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = 'var(--primary-light)'); }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = ''); }}
                  >
                    <td style={tdStyle}><span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 11 }}>{item.wo}</span></td>
                    <td style={tdStyle}>{item.client}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{item.scopeType}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <StatusBadge status={`${item.daysIn}d / 7d`} variant={over ? 'red' : item.daysIn >= 6 ? 'amber' : 'blue'} />
                    </td>
                    <td style={tdStyle}><StatusBadge status={item.status} /></td>
                  </tr>
                );
              })}
            </MiniTable>
          )}
        </WidgetCard>

        {/* My Tasks — static placeholder */}
        <WidgetCard title="My Tasks" icon="&#9989;">
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>
            Tasks widget coming soon
          </div>
        </WidgetCard>

        {/* Overdue / At Risk */}
        <WidgetCard title="Overdue / At Risk" icon="&#9888;&#65039;">
          {od?.items && od.items.length > 0 ? (
            <MiniTable headers={['WO #', 'Client', 'TAT/SLA']}>
              {od.items.map(item => (
                <tr key={item.wo} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = 'var(--primary-light)'); }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = ''); }}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 11 }}>{item.wo}</span></td>
                  <td style={tdStyle}>{item.client}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={`${item.daysIn}d / ${item.sla}d`} variant={item.daysIn > item.sla ? 'red' : 'amber'} />
                  </td>
                </tr>
              ))}
            </MiniTable>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>
              No overdue or at-risk repairs.
            </div>
          )}
        </WidgetCard>

        {/* Outstanding Invoices */}
        <WidgetCard title="Outstanding Invoices" icon="&#128176;">
          <StatRow label="Total Outstanding" value={fmtMoney(inv?.totalOutstanding ?? 0)} icon="&#128178;" color="var(--success)" />
          <StatRow label="Past Due 30+" value={fmtMoney(inv?.pastDue30 ?? 0)} icon="&#9888;&#65039;" color="var(--danger)" />
          <StatRow label="Past Due 60+" value={fmtMoney(inv?.pastDue60 ?? 0)} icon="&#128680;" color="var(--danger)" />
          <StatRow label="Invoiced This Month" value={fmtMoney(inv?.invoicedThisMonth ?? 0)} icon="&#128228;" />
        </WidgetCard>

        {/* Contracts Expiring */}
        <WidgetCard title="Contracts Expiring Soon" icon="&#128203;">
          {ce?.items && ce.items.length > 0 ? (
            <MiniTable headers={['Client', 'Expires', 'In']}>
              {ce.items.map((item, i) => (
                <tr key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = 'var(--primary-light)'); }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => td.style.background = ''); }}
                >
                  <td style={tdStyle}>{item.client}</td>
                  <td style={tdStyle}>{item.expirationDate}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={`${item.daysUntil}d`} variant={item.daysUntil <= 21 ? 'red' : 'amber'} />
                  </td>
                </tr>
              ))}
            </MiniTable>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>
              No contracts expiring in the next 60 days.
            </div>
          )}
        </WidgetCard>

        {/* Quick Links */}
        <WidgetCard title="Quick Links" icon="&#128279;">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'New Repair', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
              { label: 'Inventory', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
              { label: 'Reports', icon: 'M18 20V10M12 20V4M6 20v-6' },
              { label: 'Clients', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
            ].map(link => (
              <div key={link.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 6px', border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', transition: 'all 0.12s', background: 'var(--card)',
              }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--navy)'; el.style.background = 'var(--primary-light)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--card)'; }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth={1.8}>
                  <path d={link.icon} />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--navy)', textAlign: 'center', lineHeight: 1.2 }}>{link.label}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
};
