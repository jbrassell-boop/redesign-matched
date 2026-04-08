import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractInvoices } from '../../../api/contracts';
import type { ContractDetail, ContractInvoice } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingStyle,
  tableContainerStyle, tableStyle, miniStatCardStyle,
  thStyle, tdStyle, fmtDate, fmtMoney, fmtMoneyDecimal,
} from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    {children}
  </div>
);

interface Props {
  contractKey: number;
  detail: ContractDetail;
}

export const InvoicesTab = ({ contractKey, detail }: Props) => {
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractInvoices(contractKey)
      .then(inv => { if (!cancelled) setInvoices(inv); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract invoices'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const totalInvoiced = invoices.filter(i => i.status === 'Invoiced').reduce((sum, i) => sum + i.amount, 0);
  const countInvoiced = invoices.filter(i => i.status === 'Invoiced').length;

  return (
    <div style={tabPaddingStyle}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Installments', value: invoices.length, color: 'var(--navy)' },
          { label: 'Invoiced', value: countInvoiced, color: 'var(--success)' },
          { label: 'Amount Invoiced', value: fmtMoney(totalInvoiced), color: 'var(--primary)' },
          { label: 'Remaining', value: fmtMoney(detail.totalAmount - totalInvoiced), color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={miniStatCardStyle}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Invoices ({invoices.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {invoices.length === 0 ? (
            <div style={emptyStateStyle}>No invoices found for this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.installmentKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{inv.invoiceNumber || '—'}</td>
                    <td style={tdStyle}>{fmtDate(inv.dateCreated)}</td>
                    <td style={tdStyle}>{fmtDate(inv.dateDue)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoneyDecimal(inv.amount)}</td>
                    <td style={tdStyle}>
                      <span style={{ color: inv.status === 'Invoiced' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};
