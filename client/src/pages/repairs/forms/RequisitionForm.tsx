import './print.css';
import './RequisitionForm.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems: RepairLineItem[];
  onClose: () => void;
}

const em = '—';
const g = 6;

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
      className="req-overlay"
    >
      {/* Action bar */}
      <div className="no-print req-action-bar">
        <button onClick={() => window.print()} className="req-btn-print">Print</button>
        <button onClick={onClose} className="req-btn-close">Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form req-page">

        {/* Header */}
        <div className="req-header" style={{ marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="req-logo" />
          <div className="req-title-block">
            <div className="req-title">Requisition for Approval</div>
            <div className="req-subtitle">Customer Authorization Required</div>
            <div className="req-doc-num">OM07-2</div>
          </div>
        </div>

        {/* Repair Information */}
        <div className="req-sb">Repair Information</div>
        <div className="req-info-grid" style={{ marginBottom: g }}>
          <div className="req-span2">
            <span className="req-fl">To (Customer)</span>
            <div className="req-fv">{repair.client ?? em}</div>
          </div>
          <div>
            <span className="req-fl">Date</span>
            <div className="req-fv">{today}</div>
          </div>

          <div className="req-span2">
            <span className="req-fl">Bill To</span>
            <div className="req-fv">{billLine || em}</div>
          </div>
          <div>
            <span className="req-fl">Work Order #</span>
            <div className="req-fv">{repair.wo ?? em}</div>
          </div>

          <div className="req-span2">
            <span className="req-fl">Ship To</span>
            <div className="req-fv">{shipLine || em}</div>
          </div>
          <div>
            <span className="req-fl">PO #</span>
            <div className="req-fv">{repair.purchaseOrder ?? em}</div>
          </div>

          <div className="req-span2">
            <span className="req-fl">Scope / Equipment</span>
            <div className="req-fv">{repair.scopeModel ?? repair.scopeType ?? em}</div>
          </div>
          <div>
            <span className="req-fl">Serial #</span>
            <div className="req-fv">{repair.serial ?? em}</div>
          </div>

          <div className="req-span2">
            <span className="req-fl">Complaint / Reason for Repair</span>
            <div className="req-fv--tall">{repair.complaint ?? em}</div>
          </div>
        </div>

        {/* Repair Items */}
        <div className="req-sb">Repair Items — Customer Authorization Required</div>
        <table className="req-items-table" style={{ marginBottom: g }}>
          <thead>
            <tr>
              <th className="req-th" style={{ width: '38%' }}>Problem / Item</th>
              <th className="req-th">Description of Work</th>
              <th className="req-th--center">Approve<br /><span className="req-th-sub">Y / N</span></th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--print-row-alt)' : 'var(--card)' }}>
                <td className="req-td">
                  {row?.problem ?? ''}
                </td>
                <td className="req-td">
                  {row?.description ?? ''}
                </td>
                <td className="req-td--center">
                  <span className="req-yn-box">Y</span>
                  <span className="req-yn-box">N</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="req-totals-wrap" style={{ marginBottom: g }}>
          <table className="req-totals-table">
            <tbody>
              <tr>
                <td className="req-tot-label">Subtotal</td>
                <td className="req-tot-val">
                  {subtotal > 0 ? '$' + subtotal.toFixed(2) : '$'}
                </td>
              </tr>
              <tr>
                <td className="req-tot-label">Shipping</td>
                <td className="req-tot-val">$</td>
              </tr>
              <tr>
                <td className="req-tot-label">Tax</td>
                <td className="req-tot-val">$</td>
              </tr>
              <tr className="req-tot-row-final">
                <td className="req-tot-label--total">Total</td>
                <td className="req-tot-val--total">$</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div className="req-disclaimer" style={{ marginBottom: g }}>
          By signing below, customer authorizes Total Scope Inc. (TSI) to proceed with the approved repair items listed above.
          Items marked "N" will not be repaired and will be returned as-is. TSI's standard Terms &amp; Conditions apply.
          Payment is due net 30 days from invoice date. Unapproved items returned to customer at customer's expense.
          TSI is not responsible for damage to equipment during transit when customer-arranged shipping is used.
        </div>

        {/* Customer Authorization */}
        <div className="req-sb">Customer Authorization</div>
        <div className="req-sig-row" style={{ marginBottom: g }}>
          <div className="req-sig-block">
            <div className="req-sig-line" />
            <div className="req-sig-label">Authorized Signature</div>
          </div>
          <div className="req-sig-block--180">
            <div className="req-sig-line" />
            <div className="req-sig-label">Printed Name</div>
          </div>
          <div className="req-sig-block--130">
            <div className="req-sig-line" />
            <div className="req-sig-label">Title</div>
          </div>
          <div className="req-sig-block--110">
            <div className="req-sig-line" />
            <div className="req-sig-label">Date</div>
          </div>
        </div>

        {/* Footer */}
        <div className="req-footer">
          <div className="req-footer-name">Total Scope, Inc. — ISO 13485 Certified <span className="req-footer-doc">OM07-2</span></div>
          <div className="req-footer-addrs">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
