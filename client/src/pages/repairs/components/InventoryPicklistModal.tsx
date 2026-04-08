import { Modal } from 'antd';
import type { CSSProperties } from 'react';
import type { RepairFull } from '../types';

interface InventoryPicklistModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  items: { key: number; inventoryItem: string; size: string; repairItem: string }[];
}

const sBar: CSSProperties = {
  background: 'var(--primary)', color: 'var(--card)',
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: 'var(--print-muted)', letterSpacing: '.04em',
};
const fv: CSSProperties = {
  borderBottom: '1px solid var(--neutral-500)', minHeight: 17, fontSize: 11, padding: '1px 2px',
};

export const InventoryPicklistModal = ({ open, onClose, repair, items }: InventoryPicklistModalProps) => {
  const dateDisplay = repair.dateIn || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={820} destroyOnClose>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '7px 20px', background: 'var(--primary)', color: 'var(--card)',
            border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div style={{ background: 'var(--card)', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: 'var(--print-text)' }}>

        {/* Form header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <img src="/logo-color.png" alt="Total Scope Inc." loading="lazy" style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Inventory Pick List</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Repair Parts & Inventory</div>
            <div style={{ fontSize: 11, color: 'var(--print-light)', marginTop: 2 }}>OM07-6</div>
          </div>
        </div>

        {/* Repair Information */}
        <div style={sBar}>Repair Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Client / Facility</span>
            <div style={fv}>{repair.client || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Date</span>
            <div style={fv}>{dateDisplay}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Scope Type / Model</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Technician</span>
            <div style={fv}>{repair.tech || '—'}</div>
          </div>
        </div>

        {/* Parts & Inventory table */}
        <div style={sBar}>Parts & Inventory Used</div>
        {items.length === 0 ? (
          <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
            No inventory items recorded for this repair.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 2, fontSize: 11 }}>
            <thead>
              <tr>
                {[
                  { label: 'Inventory Item', w: '36%', center: false },
                  { label: 'Inventory Size', w: '20%', center: true },
                  { label: 'Repair Item', w: '32%', center: false },
                  { label: 'Picked', w: '12%', center: true },
                ].map(h => (
                  <th key={h.label} style={{
                    background: 'var(--primary)', color: 'var(--card)', fontSize: 8, fontWeight: 700,
                    textTransform: 'uppercase', padding: '4px 8px',
                    textAlign: h.center ? 'center' : 'left', letterSpacing: '.03em',
                    borderRight: '1px solid rgba(255,255,255,.2)', width: h.w,
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.key} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--print-border-md)', borderRight: '1px solid var(--print-border-xlt)' }}>
                    {item.inventoryItem || '—'}
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--print-border-md)', borderRight: '1px solid var(--print-border-xlt)', textAlign: 'center' }}>
                    {item.size || '—'}
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--print-border-md)', borderRight: '1px solid var(--print-border-xlt)' }}>
                    {item.repairItem || '—'}
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--print-border-md)', textAlign: 'center' }}>
                    <span style={{
                      width: 12, height: 12, border: '1px solid var(--print-check-border)',
                      borderRadius: 2, display: 'inline-block', verticalAlign: 'middle',
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Completed By */}
        <div style={sBar}>Completed By</div>

        {/* Signature block */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[
            { label: 'Technician / Signature', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
            { label: 'Inventory Verified By', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }} />
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Barcode footer */}
        <div style={{
          marginTop: 12, border: '1px dashed var(--print-border)', borderRadius: 3,
          padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg)',
        }}>
          <div style={{
            width: 180, height: 44, background: 'var(--print-input-bg)', border: '1px solid var(--print-border)',
            borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, color: 'var(--print-placeholder)', letterSpacing: '.05em', textTransform: 'uppercase',
          }}>
            [ WO Barcode ]
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Work Order #', value: repair.wo, minWidth: 120 },
              { label: 'Serial #', value: repair.serial, minWidth: 100 },
              { label: 'Date', value: repair.dateIn || '', minWidth: 80 },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em' }}>
                  {f.label}
                </span>
                <div style={{ borderBottom: '1px solid var(--print-check-border)', minWidth: f.minWidth, minHeight: 16, fontSize: 11 }}>
                  {f.value || ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form footer */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--print-footer)' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>OM07-6</span>
        </div>
      </div>
    </Modal>
  );
};
