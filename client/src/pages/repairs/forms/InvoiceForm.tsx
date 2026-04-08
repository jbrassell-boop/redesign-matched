import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

// Canonical style tokens
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

export const InvoiceForm = ({ repair, lineItems, onClose }: Props) => {
  const items = lineItems ?? [];
  const total = items.reduce((acc, i) => acc + (i.amount ?? 0), 0);

  const billCSZ = [repair.billCity, repair.billState].filter(Boolean).join(', ') + (repair.billZip ? ' ' + repair.billZip : '');

  // Show actual items, or 3 blank rows if empty
  const MIN_BLANK = 3;
  const rows: Array<RepairLineItem | null> = items.length > 0
    ? [...items, ...Array(Math.max(0, MIN_BLANK - items.length)).fill(null)]
    : Array(MIN_BLANK).fill(null);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      {/* Action bar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form" style={{ width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Envelope Window Zone */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Bill To — positioned for #10 window envelope */}
          <div style={{ width: '3.2in', minHeight: '1in', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ ...fl, color: '#999' }}>Bill To</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#111', marginTop: 4 }}>{repair.billName ?? ''}</div>
            <div style={{ fontSize: 11, color: '#333', lineHeight: 1.5, borderBottom: '1px solid #ccc', minHeight: 14 }}>{repair.billAddr1 ?? ''}</div>
            <div style={{ fontSize: 11, color: '#333', lineHeight: 1.5, borderBottom: '1px solid #ccc', minHeight: 14 }}>{repair.billAddr2 ?? ''}</div>
            <div style={{ fontSize: 11, color: '#333', lineHeight: 1.5, borderBottom: '1px solid #ccc', minHeight: 14 }}>{billCSZ}</div>
          </div>

          {/* TSI Header */}
          <div style={{ textAlign: 'right' }}>
            <img src="/logo-horizontal.jpg" alt="Total Scope Inc." style={{ height: 44, display: 'block', marginLeft: 'auto', marginBottom: 6 }} />
            <div style={{ fontSize: 9, color: '#666', lineHeight: 1.5, textAlign: 'right' }}>
              Total Scope Inc.<br />
              17 Creek Pkwy, Upper Chichester PA 19061<br />
              Phone: (610) 485-3838 &nbsp;|&nbsp; Fax: (610) 485-3839
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginTop: 6, letterSpacing: '-0.5px' }}>Invoice</div>
          </div>
        </div>

        {/* Invoice Meta Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--primary)', border: '2px solid var(--primary)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ background: '#F0F6FF', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--primary)', letterSpacing: '0.06em' }}>Invoice #</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{repair.invoiceNumber ?? '—'}</span>
          </div>
          <div style={{ background: '#fff', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--primary)', letterSpacing: '0.06em' }}>Invoice Date</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{today}</span>
          </div>
          <div style={{ background: '#fff', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--primary)', letterSpacing: '0.06em' }}>Work Order #</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{repair.wo ?? '—'}</span>
          </div>
        </div>

        {/* Reference Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Service Date</span>
            <div style={fv}>{repair.dateIn ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
            <span style={fl}>Client / Account</span>
            <div style={fv}>{repair.client ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
            <span style={fl}>Equipment / Scope Model</span>
            <div style={fv}>{repair.scopeModel ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
            <span style={fl}>Department</span>
            <div style={fv}>{repair.dept ?? ''}</div>
          </div>
        </div>

        {/* Line Items */}
        <div style={sb}>Services &amp; Items</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 2 }}>
          <thead>
            <tr>
              <th style={{ background: 'var(--navy)', color: '#fff', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase' as const, padding: '5px 8px', textAlign: 'left', letterSpacing: '0.04em', width: '70%' }}>Description</th>
              <th style={{ background: 'var(--navy)', color: '#fff', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase' as const, padding: '5px 8px', textAlign: 'right', letterSpacing: '0.04em' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                <td style={{ padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid #ddd', verticalAlign: 'middle', height: 20 }}>
                  {row?.description ?? ''}
                </td>
                <td style={{ padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid #ddd', verticalAlign: 'middle', textAlign: 'right' }}>
                  {row?.amount != null ? `$${row.amount.toFixed(2)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <table style={{ width: 260, borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderTop: '2px solid var(--primary)', background: '#F0F6FF' }}>
                <td style={{ padding: '4px 8px', fontSize: 13, fontWeight: 800, textAlign: 'right', width: 140, color: '#555' }}>Amount Due</td>
                <td style={{ padding: '4px 8px', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>
                  ${total.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Area */}
        <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
          <div style={{ flex: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 2 }}>Authorized By</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 2 }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
