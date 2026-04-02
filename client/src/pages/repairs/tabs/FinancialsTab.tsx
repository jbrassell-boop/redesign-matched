import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getRepairFinancials } from '../../../api/repairs';
import type { RepairFinancials } from '../types';

const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const Row = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 11, fontWeight: bold ? 700 : 600, color: 'var(--label)' }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: color ?? 'var(--navy)' }}>{value}</span>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
    <div style={{ background: 'var(--neutral-50)', color: 'var(--navy)', padding: '7px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>
      {title}
    </div>
    {children}
  </div>
);

export const FinancialsTab = ({ repairKey }: { repairKey: number }) => {
  const [data, setData] = useState<RepairFinancials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairFinancials(repairKey)
      .then(setData)
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
  if (!data) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No financial data available</div>;

  const marginColor = data.marginPct >= 30 ? 'var(--success)' : data.marginPct >= 15 ? 'var(--amber)' : 'var(--danger)';

  return (
    <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div>
        <Section title="Revenue">
          <Row label="Sale Amount" value={fmt(data.saleAmount)} />
          <Row label="Tax" value={fmt(data.tax)} />
          <Row label="Invoice Total" value={fmt(data.invoiceTotal)} bold />
        </Section>
        <Section title="Margins">
          <Row label="Margin" value={`${data.marginPct}%`} bold color={marginColor} />
          <Row label="Contract Margin" value={data.contractMargin > 0 ? `${data.contractMargin}%` : '\u2014'} />
        </Section>
      </div>
      <div>
        <Section title="Expenses">
          <Row label="Outsource" value={fmt(data.outsource)} />
          <Row label="Shipping" value={fmt(data.shipping)} />
          <Row label="Labor" value={fmt(data.labor)} />
          <Row label="Inventory" value={fmt(data.inventory)} />
          <Row label="GPO" value={fmt(data.gpo)} />
          <Row label="Commission" value={fmt(data.commission)} />
          <Row label="Total Expenses" value={fmt(data.totalExpenses)} bold />
        </Section>
      </div>
    </div>
  );
};
