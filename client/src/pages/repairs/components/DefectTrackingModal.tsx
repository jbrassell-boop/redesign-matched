import { Modal } from 'antd';
import type { CSSProperties } from 'react';
import type { RepairFull } from '../types';

interface DefectTrackingModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  defects: { itemKey: number; item: string; comment: string }[];
}

const sBar: CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px',
};

export const DefectTrackingModal = ({ open, onClose, repair, defects }: DefectTrackingModalProps) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={680} destroyOnClose>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '7px 20px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div style={{ background: 'var(--card)', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

        {/* Form header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <img src="/logo-color.png" alt="Total Scope Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Defect Tracking</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Repair Quality Record</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM07-8</div>
          </div>
        </div>

        {/* Scope Identification */}
        <div style={sBar}>Scope Identification</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', padding: '6px 0 2px' }}>
          {[
            { label: 'Date', value: today },
            { label: 'Work Order', value: repair.wo },
            { label: 'Model', value: repair.scopeType },
            { label: 'Serial #', value: repair.serial },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>{label}</span>
              <div style={fv}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Defect items — rendered as filled checkboxes */}
        <div style={sBar}>Failure Type</div>
        <div style={{ padding: '4px 0' }}>
          {defects.length === 0 ? (
            <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
              No defect items recorded for this repair.
            </div>
          ) : defects.map(d => (
            <div key={d.itemKey} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '7px 0', borderBottom: '1px solid #f0f0f0',
            }}>
              {/* Filled checkbox — item IS checked because it was recorded */}
              <div style={{
                width: 14, height: 14, border: '1.5px solid var(--primary)',
                borderRadius: 2, background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600 }}>{d.item || 'Unknown defect item'}</div>
                {d.comment && (
                  <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, fontSize: 10, color: '#555', marginTop: 4 }}>
                    {d.comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Follow-Up Notes */}
        <div style={sBar}>Follow-Up Notes</div>
        <div style={{
          border: '1px solid #ccc', borderRadius: 3, minHeight: 36,
          padding: '4px 8px', fontSize: 10.5, marginTop: 4,
          color: defects.some(d => d.comment) ? 'var(--label)' : 'var(--muted)',
          fontStyle: defects.some(d => d.comment) ? 'normal' : 'italic',
        }}>
          {defects.map(d => d.comment).filter(Boolean).join(' | ') || 'No additional notes'}
        </div>

        {/* Completed By */}
        <div style={sBar}>Completed By</div>

        {/* Signature block */}
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          {[
            { label: 'Recorded By / Signature', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
            { label: 'Reviewed By / Signature', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #999', minHeight: 28 }} />
              <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Form footer */}
        <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>OM07-8</span>
        </div>
      </div>
    </Modal>
  );
};
