import './ReturnVerificationForm.css';
import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// Canonical field tokens (used as className references — see ReturnVerificationForm.css)
const em = '—';

export const ReturnVerificationForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // Bill To
  const clientName = repair.client ?? '';
  const billAddr = repair.billAddr1 ?? '';
  const billCity = repair.billCity ?? '';
  const billState = repair.billState ?? '';
  const billZip = repair.billZip ?? '';
  const billCSZ = [billCity, billState].filter(Boolean).join(', ') + (billZip ? ' ' + billZip : '');

  // Ship To — prefer ship fields, fall back to bill
  const shipName = repair.shipName ?? repair.client ?? '';
  const shipAddr = repair.shipAddr1 ?? repair.billAddr1 ?? '';
  const shipCity = repair.shipCity ?? repair.billCity ?? '';
  const shipState = repair.shipState ?? repair.billState ?? '';
  const shipZip = repair.shipZip ?? repair.billZip ?? '';
  const shipCSZ = [shipCity, shipState].filter(Boolean).join(', ') + (shipZip ? ' ' + shipZip : '');

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="rv-overlay"
    >
      {/* Action bar */}
      <div className="no-print rv-action-bar">
        <button onClick={() => window.print()} className="rv-btn-print">Print</button>
        <button onClick={onClose} className="rv-btn-close">Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form rv-page">

        {/* Header */}
        <div className="rv-header">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="rv-logo" />
          <div className="rv-title-block">
            <div className="rv-title-h">Scope Return Verification</div>
            <div className="rv-title-sub">Return Shipment Documentation</div>
            <div className="rv-title-doc">OM14-1</div>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="rv-addr-grid">
          {/* Bill To */}
          <div className="rv-addr-box">
            <div className="rv-addr-label">Bill To</div>
            <div className={`rv-fv rv-fv--mb`}>{clientName || em}</div>
            <div className={`rv-fv rv-fv--mb`}>{billAddr || em}</div>
            <div className="rv-fv">{billCSZ || em}</div>
          </div>
          {/* Ship To */}
          <div className="rv-addr-box">
            <div className="rv-addr-label">Ship To</div>
            <div className={`rv-fv rv-fv--mb`}>{shipName || em}</div>
            <div className={`rv-fv rv-fv--mb`}>{shipAddr || em}</div>
            <div className="rv-fv">{shipCSZ || em}</div>
          </div>
        </div>

        {/* Shipment Reference */}
        <div className="rv-sb">Shipment Reference</div>
        <div className="rv-ref-grid">
          <div>
            <span className="rv-fl">Date</span>
            <div className="rv-fv">{today}</div>
          </div>
          <div>
            <span className="rv-fl">Work Order #</span>
            <div className="rv-fv">{repair.wo ?? em}</div>
          </div>
          <div>
            <span className="rv-fl">PO #</span>
            <div className="rv-fv">{repair.purchaseOrder ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span className="rv-fl">Scope / Equipment Model</span>
            <div className="rv-fv">{[repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em}</div>
          </div>
          <div>
            <span className="rv-fl">Serial #</span>
            <div className="rv-fv">{repair.serial ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span className="rv-fl">Tracking Number</span>
            <div className="rv-fv">&nbsp;</div>
          </div>
          <div>
            <span className="rv-fl">Payment Terms</span>
            <div className="rv-fv">Net 30</div>
          </div>
        </div>

        {/* Items Returned Table */}
        <div className="rv-sb">Items Returned</div>
        <table className="rv-table">
          <thead>
            <tr>
              <th className="rv-th">Description</th>
              <th className="rv-th rv-th--center" style={{ width: 50 }}>Qty</th>
              <th className="rv-th rv-th--center" style={{ width: 60 }}>Included</th>
              <th className="rv-th">Notes / Condition</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--print-row-alt)' : 'var(--card)' }}>
                <td className="rv-td">&nbsp;</td>
                <td className="rv-td rv-td--center">&nbsp;</td>
                <td className="rv-td rv-td--center">
                  <span className="rv-td-checkbox" />
                </td>
                <td className="rv-td">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Disinfection Reminder */}
        <div className="rv-disinfect">
          <div className="rv-disinfect-title">Disinfection Reminder</div>
          <div className="rv-disinfect-body">
            All equipment returned to Total Scope Inc. must be properly cleaned and high-level disinfected or sterilized prior to shipment. Equipment arriving without documentation of disinfection will be treated as contaminated. TSI reserves the right to charge a decontamination fee. Please include your facility's decontamination record with this shipment.
          </div>
        </div>

        {/* Authorization */}
        <div className="rv-sb">Authorization</div>
        <div className="rv-auth-row">
          <div className="rv-sig-block">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Customer Signature</div>
          </div>
          <div className="rv-sig-block--180">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Printed Name</div>
          </div>
          <div className="rv-sig-block--130">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Title</div>
          </div>
          <div className="rv-sig-block--110">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Date</div>
          </div>
        </div>
        <div className="rv-auth-row--mb">
          <div className="rv-sig-block">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">TSI Customer Service Rep</div>
          </div>
          <div className="rv-sig-block--180">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Printed Name</div>
          </div>
          <div className="rv-sig-block--240">
            <div className="rv-sig-line" />
            <div className="rv-sig-label">Date</div>
          </div>
        </div>

        {/* Footer */}
        <div className="rv-footer">
          <div className="rv-footer-main">
            Total Scope, Inc. — ISO 13485 Certified <span className="rv-footer-doc">OM14-1</span>
          </div>
          <div className="rv-footer-locs">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
