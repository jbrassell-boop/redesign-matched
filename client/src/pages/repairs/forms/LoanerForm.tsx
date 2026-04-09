import './print.css';
import './LoanerForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

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
      className="lf-overlay"
    >
      {/* Action bar */}
      <div className="no-print lf-action-bar">
        <button onClick={() => window.print()} className="lf-btn-print">Print</button>
        <button onClick={onClose} className="lf-btn-close">Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form lf-page">

        {/* Header */}
        <div className="lf-header" style={{ marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="lf-logo" />
          <div className="lf-title-block">
            <div className="lf-title">Loaner Agreement</div>
            <div className="lf-subtitle">Equipment Loan Authorization</div>
            <div className="lf-doc-num">OM17-1</div>
          </div>
        </div>

        {/* Section 1: Equipment Details */}
        <div className="lf-sb">1. Loaner Equipment Details</div>
        <table className="lf-eq-table">
          <thead>
            <tr>
              <th className="lf-th">Description / Model</th>
              <th className="lf-th" style={{ width: 110 }}>Serial Number</th>
              <th className="lf-th--center" style={{ width: 50 }}>Qty</th>
              <th className="lf-th" style={{ width: 80 }}>Date Out</th>
              <th className="lf-th" style={{ width: 80 }}>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                <td className="lf-td">&nbsp;</td>
                <td className="lf-td">&nbsp;</td>
                <td className="lf-td--center">&nbsp;</td>
                <td className="lf-td">&nbsp;</td>
                <td className="lf-td">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 2: Loan Term & Late Fee Policy */}
        <div className="lf-sb">2. Loan Term &amp; Late Fee Policy</div>
        <div className="lf-policy-wrap">
          <div className="lf-policy-warn">
            Return deadline: 5 business days from delivery. Late fee: $200.00 per day after due date.
          </div>
          <div className="lf-policy-body">
            Equipment is loaned on a temporary basis and must be returned to Total Scope Inc. (TSI) within <strong>five (5) business days</strong> of the agreed return date or such date as specified above. In the event that loaned equipment is not returned by the specified date, borrower agrees to pay a <strong>late fee of $200.00 per calendar day</strong> until the equipment is returned in full. This fee will be invoiced and is due upon receipt. TSI reserves the right to retrieve loaner equipment at borrower's expense if not returned within 10 business days of due date.
          </div>
        </div>

        {/* Section 3: Use, Care & Liability */}
        <div className="lf-sb">3. Use, Care &amp; Liability</div>
        <div className="lf-policy-body" style={{ marginTop: 4, marginBottom: g }}>
          Borrower agrees to use the loaned equipment <strong>solely for its intended clinical purpose</strong> and only by trained, qualified personnel. Borrower assumes full responsibility for the equipment during the loan period, including loss, damage, or theft. Equipment must be cleaned and high-level disinfected prior to return in accordance with the manufacturer's instructions. <strong>Borrower is responsible for any damage beyond normal wear and tear.</strong> TSI will assess equipment upon return; any repair costs resulting from misuse or damage will be invoiced to the borrower. TSI makes no warranties regarding the fitness of loaned equipment for any particular purpose beyond its intended design.
        </div>

        {/* Section 4: Indemnification */}
        <div className="lf-sb">4. Indemnification &amp; Governing Law</div>
        <div className="lf-policy-body" style={{ marginTop: 4, marginBottom: g }}>
          Borrower agrees to indemnify, defend, and hold harmless Total Scope Inc., its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to borrower's use, possession, or handling of the loaned equipment. This Agreement shall be governed by and construed in accordance with the laws of the <strong>Commonwealth of Pennsylvania</strong>, without regard to its conflict of laws principles. Any disputes arising under this Agreement shall be resolved in the courts of Delaware County, Pennsylvania.
        </div>

        {/* Section 5: Borrower Information */}
        <div className="lf-sb">5. Borrower Information &amp; Authorization</div>
        <div className="lf-info-grid">
          <div className="lf-span2">
            <span className="lf-fl">Facility / Organization</span>
            <div className="lf-fv">{clientName || em}</div>
          </div>
          <div>
            <span className="lf-fl">Date</span>
            <div className="lf-fv">{today}</div>
          </div>
          <div className="lf-span2">
            <span className="lf-fl">Department</span>
            <div className="lf-fv">{repair.dept ?? em}</div>
          </div>
          <div>
            <span className="lf-fl">PO # (if required)</span>
            <div className="lf-fv">{repair.purchaseOrder ?? em}</div>
          </div>
          <div>
            <span className="lf-fl">Street Address</span>
            <div className="lf-fv">{addr || em}</div>
          </div>
          <div>
            <span className="lf-fl">City</span>
            <div className="lf-fv">{city || em}</div>
          </div>
          <div>
            <span className="lf-fl">State / Zip</span>
            <div className="lf-fv">{stateZip || em}</div>
          </div>
          <div>
            <span className="lf-fl">Phone</span>
            <div className="lf-fv">&nbsp;</div>
          </div>
          <div>
            <span className="lf-fl">Email</span>
            <div className="lf-fv">{repair.billEmail ?? em}</div>
          </div>
          <div>
            <span className="lf-fl">Fax</span>
            <div className="lf-fv">&nbsp;</div>
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="lf-ack">
          By signing below, borrower acknowledges that they have read, understood, and agree to all terms and conditions set forth in this Loaner Agreement, including the $200/day late fee policy and the indemnification provisions above.
        </div>

        {/* Signatures — row 1 */}
        <div className="lf-sig-row">
          <div className="lf-sig-block">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Borrower Authorized Signature</div>
          </div>
          <div className="lf-sig-block--160">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Printed Name</div>
          </div>
          <div className="lf-sig-block--120">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Title</div>
          </div>
          <div className="lf-sig-block--100">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Date</div>
          </div>
        </div>

        {/* Signatures — row 2 */}
        <div className="lf-sig-row">
          <div className="lf-sig-block">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">TSI Representative Signature</div>
          </div>
          <div className="lf-sig-block--160">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Printed Name</div>
          </div>
          <div className="lf-sig-block--220">
            <div className="lf-sig-line" />
            <div className="lf-sig-label">Date</div>
          </div>
        </div>

        {/* Footer */}
        <div className="lf-footer">
          <div className="lf-footer-name">Total Scope, Inc. — ISO 13485 Certified <span className="lf-footer-doc">OM17-1</span></div>
          <div className="lf-footer-addrs">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
