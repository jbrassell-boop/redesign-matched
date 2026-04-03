import { Modal } from 'antd';
import type { RepairFull } from '../types';

interface UpdateSlipsModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  slips: { slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[];
}

const sBar: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: React.CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px',
};

const REASON_CATS = ['Image', 'Lights', 'Buttons', 'Leaks', 'Angulation', 'Video Features'] as const;

export const UpdateSlipsModal = ({ open, onClose, repair, slips }: UpdateSlipsModalProps) => (
  <Modal open={open} onCancel={onClose} footer={null} width={760} destroyOnClose>
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

    <div style={{ background: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

      {/* Internal Use Only Banner */}
      <div style={{
        background: '#FEF2F2', border: '2px solid #FECACA',
        borderRadius: 4, padding: '8px 16px', textAlign: 'center', marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
          Internal Use Only
        </div>
        <div style={{ fontSize: 9, color: '#7F1D1D', marginTop: 2, fontWeight: 600 }}>
          Do not send to customer — for TSI technician use only
        </div>
      </div>

      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>Technical Services Inc.</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Update Slip</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Technician Update Request</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM15-2</div>
        </div>
      </div>

      {/* Scope Information */}
      <div style={sBar}>Scope Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px 12px', padding: '6px 0 2px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Update Request Date</span>
          <div style={fv}>{slips[0]?.date ?? '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Hospital / Facility</span>
          <div style={fv}>{repair.client || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
          <span style={fl}>Model</span>
          <div style={fv}>{repair.scopeType || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Serial #</span>
          <div style={fv}>{repair.serial || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Work Order #</span>
          <div style={fv}>{repair.wo || '—'}</div>
        </div>
      </div>

      {/* Slip History */}
      <div style={sBar}>Slip History</div>
      {slips.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
          No update slips recorded for this repair.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
          <thead>
            <tr>
              {['Date', 'Reason', 'Primary Tech', 'Secondary Tech'].map(h => (
                <th key={h} style={{
                  background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700,
                  textTransform: 'uppercase', padding: '4px 8px', textAlign: 'left',
                  letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slips.map((s, i) => (
              <tr key={s.slipKey} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.date}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.reason || '—'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.primaryTech || '—'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.secondaryTech || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reason for Update — 6 categories */}
      <div style={sBar}>Reason for Update</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '8px 0' }}>
        {REASON_CATS.map(cat => (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)',
              letterSpacing: '.05em', padding: '3px 8px',
              background: '#EFF6FF', borderLeft: '3px solid var(--primary)',
            }}>
              {cat}
            </div>
            <div style={{
              border: '1px solid #ccc', borderRadius: 3, minHeight: 52,
              padding: '4px 8px', fontSize: 10, color: '#9ca3af', fontStyle: 'italic',
            }}>
              {slips.find(s => s.reason?.toLowerCase().includes(cat.toLowerCase()))?.reason || ''}
            </div>
          </div>
        ))}
      </div>

      <div style={sBar}>Completed By</div>

      {/* Signature block */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
        {[
          { label: 'Technician / Signature', maxWidth: undefined as number | undefined },
          { label: 'Date', maxWidth: 130 as number | undefined },
          { label: 'Reviewed By / Signature', maxWidth: undefined as number | undefined },
          { label: 'Date', maxWidth: 130 as number | undefined },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 30 }} />
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form footer */}
      <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888' }}>
        <span>ISO 13485 Certified — Internal Document</span>
        <span>Technical Services Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM15-2</span>
      </div>
    </div>
  </Modal>
);
