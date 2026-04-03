import { Skeleton } from 'antd';
import type { ClientFull, ClientKpis } from './types';

interface ClientKpiStripProps {
  client: ClientFull;
  kpis: ClientKpis | null;
  loading?: boolean;
}

interface KpiChip {
  id: string;
  label: string;
  value: string;
  color: 'navy' | 'blue' | 'green' | 'red' | 'amber';
}

const colorMap = {
  navy:  { bg: 'rgba(var(--navy-rgb), 0.08)',  dot: 'var(--navy)',    text: 'var(--navy)' },
  blue:  { bg: 'rgba(var(--primary-rgb), 0.08)',dot: 'var(--primary)', text: 'var(--primary)' },
  green: { bg: 'rgba(var(--success-rgb), 0.08)',dot: 'var(--success)', text: 'var(--success)' },
  red:   { bg: 'rgba(var(--danger-rgb), 0.08)', dot: 'var(--danger)',  text: 'var(--danger)' },
  amber: { bg: 'rgba(var(--amber-rgb), 0.08)',  dot: 'var(--amber)',   text: 'var(--amber)' },
};

export const ClientKpiStrip = ({ client, kpis, loading }: ClientKpiStripProps) => {
  const chips: KpiChip[] = [
    { id: 'status', label: 'STATUS', value: client.isActive ? 'Active' : 'Inactive', color: client.isActive ? 'green' : 'red' },
    { id: 'rep', label: 'REP', value: client.salesRep || '\u2014', color: 'navy' },
    { id: 'pricing', label: 'PRICING', value: client.pricingCategory || '\u2014', color: 'blue' },
    { id: 'terms', label: 'TERMS', value: client.paymentTerms || '\u2014', color: 'blue' },
    { id: 'revenue', label: 'REVENUE', value: kpis ? `$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '\u2014', color: 'green' },
    { id: 'openRepairs', label: 'OPEN REPAIRS', value: kpis?.openRepairs?.toString() ?? '\u2014', color: 'amber' },
    { id: 'depts', label: 'DEPARTMENTS', value: client.deptCount.toString(), color: 'navy' },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--card)',
      borderBottom: '1px solid var(--neutral-200)',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {chips.map((chip, i) => {
        const c = colorMap[chip.color];
        return (
          <div key={chip.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRight: i < chips.length - 1 ? '1px solid var(--neutral-200)' : undefined,
            flex: 1,
            minWidth: 0,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.bg, flexShrink: 0,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c.dot }} />
            </div>
            <div style={{ minWidth: 0 }}>
              {loading ? (
                <Skeleton.Input size="small" active style={{ width: 40, height: 16 }} />
              ) : (
                <div style={{
                  fontSize: 14, fontWeight: 800, lineHeight: 1.1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: c.text,
                }}>
                  {chip.value}
                </div>
              )}
              <div style={{
                fontSize: 10, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap',
              }}>
                {chip.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
