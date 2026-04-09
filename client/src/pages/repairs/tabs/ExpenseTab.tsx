// client/src/pages/repairs/tabs/ExpenseTab.tsx
import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import type { RepairFinancials } from '../types';
import { getRepairFinancials } from '../../../api/repairs';
import './ExpenseTab.css';

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

  if (loading) return <div className="exp-loading"><Spin /></div>;
  if (!fin) return <div className="exp-unavailable">Financial data unavailable</div>;

  const expenseRows = [
    { label: 'Labor',             value: fin.labor },
    { label: 'Inventory / Parts', value: fin.inventory },
    { label: 'Shipping',          value: fin.shipping },
    { label: 'Outsource',         value: fin.outsource },
    { label: 'Commission',        value: fin.commission },
    { label: 'GPO',               value: fin.gpo },
  ];

  return (
    <div className="exp-root">

      {/* Expenses */}
      <div className="exp-panel">
        <div className="exp-panel-head">Expenses</div>
        <div className="exp-panel-body">
          {expenseRows.map(({ label, value }) => (
            <div key={label} className="exp-row">
              <span className="exp-row-label">{label}</span>
              <span className="exp-row-value">{fmt(value ?? 0)}</span>
            </div>
          ))}
          <div className="exp-row-total">
            <span className="exp-row-total-label">Total Expense</span>
            <span className="exp-row-total-value">{fmt(fin.totalExpenses ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="exp-panel">
        <div className="exp-panel-head">Revenue</div>
        <div className="exp-panel-body">
          <div className="exp-row">
            <span className="exp-row-label">Customer Charges</span>
            <span className="exp-row-value">{fmt(fin.saleAmount ?? 0)}</span>
          </div>
          <div className="exp-row">
            <span className="exp-row-label">Tax</span>
            <span className="exp-row-value">{fmt(fin.tax ?? 0)}</span>
          </div>
          <div className="exp-row-total">
            <span className="exp-row-total-label">Total Revenue</span>
            <span className="exp-row-total-value">{fmt(fin.invoiceTotal ?? 0)}</span>
          </div>

          <div className="exp-margin-section">
            <div className="exp-margin-label">Repair Margin</div>
            <div className="exp-margin-row">
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: (fin.marginPct ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {(fin.marginPct ?? 0).toFixed(1)}%
              </div>
              <div className="exp-margin-suffix">
                ({fmt((fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0))})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual margin card */}
      <div className="exp-navy-card">
        <div className="exp-navy-label">Repair Margin</div>
        <div style={{
          fontSize: 42, fontWeight: 900, lineHeight: 1,
          color: (fin.marginPct ?? 0) >= 0 ? 'var(--stat-green)' : 'var(--stat-red)',
        }}>
          {(fin.marginPct ?? 0).toFixed(1)}%
        </div>
        <div className="exp-navy-detail-row">
          <div className="exp-navy-detail-item">Revenue: {fmt(fin.invoiceTotal ?? 0)}</div>
          <div className="exp-navy-detail-item">Expense: {fmt(fin.totalExpenses ?? 0)}</div>
          <div className="exp-navy-detail-item">
            Profit: <span style={{
              color: (fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0) >= 0 ? 'var(--stat-green)' : 'var(--stat-red)',
              fontWeight: 700,
            }}>
              {fmt((fin.invoiceTotal ?? 0) - (fin.totalExpenses ?? 0))}
            </span>
          </div>
        </div>
        <div className="exp-navy-formula">
          (Revenue − Expense) ÷ Revenue
        </div>
      </div>
    </div>
  );
};
