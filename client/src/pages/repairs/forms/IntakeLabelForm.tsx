import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : today;

const labelStyle: React.CSSProperties = {
  width: '4in', height: '2in', padding: '8px 10px',
  display: 'flex', flexDirection: 'column', gap: 3,
  border: '1px dashed #ccc', margin: '0 auto', overflow: 'hidden',
  fontFamily: 'Arial, sans-serif', background: '#fff', color: '#000',
};

export const IntakeLabelForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
  >
    <style>{`@media print { @page { size: 4in 2in landscape; margin: 0; } }`}</style>
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print Label</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>
    <div className="print-form" style={labelStyle}>
      {/* Header row: WO# large + Date received */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{repair.wo ?? '—'}</span>
        <div style={{ fontSize: 9, textAlign: 'right' }}>
          <strong style={{ display: 'block', fontSize: 10 }}>{fmt(repair.dateIn)}</strong>
          Date Received
        </div>
      </div>
      {/* Data rows */}
      {([['Client', repair.client], ['Model', repair.scopeModel], ['Serial', repair.serial]] as [string, string | undefined | null][]).map(([lbl, val]) => (
        <div key={lbl} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', width: 44, flexShrink: 0 }}>{lbl}</span>
          <span style={{ fontSize: 11, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val ?? '—'}</span>
        </div>
      ))}
      {/* Barcode — Code 39 monospace representation */}
      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 28, lineHeight: 1, letterSpacing: 2 }}>*{repair.wo ?? ''}*</div>
        <div style={{ fontSize: 7.5, color: '#555', letterSpacing: '0.08em', marginTop: 1 }}>{repair.wo ?? ''}</div>
      </div>
    </div>
  </div>
);
