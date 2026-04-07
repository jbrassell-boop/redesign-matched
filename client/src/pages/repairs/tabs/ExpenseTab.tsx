// client/src/pages/repairs/tabs/ExpenseTab.tsx
import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import type { RepairFinancials } from '../types';
import { getRepairFinancials } from '../../../api/repairs';

interface ExpenseTabProps {
  repairKey: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ExpenseTab = ({ repairKey }: ExpenseTabProps) => {
  const [fin, setFin] = useState<RepairFinancials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairFinancials(repairKey)
      .then(setFin)
      .catch(() => { message.error('Failed to load repair financials'); })
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!fin) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Financial data unavailable</div>;

  const expenseRows = [
    { label: 'Labor',             value: fin.labor },
    { label: 'Inventory / Parts', value: fin.inventory },
    { label: 'Shipping',          value: fin.shipping },
    { label: 'Outsource',         value: fin.outsource },
    { label: 'Commission',        value: fin.commission },
    { label: 'GPO',               value: fin.gpo },
  ];

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    padding: '5px 0', borderBottom: '1px solid var(--border)',
    fontSize: 11,
  };

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

      {/* Expenses */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50, var(--bg))', padding: '6px 10px',
          fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
          textTransform: 'uppercase', letterSpacing: '.05em',
          borderBottom: '1px solid var(--border)',
        }}>
          Expenses
        </div>
        <div style={{ padding: 10 }}>
          {expenseRows.map(({ label, value }) => (
            <div key={label} style={rowStyle}>
              <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(value ?? 0)}</span>
            </div>
          ))}
          <div style={{ ...rowStyle, borderBottom: '2px solid var(--navy)', paddingTop: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>Total Expense</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(fin.totalExpenses ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50, var(--bg))', padding: '6px 10px',
          fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
          textTransform: 'uppercase', letterSpacing: '.05em',
          borderBottom: '1px solid var(--border)',
        }}>
          Revenue
        </div>
        <div style={{ padding: 10 }}>
          <div style={rowStyle}>
            <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Customer Charges</span>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(fin.saleAmount ?? 0)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Tax</span>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(fin.tax ?? 0)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: '2px solid var(--navy)', paddingTop: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>Total Revenue</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(fin.invoiceTotal ?? 0)}</span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Repair Margin
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: (fin.marginPct ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {(fin.marginPct ?? 0).toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
                ({fmt((fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0))})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual margin card */}
      <div style={{
        background: 'var(--navy)', color: '#fff',
        borderRadius: 6, padding: 16,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        gap: 4, minHeight: 200,
      }}>
        <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>
          Repair Margin
        </div>
        <div style={{
          fontSize: 42, fontWeight: 900, lineHeight: 1,
          color: (fin.marginPct ?? 0) >= 0 ? '#4ade80' : '#f87171',
        }}>
          {(fin.marginPct ?? 0).toFixed(1)}%
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          <div style={{ fontSize: 11, opacity: .7 }}>Revenue: {fmt(fin.invoiceTotal ?? 0)}</div>
          <div style={{ fontSize: 11, opacity: .7 }}>Expense: {fmt(fin.totalExpenses ?? 0)}</div>
          <div style={{ fontSize: 11, opacity: .7 }}>
            Profit: <span style={{
              color: (fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0) >= 0 ? '#4ade80' : '#f87171',
              fontWeight: 700,
            }}>
              {fmt((fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0))}
            </span>
          </div>
        </div>
        <div style={{
          marginTop: 10, padding: '5px 10px',
          background: 'rgba(255,255,255,.08)', borderRadius: 4,
          fontSize: 10, opacity: .7, textAlign: 'center',
        }}>
          (Revenue − Expense) ÷ Revenue
        </div>
      </div>
    </div>
  );
};
