import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems: RepairLineItem[];
  onClose: () => void;
}

// ── Canonical template styles (OM07-2) ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

const ynBox: React.CSSProperties = {
  display: 'inline-block', width: 18, height: 14, border: '1px solid #ccc',
  borderRadius: 2, textAlign: 'center', lineHeight: '14px',
  margin: '0 2px', fontSize: 9, fontWeight: 700,
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
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      {/* Action bar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form" style={{ width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Requisition for Approval</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Customer Authorization Required</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM07-2</div>
          </div>
        </div>

        {/* Repair Information */}
        <div style={sb}>Repair Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', padding: '4px 0', marginBottom: g }}>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>To (Customer)</span>
            <div style={fv}>{repair.client ?? em}</div>
          </div>
          <div>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Bill To</span>
            <div style={fv}>{billLine || em}</div>
          </div>
          <div>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? em}</div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Ship To</span>
            <div style={fv}>{shipLine || em}</div>
          </div>
          <div>
            <span style={fl}>PO #</span>
            <div style={fv}>{repair.purchaseOrder ?? em}</div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Scope / Equipment</span>
            <div style={fv}>{repair.scopeModel ?? repair.scopeType ?? em}</div>
          </div>
          <div>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? em}</div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Complaint / Reason for Repair</span>
            <div style={{ ...fv, minHeight: 20 }}>{repair.complaint ?? em}</div>
          </div>
        </div>

        {/* Repair Items */}
        <div style={sb}>Repair Items — Customer Authorization Required</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: g }}>
          <thead>
            <tr>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left', width: '38%' }}>Problem / Item</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left' }}>Description of Work</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 60 }}>Approve<br /><span style={{ fontSize: 6.5, fontWeight: 400 }}>Y / N</span></th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                <td style={{ padding: '3px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>
                  {row?.problem ?? ''}
                </td>
                <td style={{ padding: '3px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>
                  {row?.description ?? ''}
                </td>
                <td style={{ padding: '3px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }}>
                  <span style={ynBox}>Y</span>
                  <span style={ynBox}>N</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: g }}>
          <table style={{ width: 260, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #eee', color: '#888', fontWeight: 600, textAlign: 'right', width: 140 }}>Subtotal</td>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>
                  {subtotal > 0 ? '$' + subtotal.toFixed(2) : '$'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #eee', color: '#888', fontWeight: 600, textAlign: 'right' }}>Shipping</td>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>$</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #eee', color: '#888', fontWeight: 600, textAlign: 'right' }}>Tax</td>
                <td style={{ padding: '2px 6px', fontSize: 8.5, borderBottom: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>$</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--primary)', background: '#f0f4fc' }}>
                <td style={{ padding: '2px 6px', color: '#888', fontWeight: 600, textAlign: 'right', fontSize: 9 }}>Total</td>
                <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 800, fontSize: 10 }}>$</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 7.5, color: '#888', lineHeight: 1.4, padding: '5px 8px', background: '#f8f9fb', border: '1px solid #eee', borderRadius: 3, marginBottom: g }}>
          By signing below, customer authorizes Total Scope Inc. (TSI) to proceed with the approved repair items listed above.
          Items marked "N" will not be repaired and will be returned as-is. TSI's standard Terms &amp; Conditions apply.
          Payment is due net 30 days from invoice date. Unapproved items returned to customer at customer's expense.
          TSI is not responsible for damage to equipment during transit when customer-arranged shipping is used.
        </div>

        {/* Customer Authorization */}
        <div style={sb}>Customer Authorization</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Authorized Signature</div>
          </div>
          <div style={{ flex: 1, maxWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Printed Name</div>
          </div>
          <div style={{ flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Title</div>
          </div>
          <div style={{ flex: 1, maxWidth: 110, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 28 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM07-2</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 6.5, color: '#aaa' }}>
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
