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
  color: 'var(--card)',
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
  color: 'var(--print-muted)',
  letterSpacing: '0.04em',
};

const fv: React.CSSProperties = {
  borderBottom: '1px solid var(--print-check-border)',
  minHeight: 18,
  fontSize: 11,
  padding: '1px 2px',
};

const ynBox: React.CSSProperties = {
  display: 'inline-block',
  width: 18,
  height: 14,
  border: '1px solid var(--print-check-border)',
  borderRadius: 2,
  textAlign: 'center',
  lineHeight: '14px',
  margin: '0 2px',
  fontSize: 9,
  fontWeight: 700,
};

// ── Extracted static styles ──
const reqOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1100,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '24px 16px', overflowY: 'auto',
};
const reqActionBarStyle: React.CSSProperties = {
  position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
};
const reqPrintBtnStyle: React.CSSProperties = {
  height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
  background: 'var(--primary)', color: 'var(--card)',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const reqCloseBtnStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', border: '1px solid var(--print-border)', borderRadius: 5,
  background: 'var(--card)', color: 'var(--print-muted)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const reqPageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: 'var(--card)', padding: '0.5in',
  display: 'flex', flexDirection: 'column', gap: 10,
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 11,
  color: 'var(--print-text)', boxSizing: 'border-box',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};
const reqHeaderRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 };
const reqLogoStyle: React.CSSProperties = { fontWeight: 800, fontSize: 16, color: 'var(--navy)' };
const reqPrimaryLetterStyle: React.CSSProperties = { color: 'var(--primary)' };
const reqHeaderRightStyle: React.CSSProperties = { textAlign: 'right' };
const reqTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--navy)' };
const reqFormCodeStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)', marginTop: 2 };
const reqSectionBarNoMargin: React.CSSProperties = { ...sectionBar, marginTop: 0 };
const reqInfoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', padding: '8px 0 4px' };
const reqFieldSpan2Style: React.CSSProperties = { gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 };
const reqFieldColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const reqTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 4 };
const reqItemThStyle: React.CSSProperties = {
  background: 'var(--primary)', color: 'var(--card)', fontSize: 8.5, fontWeight: 700,
  textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left',
  letterSpacing: '0.04em', width: '40%',
};
const reqDescThStyle: React.CSSProperties = {
  background: 'var(--primary)', color: 'var(--card)', fontSize: 8.5, fontWeight: 700,
  textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left',
  letterSpacing: '0.04em',
};
const reqApproveThStyle: React.CSSProperties = {
  background: 'var(--primary)', color: 'var(--card)', fontSize: 8.5, fontWeight: 700,
  textTransform: 'uppercase', padding: '5px 8px', textAlign: 'center',
  letterSpacing: '0.04em', width: 60,
};
const reqApproveSubStyle: React.CSSProperties = { fontSize: 7, fontWeight: 400 };
const reqItemTdStyle: React.CSSProperties = { padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid var(--print-border-lt)', verticalAlign: 'middle', minHeight: 22 };
const reqDescTdStyle: React.CSSProperties = { padding: '5px 8px', fontSize: 10.5, borderBottom: '1px solid var(--print-border-lt)', verticalAlign: 'middle' };
const reqApproveTdStyle: React.CSSProperties = { padding: '5px 8px', fontSize: 10, borderBottom: '1px solid var(--print-border-lt)', verticalAlign: 'middle', textAlign: 'center', color: 'var(--print-muted)' };
const reqTotalsRowStyle: React.CSSProperties = { marginTop: 6, display: 'flex', justifyContent: 'flex-end' };
const reqTotalsTableStyle: React.CSSProperties = { width: 260, borderCollapse: 'collapse' };
const reqTotalLabelTdStyle: React.CSSProperties = { padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid var(--print-border-xlt)', color: 'var(--print-muted)', fontWeight: 600, textAlign: 'right', width: 140 };
const reqTotalValueTdStyle: React.CSSProperties = { padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid var(--print-border-xlt)', textAlign: 'right', fontWeight: 700, borderBottomColor: 'var(--print-check-border)' };
const reqTotalLabelTdNoWidth: React.CSSProperties = { padding: '3px 8px', fontSize: 10.5, borderBottom: '1px solid var(--print-border-xlt)', color: 'var(--print-muted)', fontWeight: 600, textAlign: 'right' };
const reqDisclaimerStyle: React.CSSProperties = {
  marginTop: 10, fontSize: 8.5, color: 'var(--print-muted)', lineHeight: 1.4,
  padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--print-border-lt)', borderRadius: 3,
};
const reqAuthSectionBar: React.CSSProperties = { ...sectionBar, marginTop: 10 };
const reqSigRowStyle: React.CSSProperties = { display: 'flex', gap: 24, marginTop: 10 };
const reqSigFieldStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 };
const reqSigFieldNameStyle: React.CSSProperties = { flex: 1, maxWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 };
const reqSigFieldTitleStyle: React.CSSProperties = { flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 };
const reqSigFieldDateStyle: React.CSSProperties = { flex: 1, maxWidth: 110, display: 'flex', flexDirection: 'column', gap: 2 };
const reqSigLineStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 32 };
const reqSigLabelStyle: React.CSSProperties = { fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 };
const reqFooterStyle: React.CSSProperties = {
  marginTop: 'auto', paddingTop: 10,
  borderTop: '1px solid var(--print-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: 8, color: 'var(--print-footer)',
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
      style={reqOverlayStyle}
    >
      {/* Action bar */}
      <div className="no-print" style={reqActionBarStyle}>
        <button onClick={() => window.print()} style={reqPrintBtnStyle}>Print</button>
        <button onClick={onClose} style={reqCloseBtnStyle}>Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form" style={reqPageStyle}>
        {/* ── Form Header ── */}
        <div style={reqHeaderRowStyle}>
          <div style={reqLogoStyle}>
            <span style={reqPrimaryLetterStyle}>T</span>otal <span style={reqPrimaryLetterStyle}>S</span>cope <span style={reqPrimaryLetterStyle}>I</span>nc.
          </div>
          <div style={reqHeaderRightStyle}>
            <div style={reqTitleStyle}>Requisition for Approval</div>
            <div style={reqFormCodeStyle}>OM07-2 (12/2020)</div>
          </div>
        </div>

        {/* ── Repair Information ── */}
        <div style={reqSectionBarNoMargin}>Repair Information</div>
        <div style={reqInfoGridStyle}>
          {/* To (Customer) — span 2 */}
          <div style={reqFieldSpan2Style}>
            <span style={fl}>To (Customer)</span>
            <div style={fv}>{repair.client ?? ''}</div>
          </div>
          {/* Date */}
          <div style={reqFieldColStyle}>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>

          {/* Bill To — span 2 */}
          <div style={reqFieldSpan2Style}>
            <span style={fl}>Bill To</span>
            <div style={fv}>{billLine}</div>
          </div>
          {/* Work Order # */}
          <div style={reqFieldColStyle}>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? ''}</div>
          </div>

          {/* Ship To — span 2 */}
          <div style={reqFieldSpan2Style}>
            <span style={fl}>Ship To</span>
            <div style={fv}>{shipLine}</div>
          </div>
          {/* PO # */}
          <div style={reqFieldColStyle}>
            <span style={fl}>PO #</span>
            <div style={fv}>{repair.purchaseOrder ?? ''}</div>
          </div>

          {/* Scope / Equipment — span 2 */}
          <div style={reqFieldSpan2Style}>
            <span style={fl}>Scope / Equipment</span>
            <div style={fv}>{repair.scopeModel ?? repair.scopeType ?? ''}</div>
          </div>
          {/* Serial # */}
          <div style={reqFieldColStyle}>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? ''}</div>
          </div>

          {/* Complaint — span 2, no third column */}
          <div style={reqFieldSpan2Style}>
            <span style={fl}>Complaint / Reason for Repair</span>
            <div style={{ ...fv, minHeight: 28 }}>{repair.complaint ?? ''}</div>
          </div>
        </div>

        {/* ── Repair Items ── */}
        <div style={sectionBar}>Repair Items — Customer Authorization Required</div>
        <table style={reqTableStyle}>
          <thead>
            <tr>
              <th style={reqItemThStyle}>Problem / Item</th>
              <th style={reqDescThStyle}>Description of Work</th>
              <th style={reqApproveThStyle}>Approve<br /><span style={reqApproveSubStyle}>Y / N</span></th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                <td style={reqItemTdStyle}>
                  {row?.problem ?? ''}
                </td>
                <td style={reqDescTdStyle}>
                  {row?.description ?? ''}
                </td>
                <td style={reqApproveTdStyle}>
                  <span style={ynBox}>Y</span>
                  <span style={ynBox}>N</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div style={reqTotalsRowStyle}>
          <table style={reqTotalsTableStyle}>
            <tbody>
              <tr>
                <td style={reqTotalLabelTdStyle}>Subtotal</td>
                <td style={reqTotalValueTdStyle}>
                  {subtotal > 0 ? '$' + subtotal.toFixed(2) : '$'}
                </td>
              </tr>
              <tr>
                <td style={reqTotalLabelTdNoWidth}>Shipping</td>
                <td style={reqTotalValueTdStyle}>$</td>
              </tr>
              <tr>
                <td style={reqTotalLabelTdNoWidth}>Tax</td>
                <td style={reqTotalValueTdStyle}>$</td>
              </tr>
              <tr style={{ fontSize: 12, fontWeight: 800, borderTop: '2px solid var(--primary)', background: 'var(--primary-hover-bg)' }}>
                <td style={{ padding: '3px 8px', color: 'var(--print-muted)', fontWeight: 600, textAlign: 'right' }}>Total</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 800, fontSize: 12 }}>$</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Disclaimer ── */}
        <div style={reqDisclaimerStyle}>
          By signing below, customer authorizes Total Scope Inc. (TSI) to proceed with the approved repair items listed above.
          Items marked "N" will not be repaired and will be returned as-is. TSI's standard Terms &amp; Conditions apply.
          Payment is due net 30 days from invoice date. Unapproved items returned to customer at customer's expense.
          TSI is not responsible for damage to equipment during transit when customer-arranged shipping is used.
        </div>

        {/* ── Customer Authorization ── */}
        <div style={reqAuthSectionBar}>Customer Authorization</div>
        <div style={reqSigRowStyle}>
          <div style={reqSigFieldStyle}>
            <div style={reqSigLineStyle}></div>
            <div style={reqSigLabelStyle}>Authorized Signature</div>
          </div>
          <div style={reqSigFieldNameStyle}>
            <div style={reqSigLineStyle}></div>
            <div style={reqSigLabelStyle}>Printed Name</div>
          </div>
          <div style={reqSigFieldTitleStyle}>
            <div style={reqSigLineStyle}></div>
            <div style={reqSigLabelStyle}>Title</div>
          </div>
          <div style={reqSigFieldDateStyle}>
            <div style={reqSigLineStyle}></div>
            <div style={reqSigLabelStyle}>Date</div>
          </div>
        </div>

        {/* ── Form Footer ── */}
        <div style={reqFooterStyle}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc.&nbsp;|&nbsp;17 Creek Pkwy, Upper Chichester PA 19061&nbsp;|&nbsp;(610) 485-3838</span>
          <span>OM07-2 (12/2020)</span>
        </div>
      </div>
    </div>
  );
};
