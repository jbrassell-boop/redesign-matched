// ── Extracted static styles ──
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' };
const printFormStyle: React.CSSProperties = { width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: 'var(--print-text)' };
const printCloseRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' };
const printBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const closeBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--print-light)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const formBodyStyle: React.CSSProperties = { padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 10 };
const headerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 };
const headerTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--navy)' };
const headerDocRefStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)', marginTop: 2 };
const addrGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
const shipRefGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', marginTop: 6 };
const itemsTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 4 };
const altRowStyle: React.CSSProperties = { background: 'var(--bg)' };
const checkboxCellStyle: React.CSSProperties = { display: 'inline-block', width: 14, height: 14, border: '1px solid var(--print-check-border)', borderRadius: 2 };
const disinfectionWrapStyle: React.CSSProperties = { marginTop: 10, padding: '10px 14px', background: 'var(--print-warn-bg)', border: '1.5px solid var(--warning)', borderRadius: 4 };
const disinfectionTitleStyle: React.CSSProperties = { fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--badge-amber-text)', letterSpacing: '.06em', marginBottom: 4 };
const disinfectionBodyStyle: React.CSSProperties = { fontSize: '10.5px', color: 'var(--print-warn-text)', lineHeight: 1.5 };
const sigRow1Style: React.CSSProperties = { display: 'flex', gap: 20, marginTop: 8 };
const sigRow2Style: React.CSSProperties = { display: 'flex', gap: 20 };
const footerStyle: React.CSSProperties = { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: 'var(--print-footer)' };
const addrBlockStyle: React.CSSProperties = { border: '1px solid var(--print-border-lt)', borderRadius: 4, padding: '8px 12px' };
const addrBlockTitleStyle: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.06em', marginBottom: 6, borderBottom: '1px solid var(--print-border-xlt)', paddingBottom: 3 };
const addrLineStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-border)', minHeight: 16, fontSize: 11, marginBottom: 4 };
const sigLineStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 30 };
const sigLabelStyle: React.CSSProperties = { fontSize: '8.5px', color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 };
const fldValueStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 17, fontSize: 11, padding: '1px 2px' };

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const ReturnVerificationForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const clientName = repair.client ?? '';
  const addr = repair.billAddr1 ?? '';
  const city = repair.billCity ?? '';
  const state = repair.billState ?? '';
  const zip = repair.billZip ?? '';
  const csz = [city, state].filter(Boolean).join(', ') + (zip ? ' ' + zip : '');

  return (
    <div style={overlayStyle}>
      <div className="print-form" style={printFormStyle}>
        {/* Print/Close */}
        <div className="no-print" style={printCloseRowStyle}>
          <button onClick={() => window.print()} style={printBtnStyle}>Print / Save PDF</button>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>

        <div style={formBodyStyle}>
          {/* Header */}
          <div style={headerRowStyle}>
            <img src="/logo-color.png" alt="TSI Logo" loading="lazy" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={headerTitleStyle}>Scope Return Verification</div>
              <div style={headerDocRefStyle}>OM14-1</div>
            </div>
          </div>

          {/* Bill To / Ship To */}
          <div style={addrGridStyle}>
            <AddrBlock title="Bill To" name={clientName} addr={addr} csz={csz} />
            <AddrBlock title="Ship To" name={clientName} addr={addr} csz={csz} />
          </div>

          {/* Shipment Reference */}
          <Bar style={{ marginTop: 6 }}>Shipment Reference</Bar>
          <div style={shipRefGridStyle}>
            <Fld label="Date" value={today} />
            <Fld label="Work Order #" value={repair.wo} />
            <Fld label="PO #" value={repair.purchaseOrder} />
            <Fld label="Scope / Equipment Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim()} span2 />
            <Fld label="Serial #" value={repair.serial} />
            <Fld label="Tracking Number" value="" span2 />
            <Fld label="Payment Terms" value="Net 30" />
          </div>

          {/* Items Returned Table */}
          <Bar style={{ marginTop: 8 }}>Items Returned</Bar>
          <table style={itemsTableStyle}>
            <thead>
              <tr>
                <th style={thS}>Description</th>
                <th style={{ ...thS, textAlign: 'center', width: 50 }}>Qty</th>
                <th style={{ ...thS, textAlign: 'center', width: 50 }}>Included</th>
                <th style={{ ...thS, borderRight: 'none' }}>Notes / Condition</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={i % 2 === 1 ? altRowStyle : undefined}>
                  <td style={tdS}>&nbsp;</td>
                  <td style={{ ...tdS, textAlign: 'center' }}>&nbsp;</td>
                  <td style={{ ...tdS, textAlign: 'center' }}><span style={checkboxCellStyle} /></td>
                  <td style={{ ...tdS, borderRight: 'none' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Disinfection Reminder */}
          <div style={disinfectionWrapStyle}>
            <div style={disinfectionTitleStyle}>Disinfection Reminder</div>
            <div style={disinfectionBodyStyle}>
              All equipment returned to Total Scope Inc. must be properly cleaned and high-level disinfected or sterilized prior to shipment. Equipment arriving without documentation of disinfection will be treated as contaminated. TSI reserves the right to charge a decontamination fee. Please include your facility's decontamination record with this shipment.
            </div>
          </div>

          {/* Authorization */}
          <Bar style={{ marginTop: 10 }}>Authorization</Bar>
          <div style={sigRow1Style}>
            <Sig label="Customer Signature" />
            <Sig label="Printed Name" width={180} />
            <Sig label="Title" width={130} />
            <Sig label="Date" width={110} />
          </div>
          <div style={sigRow2Style}>
            <Sig label="TSI Customer Service Rep" />
            <Sig label="Printed Name" width={180} />
            <Sig label="Date" width={240} />
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <span>ISO 13485 Certified</span>
            <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM14-1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Primitives ── */
const fl: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em' };
const thS: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left', letterSpacing: '.04em', borderRight: '1px solid rgba(255,255,255,.2)' };
const tdS: React.CSSProperties = { padding: '5px 8px', fontSize: '10.5px', borderBottom: '1px solid var(--print-border-lt)', verticalAlign: 'middle', borderRight: '1px solid var(--print-border-xlt)' };
const barBaseStyle: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px' };

const Bar = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ ...barBaseStyle, ...style }}>{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={fldValueStyle}>{value || ''}</div>
  </div>
);

const AddrBlock = ({ title, name, addr, csz }: { title: string; name: string; addr: string; csz: string }) => (
  <div style={addrBlockStyle}>
    <div style={addrBlockTitleStyle}>{title}</div>
    <div style={addrLineStyle}>{name}</div>
    <div style={addrLineStyle}>{addr}</div>
    <div style={addrLineStyle}>{csz}</div>
  </div>
);

const Sig = ({ label, width }: { label: string; width?: number }) => (
  <div style={{ flex: width ? undefined : 1, maxWidth: width, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={sigLineStyle} />
    <div style={sigLabelStyle}>{label}</div>
  </div>
);
