import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { getDashboardInvoices } from '../../../api/dashboard';
import type { DashboardInvoiceStats } from '../../dashboard/types';

const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const OutstandingInvoices = () => {
  const [stats, setStats] = useState<DashboardInvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardInvoices({ segment: 'summary', pageSize: 1 })
      .then(r => setStats(r.stats))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;

  const rows = [
    { label: 'Total Outstanding', value: fmtMoney(stats?.totalAmount ?? 0), color: 'var(--navy)' },
    { label: 'Ready to Invoice',  value: String(stats?.readyToInvoice ?? 0), color: 'var(--warning)' },
    { label: 'Invoiced This Month', value: fmtMoney(stats?.invoicedMonth ?? 0), color: 'var(--success)' },
    { label: 'Avg Invoice',       value: fmtMoney(stats?.avgInvoice ?? 0), color: 'var(--muted)' },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', fontSize: 11, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Outstanding Invoices
      </div>
      <div style={{ padding: '8px 10px' }}>
        {rows.map(row => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: 6, marginBottom: 4,
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--label)' }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
