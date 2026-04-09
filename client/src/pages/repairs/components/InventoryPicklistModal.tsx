import { Modal } from 'antd';
import './InventoryPicklistModal.css';
import type { RepairFull } from '../types';

interface InventoryPicklistModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  items: { key: number; inventoryItem: string; size: string; repairItem: string }[];
}

export const InventoryPicklistModal = ({ open, onClose, repair, items }: InventoryPicklistModalProps) => {
  const dateDisplay = repair.dateIn || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={820} destroyOnClose>
      <div className="ipm-print-bar">
        <button onClick={() => window.print()} className="ipm-btn-print">
          Print / Save PDF
        </button>
      </div>

      <div className="ipm-body">

        {/* Form header */}
        <div className="ipm-header">
          <img src="/logo-color.png" alt="Total Scope Inc." loading="lazy" className="ipm-header__logo" />
          <div className="ipm-header__right">
            <div className="ipm-header__title">Inventory Pick List</div>
            <div className="ipm-header__subtitle">Repair Parts & Inventory</div>
            <div className="ipm-header__doc">OM07-6</div>
          </div>
        </div>

        {/* Repair Information */}
        <div className="ipm-sbar">Repair Information</div>
        <div className="ipm-info-grid">
          <div className="ipm-field">
            <span className="ipm-fl">Client / Facility</span>
            <div className="ipm-fv">{repair.client || '—'}</div>
          </div>
          <div className="ipm-field">
            <span className="ipm-fl">Date</span>
            <div className="ipm-fv">{dateDisplay}</div>
          </div>
          <div className="ipm-field">
            <span className="ipm-fl">Scope Type / Model</span>
            <div className="ipm-fv">{repair.scopeType || '—'}</div>
          </div>
          <div className="ipm-field">
            <span className="ipm-fl">Serial #</span>
            <div className="ipm-fv">{repair.serial || '—'}</div>
          </div>
          <div className="ipm-field">
            <span className="ipm-fl">Work Order #</span>
            <div className="ipm-fv">{repair.wo || '—'}</div>
          </div>
          <div className="ipm-field">
            <span className="ipm-fl">Technician</span>
            <div className="ipm-fv">{repair.tech || '—'}</div>
          </div>
        </div>

        {/* Parts & Inventory table */}
        <div className="ipm-sbar">Parts & Inventory Used</div>
        {items.length === 0 ? (
          <div className="ipm-empty">
            No inventory items recorded for this repair.
          </div>
        ) : (
          <table className="ipm-table">
            <thead>
              <tr>
                {[
                  { label: 'Inventory Item', w: '36%', center: false },
                  { label: 'Inventory Size', w: '20%', center: true },
                  { label: 'Repair Item', w: '32%', center: false },
                  { label: 'Picked', w: '12%', center: true },
                ].map(h => (
                  <th
                    key={h.label}
                    className={`ipm-th ${h.center ? 'ipm-th--center' : 'ipm-th--left'}`}
                    style={{ width: h.w }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.key} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td className="ipm-td">
                    {item.inventoryItem || '—'}
                  </td>
                  <td className="ipm-td ipm-td--center">
                    {item.size || '—'}
                  </td>
                  <td className="ipm-td">
                    {item.repairItem || '—'}
                  </td>
                  <td className="ipm-td--no-right ipm-td--center">
                    <span className="ipm-check-box" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Completed By */}
        <div className="ipm-sbar">Completed By</div>

        {/* Signature block — maxWidth varies per slot so kept inline */}
        <div className="ipm-sig-row">
          {[
            { label: 'Technician / Signature', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
            { label: 'Inventory Verified By', maxWidth: undefined as number | undefined },
            { label: 'Date', maxWidth: 130 as number | undefined },
          ].map((s, i) => (
            <div key={i} className="ipm-sig-block" style={s.maxWidth !== undefined ? { maxWidth: s.maxWidth } : undefined}>
              <div className="ipm-sig__line" />
              <div className="ipm-sig__label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Barcode footer */}
        <div className="ipm-barcode-footer">
          <div className="ipm-barcode-box">
            [ WO Barcode ]
          </div>
          <div className="ipm-barcode-fields">
            {[
              { label: 'Work Order #', value: repair.wo, minWidth: 120 },
              { label: 'Serial #', value: repair.serial, minWidth: 100 },
              { label: 'Date', value: repair.dateIn || '', minWidth: 80 },
            ].map(f => (
              <div key={f.label} className="ipm-barcode-field">
                <span className="ipm-barcode-label">{f.label}</span>
                <div className="ipm-barcode-val" style={{ minWidth: f.minWidth }}>
                  {f.value || ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form footer */}
        <div className="ipm-form-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>OM07-6</span>
        </div>
      </div>
    </Modal>
  );
};
