import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems: RepairLineItem[];
  onClose: () => void;
}

// ── Styles matching OM07-2 exactly ──
const sectionBar: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '4px 10px',
  marginTop: 8,
};

const fl: React.CSSProperties = {
  fontSize: 8.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#555',
  letterSpacing: '0.04em',
};

const fv: React.CSSProperties = {
  borderBottom: '1px solid #999',
  minHeight: 18,
  fontSize: 11,
  padding: '1px 2px',
};

const ynBox: React.CSSProperties = {
  display: 'inline-block',
  width: 18,
  height: 14,
  border: '1px solid #999',
  borderRadius: 2,
  textAlign: 'center',
  lineHeight: '14px',
  margin: '0 2px',
  fontSize: 9,
  fontWeight: 700,
};

export const RequisitionForm = ({ repair, lineItems, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const subtotal = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);

  // Bill To
  const billName = repair.billName ?? repair.client ?? '';
  const billAddr = repair.billAddr1 ?? '';
  const billCityState = [repair.billCity, repair.billState].filter(Boolean).join(', ');
  const billCSZ = billCityState + (repair.billZip ? ' ' + repair.billZip : '');
  const billLine = [billName, billAddr, billCSZ].filter(Boolean).join(', ');

  // Ship To
  const shipName = repair.shipName ?? repair.client ?? '';
  const shipAddr = repair.shipAddr1 ?? '';
  const shipCityState = [repair.shipCity, repair.shipState].filter(Boolean).join(', ');
  const shipCSZ = shipCityState + (repair.shipZip ? ' ' + repair.shipZip : '');
  const shipLine = [shipName, shipAddr, shipCSZ].filter(Boolean).join(', ');

  // Pad to at least 6 rows, up to 8 blank rows if no items
  const MIN_ROWS = 6;
  const MAX_ROWS = 8;
  const displayRows: Array<{ problem: string; description: string } | null> =
    lineItems.length > 0
      ? [
          ...lineItems.map(li => ({ problem: li.itemCode ?? '', description: li.description ?? '' })),
          ...Array(Math.max(0, MIN_ROWS - lineItems.length)).fill(null),
        ]
      : Array(MAX_ROWS).fill(null);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      {/* Action bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
            background: 'var(--primary)', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Print</button>
        <button
          onClick={onClose}
          style={{
            height: 32, padding: '0 14px', border: '1px solid #ccc', borderRadius: 5,
            background: 'var(--card)', color: '#555',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Close</button>
      </div>

      {/* Printable page */}
      <div
        className="print-form"
        style={{
          width: '8.5in',
          minHeight: '11in',
          background: 'var(--card)',
          padding: '0.5in',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontFamily: "'Inter', Arial, sans-serif",
          fontSize: 11,
          color: '#111',
          boxSizing: 'border-box',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* ── Form Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>
            <span style={{ color: 'var(--primary)' }}>T</span>otal <span style={{ color: 'var(--primary)' }}>S</span>cope <span style={{ color: 'var(--primary)' }}>I</span>nc.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Requisition for Approval</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM07-2 (12/2020)</div>
          </div>
        </div>

        {/* ── Repair Information ── */}
        <div style={{ ...sectionBar, marginTop: 0 }}>Repair Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', padding: '8px 0 4px' }}>
          {/* To (Customer) — span 2 */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>To (Customer)</span>
            <div style={fv}>{repair.client ?? ''}</div>
          </div>
          {/* Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>

          {/* Bill To — span 2 */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Bill To</span>
            <div style={fv}>{billLine}</div>
          </div>
          {/* Work Order # */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? ''}</div>
          </div>

          {/* Ship To — span 2 */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Ship To</span>
            <div style={fv}>{shipLine}</div>
          </div>
          {/* PO # */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>PO #</span>
            <div style={fv}>{repair.purchaseOrder ?? ''}</div>
          </div>

          {/* Scope / Equipment — span 2 */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Scope / Equipment</span>
            <div style={fv}>{repair.scopeModel ?? repair.scopeType ?? ''}</div>
          </div>
          {/* Serial # */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? ''}</div>
          </div>

          {/* Complaint — span 2, no third column */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Complaint / Reason for Repair</span>
            <div style={{ ...fv, minHeight: 28 }}>{repair.complaint ?? ''}</div>
          </div>
        </div>

        {/* ── Repair Items ── */}
        <div style={sectionBar}>Repair Items — Customer Authorization Required</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
          <thead>
            <tr>
              <th style={{
                background: 'var(--primary)', color: '#fff', fontSize: 8.5, fontWeight: 700,
                textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left',
                letterSpacing: '0.04em', width: '40%',
              }}>Problem / Item</th>
              <th style={{
                background: 'var(--primary)', color: '#fff', fontSize: 8.5, fontWeight: 700,
                textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left',
                letterSpacing: '0.04em',
              }}>Description of Work</th>
              <th style={{
                background: 'var(--primary)', color: '#fff', fontSize: 8.5, fontWeight: 700,
                textTransform: 'uppercase', padding: '5px 8px', textAlign: 'center',
                letterSpacing: '0.04em', width: 60,
              }}>Approve<br /><span style={{ fontSize: 7, fontWeight: 400 }}>Y / N</span></th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                <td style={{ padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid #ddd', verticalAlign: 'middle', minHeight: 22 }}>
                  {row?.problem ?? ''}
                </td>
                <td style={{ padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid #ddd', verticalAlign: 'middle' }}>
                  {row?.description ?? ''}
                </td>
                <td style={{ padding: '5px 8px', fontSize: 10, borderBottom: '1px solid #ddd', verticalAlign: 'middle', textAlign: 'center', color: '#555' }}>
                  <span style={ynBox}>Y</span>
                  <span style={ynBox}>N</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ width: 260, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', color: '#555', fontWeight: 600, textAlign: 'right', width: 140 }}>Subtotal</td>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700, borderBottomColor: '#999' }}>
                  {subtotal > 0 ? '$' + subtotal.toFixed(2) : '$'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', color: '#555', fontWeight: 600, textAlign: 'right' }}>Shipping</td>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700, borderBottomColor: '#999' }}>$</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', color: '#555', fontWeight: 600, textAlign: 'right' }}>Tax</td>
                <td style={{ padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700, borderBottomColor: '#999' }}>$</td>
              </tr>
              <tr style={{ fontSize: 12, fontWeight: 800, borderTop: '2px solid var(--primary)', background: '#F0F6FF' }}>
                <td style={{ padding: '3px 8px', color: '#555', fontWeight: 600, textAlign: 'right' }}>Total</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 800, fontSize: 12 }}>$</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{
          marginTop: 10, fontSize: 8.5, color: '#555', lineHeight: 1.4,
          padding: '6px 10px', background: 'var(--bg)', border: '1px solid #ddd', borderRadius: 3,
        }}>
          By signing below, customer authorizes Total Scope Inc. (TSI) to proceed with the approved repair items listed above.
          Items marked "N" will not be repaired and will be returned as-is. TSI's standard Terms &amp; Conditions apply.
          Payment is due net 30 days from invoice date. Unapproved items returned to customer at customer's expense.
          TSI is not responsible for damage to equipment during transit when customer-arranged shipping is used.
        </div>

        {/* ── Customer Authorization ── */}
        <div style={{ ...sectionBar, marginTop: 10 }}>Customer Authorization</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 32 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Authorized Signature</div>
          </div>
          <div style={{ flex: 1, maxWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 32 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Printed Name</div>
          </div>
          <div style={{ flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 32 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Title</div>
          </div>
          <div style={{ flex: 1, maxWidth: 110, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 32 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Date</div>
          </div>
        </div>

        {/* ── Form Footer ── */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 8,
          color: '#888',
        }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc.&nbsp;|&nbsp;17 Creek Pkwy, Upper Chichester PA 19061&nbsp;|&nbsp;(610) 485-3838</span>
          <span>OM07-2 (12/2020)</span>
        </div>
      </div>
    </div>
  );
};
