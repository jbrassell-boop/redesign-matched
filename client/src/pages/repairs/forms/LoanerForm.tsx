import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const LoanerForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const clientName = repair.client ?? '';
  const addr = repair.billAddr1 ?? '';
  const city = repair.billCity ?? '';
  const state = repair.billState ?? '';
  const zip = repair.billZip ?? '';
  const stateZip = [state, zip].filter(Boolean).join(' ');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: '#fff', fontFamily: "'Inter', Arial, sans-serif", fontSize: '10.5px', color: '#111' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#666', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.45in', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <img src="/logo-color.jpg" alt="TSI Logo" style={{ height: 42 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1B3A5C' }}>Loaner Agreement</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM17-1</div>
            </div>
          </div>

          {/* Section 1: Equipment Details */}
          <Bar>1. Loaner Equipment Details</Bar>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr>
                <th style={thS}>Description / Model</th>
                <th style={{ ...thS, width: 110 }}>Serial Number</th>
                <th style={{ ...thS, width: 60 }}>Qty</th>
                <th style={{ ...thS, width: 90 }}>Date Out</th>
                <th style={{ ...thS, width: 90, borderRight: 'none' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={i % 2 === 1 ? { background: '#F9FAFB' } : undefined}>
                  <td style={{ padding: '4px 7px', fontSize: 10, borderBottom: '1px solid #ddd', minHeight: 18 }}>&nbsp;</td>
                  <td style={{ padding: '4px 7px', fontSize: 10, borderBottom: '1px solid #ddd' }}>&nbsp;</td>
                  <td style={{ padding: '4px 7px', fontSize: 10, borderBottom: '1px solid #ddd' }}>&nbsp;</td>
                  <td style={{ padding: '4px 7px', fontSize: 10, borderBottom: '1px solid #ddd' }}>&nbsp;</td>
                  <td style={{ padding: '4px 7px', fontSize: 10, borderBottom: '1px solid #ddd' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Section 2: Loan Term */}
          <Bar style={{ marginTop: 6 }}>2. Loan Term &amp; Late Fee Policy</Bar>
          <div>
            <div style={{ background: '#FEF9E7', border: '1.5px solid #F59E0B', borderRadius: 3, padding: '5px 10px', fontSize: '9.5px', fontWeight: 700, color: '#92400E', margin: '3px 0' }}>
              Return deadline: 5 business days from delivery. Late fee: $200.00 per day after due date.
            </div>
            <div style={{ fontSize: '9.5px', color: '#333', lineHeight: 1.5, padding: '6px 10px', background: '#F9FAFB', border: '1px solid #eee', borderRadius: 3 }}>
              Equipment is loaned on a temporary basis and must be returned to Total Scope Inc. (TSI) within <strong>five (5) business days</strong> of the agreed return date or such date as specified above. In the event that loaned equipment is not returned by the specified date, borrower agrees to pay a <strong>late fee of $200.00 per calendar day</strong> until the equipment is returned in full. This fee will be invoiced and is due upon receipt. TSI reserves the right to retrieve loaner equipment at borrower's expense if not returned within 10 business days of due date.
            </div>
          </div>

          {/* Section 3: Use, Care & Liability */}
          <Bar style={{ marginTop: 6 }}>3. Use, Care &amp; Liability</Bar>
          <div style={{ fontSize: '9.5px', color: '#333', lineHeight: 1.5, padding: '6px 10px', background: '#F9FAFB', border: '1px solid #eee', borderRadius: 3 }}>
            Borrower agrees to use the loaned equipment <strong>solely for its intended clinical purpose</strong> and only by trained, qualified personnel. Borrower assumes full responsibility for the equipment during the loan period, including loss, damage, or theft. Equipment must be cleaned and high-level disinfected prior to return in accordance with the manufacturer's instructions. <strong>Borrower is responsible for any damage beyond normal wear and tear.</strong> TSI will assess equipment upon return; any repair costs resulting from misuse or damage will be invoiced to the borrower. TSI makes no warranties regarding the fitness of loaned equipment for any particular purpose beyond its intended design.
          </div>

          {/* Section 4: Indemnification */}
          <Bar style={{ marginTop: 6 }}>4. Indemnification &amp; Governing Law</Bar>
          <div style={{ fontSize: '9.5px', color: '#333', lineHeight: 1.5, padding: '6px 10px', background: '#F9FAFB', border: '1px solid #eee', borderRadius: 3 }}>
            Borrower agrees to indemnify, defend, and hold harmless Total Scope Inc., its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to borrower's use, possession, or handling of the loaned equipment. This Agreement shall be governed by and construed in accordance with the laws of the <strong>Commonwealth of Pennsylvania</strong>, without regard to its conflict of laws principles. Any disputes arising under this Agreement shall be resolved in the courts of Delaware County, Pennsylvania.
          </div>

          {/* Section 5: Borrower Information */}
          <Bar style={{ marginTop: 6 }}>5. Borrower Information &amp; Authorization</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', marginTop: 5 }}>
            <Fld label="Facility / Organization" value={clientName} span2 />
            <Fld label="Date" value={today} />
            <Fld label="Department" value={repair.dept} span2 />
            <Fld label="PO # (if required)" value={repair.purchaseOrder} />
            <Fld label="Street Address" value={addr} />
            <Fld label="City" value={city} />
            <Fld label="State / Zip" value={stateZip} />
            <Fld label="Phone" value="" />
            <Fld label="Email" value={repair.billEmail} />
            <Fld label="Fax" value="" />
          </div>

          <div style={{ marginTop: 6, fontSize: '9.5px', color: '#444', padding: '5px 10px', background: '#F9FAFB', border: '1px solid #eee', borderRadius: 3 }}>
            By signing below, borrower acknowledges that they have read, understood, and agree to all terms and conditions set forth in this Loaner Agreement, including the $200/day late fee policy and the indemnification provisions above.
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <Sig label="Borrower Authorized Signature" />
            <Sig label="Printed Name" width={160} />
            <Sig label="Title" width={120} />
            <Sig label="Date" width={100} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Sig label="TSI Representative Signature" />
            <Sig label="Printed Name" width={160} />
            <Sig label="Date" width={220} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
            <span>ISO 13485 Certified</span>
            <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM17-1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Primitives ── */
const fl: React.CSSProperties = { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em' };
const thS: React.CSSProperties = { background: '#2E75B6', color: '#fff', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '4px 7px', textAlign: 'left', letterSpacing: '.04em', borderRight: '1px solid rgba(255,255,255,.2)' };

const Bar = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: '#2E75B6', color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px', ...style }}>{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom: '1px solid #999', minHeight: 16, fontSize: '10.5px', padding: '1px 2px' }}>{value || ''}</div>
  </div>
);

const Sig = ({ label, width }: { label: string; width?: number }) => (
  <div style={{ flex: width ? undefined : 1, maxWidth: width, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #999', minHeight: 28 }} />
    <div style={{ fontSize: 8, color: '#555', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
