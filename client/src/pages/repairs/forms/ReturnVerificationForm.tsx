import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Canonical template styles (OM14-1) ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

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
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Scope Return Verification</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Return Shipment Documentation</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM14-1</div>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: g }}>
          {/* Bill To */}
          <div style={{ border: '1px solid #eee', borderRadius: 4, padding: '6px 10px' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.06em', marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>Bill To</div>
            <div style={{ ...fv, marginBottom: 3 }}>{clientName || em}</div>
            <div style={{ ...fv, marginBottom: 3 }}>{billAddr || em}</div>
            <div style={fv}>{billCSZ || em}</div>
          </div>
          {/* Ship To */}
          <div style={{ border: '1px solid #eee', borderRadius: 4, padding: '6px 10px' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.06em', marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>Ship To</div>
            <div style={{ ...fv, marginBottom: 3 }}>{shipName || em}</div>
            <div style={{ ...fv, marginBottom: 3 }}>{shipAddr || em}</div>
            <div style={fv}>{shipCSZ || em}</div>
          </div>
        </div>

        {/* Shipment Reference */}
        <div style={sb}>Shipment Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0', marginBottom: g }}>
          <div>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>
          <div>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? em}</div>
          </div>
          <div>
            <span style={fl}>PO #</span>
            <div style={fv}>{repair.purchaseOrder ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Scope / Equipment Model</span>
            <div style={fv}>{[repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em}</div>
          </div>
          <div>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Tracking Number</span>
            <div style={fv}>&nbsp;</div>
          </div>
          <div>
            <span style={fl}>Payment Terms</span>
            <div style={fv}>Net 30</div>
          </div>
        </div>

        {/* Items Returned Table */}
        <div style={sb}>Items Returned</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: g }}>
          <thead>
            <tr>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left' }}>Description</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 50 }}>Qty</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 60 }}>Included</th>
              <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left' }}>Notes / Condition</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, border: '1px solid #ccc', borderRadius: 2 }} />
                </td>
                <td style={{ padding: '4px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Disinfection Reminder */}
        <div style={{ marginBottom: g, padding: '6px 10px', background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 4 }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '.06em', marginBottom: 3 }}>Disinfection Reminder</div>
          <div style={{ fontSize: 8.5, color: '#78350f', lineHeight: 1.5 }}>
            All equipment returned to Total Scope Inc. must be properly cleaned and high-level disinfected or sterilized prior to shipment. Equipment arriving without documentation of disinfection will be treated as contaminated. TSI reserves the right to charge a decontamination fee. Please include your facility's decontamination record with this shipment.
          </div>
        </div>

        {/* Authorization */}
        <div style={sb}>Authorization</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Customer Signature</div>
          </div>
          <div style={{ maxWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Printed Name</div>
          </div>
          <div style={{ maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Title</div>
          </div>
          <div style={{ maxWidth: 110, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>TSI Customer Service Rep</div>
          </div>
          <div style={{ maxWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Printed Name</div>
          </div>
          <div style={{ maxWidth: 240, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM14-1</span></div>
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
