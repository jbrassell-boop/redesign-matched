import { Skeleton } from 'antd';
import type { DepartmentFull, DeptKpis } from './types';

interface DeptKpiStripProps {
  dept: DepartmentFull;
  kpis: DeptKpis | null;
  loading?: boolean;
}

interface KpiChip {
  id: string;
  label: string;
  value: string;
  color: 'navy' | 'blue' | 'green' | 'red' | 'amber';
}

const colorMap = {
  navy:  { bg: 'rgba(var(--navy-rgb), 0.08)',   dot: 'var(--navy)',    text: 'var(--navy)' },
  blue:  { bg: 'rgba(var(--primary-rgb), 0.08)', dot: 'var(--primary)', text: 'var(--primary)' },
  green: { bg: 'rgba(var(--success-rgb), 0.08)', dot: 'var(--success)', text: 'var(--success)' },
  red:   { bg: 'rgba(var(--danger-rgb), 0.08)',  dot: 'var(--danger)',  text: 'var(--danger)' },
  amber: { bg: 'rgba(var(--amber-rgb), 0.08)',   dot: 'var(--amber)',   text: 'var(--amber)' },
};

export const DeptKpiStrip = ({ dept, kpis, loading }: DeptKpiStripProps) => {
  const chips: KpiChip[] = [
    { id: 'status', label: 'STATUS', value: dept.isActive ? 'Active' : 'Inactive', color: dept.isActive ? 'green' : 'red' },
    { id: 'client', label: 'CLIENT', value: dept.clientName || '\u2014', color: 'navy' },
    { id: 'scopes', label: 'SCOPES', value: dept.scopeCount.toString(), color: 'navy' },
    { id: 'openRepairs', label: 'OPEN REPAIRS', value: dept.openRepairs.toString(), color: 'amber' },
    { id: 'avgTat', label: 'AVG TAT', value: kpis ? `${kpis.avgTat.toFixed(1)} days` : '\u2014', color: 'blue' },
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
