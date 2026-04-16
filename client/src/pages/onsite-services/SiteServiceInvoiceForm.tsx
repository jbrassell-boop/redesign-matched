import './SiteServiceInvoiceForm.css';
import '../repairs/forms/InvoiceForm.css';
import '../repairs/forms/print.css';
import type { OnsiteServiceInvoiceData } from './types';
import type { OnsiteServiceTray } from './types';

interface Props {
  invoiceData: OnsiteServiceInvoiceData;
  trays: OnsiteServiceTray[];
  onClose: () => void;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export const SiteServiceInvoiceForm = ({ invoiceData, trays, onClose }: Props) => {
  // Calculated tray columns (screen + print)
  const rows = trays.map(t => ({
    ...t,
    inspectedCount: t.instrumentsCount - t.repairedCount - t.sentToTsiCount - t.beyondEconomicalRepairCount,
  }));

  // Footer totals
  const totInstruments = rows.reduce((s, r) => s + r.instrumentsCount, 0);
  const totInspected   = rows.reduce((s, r) => s + r.inspectedCount, 0);
  const totRepaired    = rows.reduce((s, r) => s + r.repairedCount, 0);
  const totSent        = rows.reduce((s, r) => s + r.sentToTsiCount, 0);
  const totBer         = rows.reduce((s, r) => s + r.beyondEconomicalRepairCount, 0);

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

        {/* 1. Envelope Window Zone */}
        <div className="inv-env-zone">
          {/* Bill To — positioned for #10 window envelope */}
          <div className="inv-bill-block">
            <div className="inv-bill-label">Bill To</div>
            <div className="inv-bill-name">{invoiceData.billName1}</div>
            {invoiceData.billName2 && (
              <div className="inv-bill-line">{invoiceData.billName2}</div>
            )}
            {invoiceData.billEmail && (
              <div className="inv-bill-line">{invoiceData.billEmail}</div>
            )}
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

        {/* 2. Meta Strip */}
        <div className="inv-meta-strip">
          <div className="inv-meta-cell inv-meta-cell--hl">
            <span className="inv-meta-cell-label">Invoice #</span>
            <span className="inv-meta-cell-value">{invoiceData.invoiceNum || '—'}</span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Visit Date</span>
            <span className="inv-meta-cell-value">{invoiceData.visitDate ?? '—'}</span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Due Date</span>
            <span className="inv-meta-cell-value"></span>
          </div>
          <div className="inv-meta-cell">
            <span className="inv-meta-cell-label">Terms</span>
            <span className="inv-meta-cell-value">{invoiceData.termsDesc}</span>
          </div>
        </div>

        {/* 3. Reference Grid */}
        <div className="inv-ref-grid">
          <div className="inv-ref-field">
            <span className="inv-fl">Work Order #</span>
            <div className="inv-fv">{invoiceData.invoiceNum}</div>
          </div>
          <div className="inv-ref-field">
            <span className="inv-fl">Visit Date</span>
            <div className="inv-fv">{invoiceData.visitDate ?? ''}</div>
          </div>
          <div className="inv-ref-field">
            <span className="inv-fl">Mobile Tech</span>
            <div className="inv-fv">{invoiceData.techName}</div>
          </div>
          <div className="inv-ref-field">
            <span className="inv-fl">Truck #</span>
            <div className="inv-fv">{invoiceData.truckNumber ?? ''}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Client / Account</span>
            <div className="inv-fv">{invoiceData.clientName}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Department</span>
            <div className="inv-fv">{invoiceData.deptName}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Purchase Order #</span>
            <div className="inv-fv">{invoiceData.purchaseOrder ?? ''}</div>
          </div>
          <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
            <span className="inv-fl">Trays / Instruments</span>
            <div className="inv-fv">{invoiceData.trayCount} / {invoiceData.instrumentCount}</div>
          </div>
        </div>

        {/* 4. Section Bar */}
        <div className="inv-sb">Service Summary</div>

        {/* 5. Tray Breakdown Table */}
        <table className="ssi-tray-table">
          <thead>
            <tr>
              <th className="ssi-tray-th ssi-tray-th--num ssi-tray-th--left">#</th>
              <th className="ssi-tray-th ssi-tray-th--desc ssi-tray-th--left">Description</th>
              <th className="ssi-tray-th ssi-tray-th--count">Instruments</th>
              <th className="ssi-tray-th ssi-tray-th--count">Inspected</th>
              <th className="ssi-tray-th ssi-tray-th--count">Repaired</th>
              <th className="ssi-tray-th ssi-tray-th--count">Sent to TSI</th>
              <th className="ssi-tray-th ssi-tray-th--count">BER</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.trayKey} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                <td className="ssi-tray-td ssi-tray-td--left">{row.trayNumber}</td>
                <td className="ssi-tray-td ssi-tray-td--left">{row.trayName || `Tray ${row.trayNumber}`}</td>
                <td className="ssi-tray-td">{row.instrumentsCount}</td>
                <td className="ssi-tray-td">{row.inspectedCount}</td>
                <td className="ssi-tray-td ssi-tray-td--repaired ssi-print-no-color">{row.repairedCount}</td>
                <td className="ssi-tray-td ssi-tray-td--sent ssi-print-no-color">{row.sentToTsiCount}</td>
                <td className="ssi-tray-td ssi-tray-td--ber ssi-print-no-color">{row.beyondEconomicalRepairCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="ssi-tray-tfoot">
            <tr>
              <td className="ssi-tray-td--left" colSpan={2}>Totals</td>
              <td>{totInstruments}</td>
              <td>{totInspected}</td>
              <td>{totRepaired}</td>
              <td>{totSent}</td>
              <td>{totBer}</td>
            </tr>
          </tfoot>
        </table>

        {/* 6. Totals Block */}
        <div className="inv-totals-wrap">
          <table className="inv-totals-table">
            <tbody>
              <tr>
                <td colSpan={2} className="inv-tot-cell">Subtotal</td>
                <td className="inv-tot-cell inv-tot-cell--sep">
                  {fmt(invoiceData.invoiceAmount)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="inv-tot-cell">Tax</td>
                <td className="inv-tot-cell inv-tot-cell--sep">
                  {fmt(invoiceData.taxAmount)}
                </td>
              </tr>
              <tr className="inv-tot-due-row">
                <td className="inv-tot-due-label">Amount Due</td>
                <td className="inv-tot-due-val">
                  {fmt(invoiceData.invoiceAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 7. Payment Note */}
        <div className="inv-payment-note">
          Payment due within 30 days of invoice date. Please include invoice number on your remittance.
          Make checks payable to <strong>Total Scope Inc.</strong> ACH/Wire transfer available upon request.
        </div>

        {/* 8. Footer */}
        <div className="inv-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
