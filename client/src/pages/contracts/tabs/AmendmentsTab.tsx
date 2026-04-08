import { useState, useEffect } from 'react';
import { Spin, DatePicker, InputNumber, message } from 'antd';
import { getContractAmendments, createContractAmendment } from '../../../api/contracts';
import type { ContractAmendment, ContractDetail } from '../types';
import dayjs from 'dayjs';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingFlexStyle,
  tableContainerStyle, tableStyle, thStyle, tdStyle,
  formLabelStyle, formGridStyle, formActionsStyle,
  amendCancelBtnStyle, amendSaveBtnStyle, amendFormContainerStyle,
  closeBtnStyle, newAmendBtnStyle, fmtDate, fmtMoneyDecimal,
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

export const AmendmentsTab = ({ contractKey, detail }: Props) => {
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amendmentDate: dayjs().format('YYYY-MM-DD'),
    previousTotal: detail.totalAmount,
    newTotal: 0,
    previousInvoiceAmount: 0,
    newInvoiceAmount: 0,
    remainingMonths: detail.lengthInMonths,
  });

  const reload = () => {
    setLoading(true);
    getContractAmendments(contractKey)
      .then(setAmendments)
      .catch(() => message.error('Failed to load amendments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractAmendments(contractKey)
      .then(a => { if (!cancelled) setAmendments(a); })
      .catch(() => { if (!cancelled) message.error('Failed to load amendments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createContractAmendment(contractKey, form);
      message.success('Amendment created');
      setShowForm(false);
      reload();
    } catch {
      message.error('Failed to create amendment');
    } finally {
      setSaving(false);
    }
  };

  const amendStatusColor = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes('approv') || l.includes('active')) return 'var(--success)';
    if (l.includes('pending')) return 'var(--warning)';
    if (l.includes('reject') || l.includes('cancel')) return 'var(--danger)';
    return 'var(--muted)';
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingFlexStyle}>
      {showForm && (
        <Panel>
          <PanelHead>
            <span>New Amendment</span>
            <button onClick={() => setShowForm(false)} style={closeBtnStyle}>✕</button>
          </PanelHead>
          <div style={amendFormContainerStyle}>
            <div style={formGridStyle}>
              <div>
                <div style={formLabelStyle}>Amendment Date</div>
                <DatePicker
                  value={dayjs(form.amendmentDate)}
                  onChange={(d) => d && setForm(f => ({ ...f, amendmentDate: d.format('YYYY-MM-DD') }))}
                  style={{ width: '100%' }}
                  size="small"
                  aria-label="Amendment Date"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Remaining Months</div>
                <InputNumber
                  value={form.remainingMonths}
                  onChange={(v) => setForm(f => ({ ...f, remainingMonths: v ?? 0 }))}
                  min={0} style={{ width: '100%' }} size="small"
                  aria-label="Remaining Months"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Previous Contract Total</div>
                <InputNumber
                  value={form.previousTotal}
                  onChange={(v) => setForm(f => ({ ...f, previousTotal: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="Previous Contract Total"
                />
              </div>
              <div>
                <div style={formLabelStyle}>New Contract Total</div>
                <InputNumber
                  value={form.newTotal}
                  onChange={(v) => setForm(f => ({ ...f, newTotal: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="New Contract Total"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Previous Invoice Amount</div>
                <InputNumber
                  value={form.previousInvoiceAmount}
                  onChange={(v) => setForm(f => ({ ...f, previousInvoiceAmount: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="Previous Invoice Amount"
                />
              </div>
              <div>
                <div style={formLabelStyle}>New Invoice Amount</div>
                <InputNumber
                  value={form.newInvoiceAmount}
                  onChange={(v) => setForm(f => ({ ...f, newInvoiceAmount: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="New Invoice Amount"
                />
              </div>
            </div>
            <div style={formActionsStyle}>
              <button onClick={() => setShowForm(false)} style={amendCancelBtnStyle}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={amendSaveBtnStyle}>
                {saving ? 'Saving…' : 'Save Amendment'}
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHead>
          <span>Amendments ({amendments.length})</span>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={newAmendBtnStyle}>
              + New Amendment
            </button>
          )}
        </PanelHead>
        <div style={tableContainerStyle}>
          {amendments.length === 0 ? (
            <div style={emptyStateStyle}>No amendments for this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Prev Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>New Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Prev Invoice</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>New Invoice</th>
                  <th style={thStyle}>Rem. Months</th>
                </tr>
              </thead>
              <tbody>
                {amendments.map(a => (
                  <tr key={a.amendmentKey}>
                    <td style={tdStyle}>{fmtDate(a.amendmentDate)}</td>
                    <td style={tdStyle}><span style={{ color: amendStatusColor(a.status), fontWeight: 600 }}>{a.status}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(a.previousTotal)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{fmtMoneyDecimal(a.newTotal)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(a.previousInvoiceAmount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMoneyDecimal(a.newInvoiceAmount)}</td>
                    <td style={tdStyle}>{a.remainingMonths || '—'}</td>
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
