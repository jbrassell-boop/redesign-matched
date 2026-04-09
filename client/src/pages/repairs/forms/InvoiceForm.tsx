import './InvoiceForm.css';
import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

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
      className="inv-overlay"
    >
      {/* Action bar */}
      <div className="no-print inv-action-bar">
        <button onClick={() => window.print()} className="inv-btn-print">Print</button>
        <button onClick={onClose} className="inv-btn-close">Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form inv-page">

        {/* Envelope Window Zone */}
        <div className="inv-env-zone">
          {/* Bill To — positioned for #10 window envelope */}
          <div className="inv-bill-block">
            <div className="inv-bill-label">Bill To</div>
            <div className="inv-bill-name">{repair.billName ?? ''}</div>
            <div className="inv-bill-line">{repair.billAddr1 ?? ''}</div>
            <div className="inv-bill-line">{repair.billAddr2 ?? ''}</div>
            <div className="inv-bill-line">{billCSZ}</div>
          </div>

          {/* TSI Header */}
          <div className="inv-tsi-header">
            <img src="/logo-horizontal.jpg" alt="Total Scope Inc." className="inv-tsi-logo" />
            <div className="inv-tsi-address">
              Total Scope Inc.<br />
              17 Creek Pkwy, Upper Chichester PA 19061<br />
              Phone: (610) 485-3838 &nbsp;|&nbsp; Fax: (610) 485-3839
            </div>
            <div className="inv-tsi-title">Invoice</div>
          </div>
        </div>

        {/* Invoice Meta Strip */}
        <div className="inv-meta-strip">
          <div className="inv-meta-cell inv-meta-cell--hl">
            <span className="inv-meta-cell-label">Invoice #</span>
            <span className="inv-meta-cell-value">{repair.invoiceNumber ?? '—'}</span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Invoice Date</span>
            <span className="inv-meta-cell-value">{today}</span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Due Date</span>
            <span className="inv-meta-cell-value"></span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Terms</span>
            <span className="inv-meta-cell-value">{repair.paymentTerms ?? ''}</span>
          </div>
        </div>

        {/* Reference Fields */}
        <div className="inv-ref-grid">
          <div className="inv-ref-field">
            <span className="inv-fl">Work Order #</span>
            <div className="inv-fv">{repair.wo ?? ''}</div>
          </div>
          <div className="inv-ref-field">
            <span className="inv-fl">Serial #</span>
            <div className="inv-fv">{repair.serial ?? ''}</div>
          </div>
          <div className="inv-ref-field">
            <span className="inv-fl">Service Date</span>
            <div className="inv-fv">{repair.dateIn ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</div>
          </div>
          <div className="inv-ref-field">
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Client / Account</span>
            <div className="inv-fv">{repair.client ?? ''}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Equipment / Scope Model</span>
            <div className="inv-fv">{repair.scopeModel ?? ''}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Department</span>
            <div className="inv-fv">{repair.dept ?? ''}</div>
          </div>
        </div>

        {/* Line Items */}
        <div className="inv-sb">Services &amp; Items</div>
        <table className="inv-items-table">
          <thead>
            <tr>
              <th className="inv-th-desc">Description</th>
              <th className="inv-th-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                <td className="inv-td">
                  {row?.description ?? ''}
                </td>
                <td className="inv-td inv-td--right">
                  {row?.amount != null ? `$${row.amount.toFixed(2)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="inv-totals-wrap">
          <table className="inv-totals-table">
            <tbody>
              <tr>
                <td colSpan={2} className="inv-tot-cell">Subtotal</td>
                <td className="inv-tot-cell inv-tot-cell--sep">
                  ${total.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="inv-tot-cell">Shipping</td>
                <td className="inv-tot-cell inv-tot-cell--sep">$</td>
              </tr>
              <tr>
                <td colSpan={2} className="inv-tot-cell">Tax</td>
                <td className="inv-tot-cell inv-tot-cell--sep">$</td>
              </tr>
              <tr className="inv-tot-due-row">
                <td className="inv-tot-due-label">Amount Due</td>
                <td className="inv-tot-due-val">
                  ${total.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Area */}
        <div className="inv-sig-area">
          <div className="inv-sig-flex2">
            <div className="inv-sig-line" />
            <div className="inv-sig-label">Authorized By</div>
          </div>
          <div className="inv-sig-flex1">
            <div className="inv-sig-line" />
            <div className="inv-sig-label">Date</div>
          </div>
        </div>

        {/* Payment Notes */}
        <div className="inv-payment-note">
          Payment due within 30 days of invoice date. Please include invoice number on your remittance.
          Make checks payable to <strong>Total Scope Inc.</strong> ACH/Wire transfer available upon request.
        </div>

        {/* Remittance Stub */}
        <div className="inv-remit-stub">
          <div className="inv-remit-header">
            Remittance — Please Return With Payment
          </div>
          <div className="inv-remit-fields">
            <div className="inv-remit-field">
              <div className="inv-remit-flabel">Invoice #</div>
              <div className="inv-remit-fline">{repair.invoiceNumber ?? ''}</div>
            </div>
            <div className="inv-remit-field">
              <div className="inv-remit-flabel">Amount Enclosed</div>
              <div className="inv-remit-fline"></div>
            </div>
            <div className="inv-remit-field inv-remit-field--wide">
              <div className="inv-remit-flabel">Account / PO Reference</div>
              <div className="inv-remit-fline"></div>
            </div>
          </div>
          <div className="inv-remit-cut">
            ✂ &nbsp; Detach and return with payment &nbsp; ✂
          </div>
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
