import './print.css';
import type { RepairFull } from '../types';

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: '#fff', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: '#111' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#666', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <img src="/logo-color.jpg" alt="TSI Logo" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1B3A5C' }}>Scope Return Verification</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM14-1</div>
            </div>
          </div>

          {/* Bill To / Ship To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <AddrBlock title="Bill To" name={clientName} addr={addr} csz={csz} />
            <AddrBlock title="Ship To" name={clientName} addr={addr} csz={csz} />
          </div>

          {/* Shipment Reference */}
          <Bar style={{ marginTop: 6 }}>Shipment Reference</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', marginTop: 6 }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
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
                <tr key={i} style={i % 2 === 1 ? { background: '#F9FAFB' } : undefined}>
                  <td style={tdS}>&nbsp;</td>
                  <td style={{ ...tdS, textAlign: 'center' }}>&nbsp;</td>
                  <td style={{ ...tdS, textAlign: 'center' }}><span style={{ display: 'inline-block', width: 14, height: 14, border: '1px solid #999', borderRadius: 2 }} /></td>
                  <td style={{ ...tdS, borderRight: 'none' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Disinfection Reminder */}
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#FEF9E7', border: '1.5px solid #F59E0B', borderRadius: 4 }}>
            <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#92400E', letterSpacing: '.06em', marginBottom: 4 }}>Disinfection Reminder</div>
            <div style={{ fontSize: '10.5px', color: '#78350F', lineHeight: 1.5 }}>
              All equipment returned to Total Scope Inc. must be properly cleaned and high-level disinfected or sterilized prior to shipment. Equipment arriving without documentation of disinfection will be treated as contaminated. TSI reserves the right to charge a decontamination fee. Please include your facility's decontamination record with this shipment.
            </div>
          </div>

          {/* Authorization */}
          <Bar style={{ marginTop: 10 }}>Authorization</Bar>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <Sig label="Customer Signature" />
            <Sig label="Printed Name" width={180} />
            <Sig label="Title" width={130} />
            <Sig label="Date" width={110} />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Sig label="TSI Customer Service Rep" />
            <Sig label="Printed Name" width={180} />
            <Sig label="Date" width={240} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
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
const fl: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em' };
const thS: React.CSSProperties = { background: '#2E75B6', color: '#fff', fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left', letterSpacing: '.04em', borderRight: '1px solid rgba(255,255,255,.2)' };
const tdS: React.CSSProperties = { padding: '5px 8px', fontSize: '10.5px', borderBottom: '1px solid #ddd', verticalAlign: 'middle', borderRight: '1px solid #eee' };

const Bar = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: '#2E75B6', color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px', ...style }}>{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom: '1px solid #999', minHeight: 17, fontSize: 11, padding: '1px 2px' }}>{value || ''}</div>
  </div>
);

const AddrBlock = ({ title, name, addr, csz }: { title: string; name: string; addr: string; csz: string }) => (
  <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
    <div style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#2E75B6', letterSpacing: '.06em', marginBottom: 6, borderBottom: '1px solid #eee', paddingBottom: 3 }}>{title}</div>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, fontSize: 11, marginBottom: 4 }}>{name}</div>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, fontSize: 11, marginBottom: 4 }}>{addr}</div>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, fontSize: 11, marginBottom: 4 }}>{csz}</div>
  </div>
);

const Sig = ({ label, width }: { label: string; width?: number }) => (
  <div style={{ flex: width ? undefined : 1, maxWidth: width, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #999', minHeight: 30 }} />
    <div style={{ fontSize: '8.5px', color: '#555', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
