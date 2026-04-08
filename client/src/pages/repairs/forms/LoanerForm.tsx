import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Canonical template styles (OM17-1) ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

export const LoanerForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const clientName = repair.client ?? '';
  const addr = repair.billAddr1 ?? '';
  const city = repair.billCity ?? '';
  const state = repair.billState ?? '';
  const zip = repair.billZip ?? '';
  const stateZip = [state, zip].filter(Boolean).join(' ');

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
      <div className="print-form" style={{ width: '8.5in', height: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Loaner Agreement</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Equipment Loan Authorization</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM17-1</div>
          </div>
        </div>

        {/* Section 1: Equipment Details */}
        <div style={sb}>1. Loaner Equipment Details</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: g }}>
          <thead>
            <tr>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left' }}>Description / Model</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left', width: 110 }}>Serial Number</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 50 }}>Qty</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left', width: 80 }}>Date Out</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left', width: 80 }}>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 2: Loan Term & Late Fee Policy */}
        <div style={sb}>2. Loan Term &amp; Late Fee Policy</div>
        <div style={{ marginTop: 4, marginBottom: g }}>
          <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 3, padding: '5px 10px', fontSize: 8.5, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
            Return deadline: 5 business days from delivery. Late fee: $200.00 per day after due date.
          </div>
          <div style={{ fontSize: 8.5, color: '#444', lineHeight: 1.5, padding: '6px 10px', background: '#f8f9fb', border: '1px solid #eee', borderRadius: 3 }}>
            Equipment is loaned on a temporary basis and must be returned to Total Scope Inc. (TSI) within <strong>five (5) business days</strong> of the agreed return date or such date as specified above. In the event that loaned equipment is not returned by the specified date, borrower agrees to pay a <strong>late fee of $200.00 per calendar day</strong> until the equipment is returned in full. This fee will be invoiced and is due upon receipt. TSI reserves the right to retrieve loaner equipment at borrower's expense if not returned within 10 business days of due date.
          </div>
        </div>

        {/* Section 3: Use, Care & Liability */}
        <div style={sb}>3. Use, Care &amp; Liability</div>
        <div style={{ fontSize: 8.5, color: '#444', lineHeight: 1.5, padding: '6px 10px', background: '#f8f9fb', border: '1px solid #eee', borderRadius: 3, marginTop: 4, marginBottom: g }}>
          Borrower agrees to use the loaned equipment <strong>solely for its intended clinical purpose</strong> and only by trained, qualified personnel. Borrower assumes full responsibility for the equipment during the loan period, including loss, damage, or theft. Equipment must be cleaned and high-level disinfected prior to return in accordance with the manufacturer's instructions. <strong>Borrower is responsible for any damage beyond normal wear and tear.</strong> TSI will assess equipment upon return; any repair costs resulting from misuse or damage will be invoiced to the borrower. TSI makes no warranties regarding the fitness of loaned equipment for any particular purpose beyond its intended design.
        </div>

        {/* Section 4: Indemnification */}
        <div style={sb}>4. Indemnification &amp; Governing Law</div>
        <div style={{ fontSize: 8.5, color: '#444', lineHeight: 1.5, padding: '6px 10px', background: '#f8f9fb', border: '1px solid #eee', borderRadius: 3, marginTop: 4, marginBottom: g }}>
          Borrower agrees to indemnify, defend, and hold harmless Total Scope Inc., its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to borrower's use, possession, or handling of the loaned equipment. This Agreement shall be governed by and construed in accordance with the laws of the <strong>Commonwealth of Pennsylvania</strong>, without regard to its conflict of laws principles. Any disputes arising under this Agreement shall be resolved in the courts of Delaware County, Pennsylvania.
        </div>

        {/* Section 5: Borrower Information */}
        <div style={sb}>5. Borrower Information &amp; Authorization</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0', marginBottom: g }}>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Facility / Organization</span>
            <div style={fv}>{clientName || em}</div>
          </div>
          <div>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Department</span>
            <div style={fv}>{repair.dept ?? em}</div>
          </div>
          <div>
            <span style={fl}>PO # (if required)</span>
            <div style={fv}>{repair.purchaseOrder ?? em}</div>
          </div>
          <div>
            <span style={fl}>Street Address</span>
            <div style={fv}>{addr || em}</div>
          </div>
          <div>
            <span style={fl}>City</span>
            <div style={fv}>{city || em}</div>
          </div>
          <div>
            <span style={fl}>State / Zip</span>
            <div style={fv}>{stateZip || em}</div>
          </div>
          <div>
            <span style={fl}>Phone</span>
            <div style={fv}>&nbsp;</div>
          </div>
          <div>
            <span style={fl}>Email</span>
            <div style={fv}>{repair.billEmail ?? em}</div>
          </div>
          <div>
            <span style={fl}>Fax</span>
            <div style={fv}>&nbsp;</div>
          </div>
        </div>

        {/* Acknowledgment */}
        <div style={{ marginBottom: g, fontSize: 8.5, color: '#666', padding: '5px 10px', background: '#f8f9fb', border: '1px solid #eee', borderRadius: 3 }}>
          By signing below, borrower acknowledges that they have read, understood, and agree to all terms and conditions set forth in this Loaner Agreement, including the $200/day late fee policy and the indemnification provisions above.
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Borrower Authorized Signature</div>
          </div>
          <div style={{ maxWidth: 160, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Printed Name</div>
          </div>
          <div style={{ maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Title</div>
          </div>
          <div style={{ maxWidth: 100, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>TSI Representative Signature</div>
          </div>
          <div style={{ maxWidth: 160, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Printed Name</div>
          </div>
          <div style={{ maxWidth: 220, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM17-1</span></div>
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
