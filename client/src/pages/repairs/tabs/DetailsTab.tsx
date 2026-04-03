import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';
import type { ClientFlag } from '../../clients/types';
import { getRepairLineItems, updateRepairTechs, getRepairTechnicians } from '../../../api/repairs';
import type { TechnicianOption } from '../../../api/repairs';
import { RepairItemsTable } from '../components/RepairItemsTable';
import { AmendmentModal } from '../components/AmendmentModal';

interface DetailsTabProps {
  repair: RepairFull;
  flags: ClientFlag[];
}

const fieldStyle: React.CSSProperties = {
  height: 26, border: '1px solid #d1d5db', borderRadius: 3,
  background: '#fff', padding: '0 7px', fontSize: 11, color: '#374151',
  display: 'flex', alignItems: 'center',
};
const lblStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2,
};
const sectionHd: React.CSSProperties = {
  background: 'var(--neutral-50, #f9fafb)',
  padding: '5px 10px', fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: '.05em',
  borderBottom: '1px solid var(--border)',
  borderTop: '1px solid var(--border)',
};

export const DetailsTab = ({ repair, flags }: DetailsTabProps) => {
  const [items, setItems] = useState<RepairLineItem[]>([]);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendTranKey, setAmendTranKey] = useState<number | undefined>(undefined);
  // Update Techs modal
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [techList, setTechList] = useState<TechnicianOption[]>([]);
  const [selectedTech, setSelectedTech] = useState<number>(repair.techKey ?? 0);
  const [selectedTech2, setSelectedTech2] = useState<number | null>(null);
  const [techSaving, setTechSaving] = useState(false);

  const loadItems = useCallback(() => {
    getRepairLineItems(repair.repairKey)
      .then(setItems)
      .catch(() => message.error('Failed to load repair items'));
  }, [repair.repairKey]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const hasAmendments = (items ?? []).some(i => i.amendmentCount > 0);

  const handleOpenAmendments = (tranKey?: number) => {
    setAmendTranKey(tranKey);
    setAmendOpen(true);
  };

  const actionButtons = [
    { label: 'Consumption',     style: { background: 'var(--primary)', color: '#fff' } },
    { label: 'Unapproved',      style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Approved',        style: { background: 'var(--success)', color: '#fff' } },
    { label: 'Update Slips',    style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Amend Repair',    style: { background: 'var(--amber)', color: '#1a1a1a' } },
    { label: 'Defect Tracking', style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Update Techs',    style: { background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)', border: '1px solid var(--border)' }, action: () => {
      getRepairTechnicians().then(setTechList).catch(() => message.error('Failed to load technicians'));
      setSelectedTech(repair.techKey ?? 0);
      setSelectedTech2(null);
      setTechModalOpen(true);
    } },
    { label: 'Inventory',       style: { background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)', border: '1px solid var(--border)' } },
  ];

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>

      {/* Action bar */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
        padding: '7px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 }}>
          Actions
        </span>
        {actionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={() => (btn as any).action ? (btn as any).action() : message.info(`${btn.label} — coming soon`)}
            style={{
              height: 28, padding: '0 10px', borderRadius: 4,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', border: 'none',
              ...btn.style,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Main 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 10, alignItems: 'start' }}>

        {/* LEFT sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Complaint form */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Customer Complaint</div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 8 }}>
                <div>
                  <div style={lblStyle}>Repair Reason</div>
                  <div style={fieldStyle}>{repair.repairReason || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                </div>
                <div>
                  <div style={lblStyle}>PS Level</div>
                  <div style={fieldStyle}>{repair.psLevel || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                </div>
              </div>
              <div style={{
                minHeight: 64, border: '1px solid #d1d5db', borderRadius: 3,
                background: '#fff', padding: '6px 7px', fontSize: 11, color: '#374151', lineHeight: 1.4,
              }}>
                {repair.complaint || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No complaint recorded</span>}
              </div>
            </div>
          </div>

          {/* Angulation IN */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ ...sectionHd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Angulation IN</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['Reset', 'Override'] as const).map(lbl => (
                  <button key={lbl}
                    onClick={() => message.info(`${lbl} — coming soon`)}
                    style={{
                      height: 20, padding: '0 7px', fontSize: 9, fontWeight: 600,
                      background: '#fff', color: 'var(--navy)', border: '1px solid var(--border)',
                      borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 6 }}>
                {(['UP', 'DOWN', 'RIGHT', 'LEFT', 'Epoxy', 'Size'] as const).map(lbl => (
                  <div key={lbl}>
                    <div style={lblStyle}>{lbl}</div>
                    <div style={fieldStyle}>
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 10 }}>—</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={lblStyle}>Max Charge</div>
                <div style={fieldStyle}><span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 10 }}>—</span></div>
              </div>
            </div>
          </div>

          {/* Outsource */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Outsource</div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                {[
                  { label: 'Vendor', value: repair.outsourceVendor },
                  { label: 'Cost',   value: repair.outsourceCost != null ? `$${repair.outsourceCost}` : null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={lblStyle}>{label}</div>
                    <div style={fieldStyle}>{value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={lblStyle}>Tracking</div>
                  <div style={fieldStyle}>{repair.outsourceTracking || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Comments</div>
            <div style={{ padding: 10 }}>
              <div style={{
                minHeight: 44, border: '1px solid #d1d5db', borderRadius: 3,
                background: '#fff', padding: '6px 7px', fontSize: 10,
                color: '#9ca3af', fontStyle: 'italic', marginBottom: 8,
              }}>
                Add a comment…
              </div>
              {repair.notes && (
                <div style={{
                  background: '#f8faff', border: '1px solid #dce8f8',
                  borderRadius: 4, padding: '5px 7px',
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--navy)', marginBottom: 1 }}>Notes</div>
                  <div style={{ fontSize: 10, color: '#374151' }}>{repair.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: complaint banner + flags + items table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Complaint banner */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--primary)',
            borderRadius: '0 6px 6px 0',
            padding: '8px 12px',
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                  Customer Complaint
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                  {repair.complaint || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No complaint recorded</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Reason</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{repair.repairReason || '—'}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>PS Level</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{repair.psLevel || '—'}</div>
              </div>
            </div>
          </div>

          {/* Flags banner — only if flags exist or repair is urgent */}
          {(repair.isUrgent || flags.length > 0) && (
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderLeft: '4px solid var(--amber)',
              borderRadius: '0 6px 6px 0',
              padding: '7px 12px',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
                Flags
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {repair.isUrgent && (
                  <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    ⚑ Rush
                  </span>
                )}
                {flags.map((f) => (
                  <span key={f.flagKey} style={{ background: '#92400E', color: '#fff', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    ⚑ {f.flag}
                  </span>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#92400E', fontStyle: 'italic' }}>
                Review before proceeding
              </div>
            </div>
          )}

          {/* Repair items table */}
          <RepairItemsTable
            repairKey={repair.repairKey}
            items={items}
            onItemsChanged={loadItems}
            onOpenAmendments={handleOpenAmendments}
            hasAmendments={hasAmendments}
          />
          <AmendmentModal
            repairKey={repair.repairKey}
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            onAmendmentCreated={() => { loadItems(); setAmendOpen(false); }}
            prefillTranKey={amendTranKey}
          />
        </div>
      </div>

      {/* Update Techs Modal */}
      <Modal
        open={techModalOpen}
        onCancel={() => setTechModalOpen(false)}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Update Technicians</span>}
        footer={null}
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Primary Technician *</div>
            <select
              style={{ width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '0 8px' }}
              value={selectedTech}
              onChange={e => setSelectedTech(Number(e.target.value))}
            >
              <option value={0}>Select…</option>
              {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Secondary Technician</div>
            <select
              style={{ width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '0 8px' }}
              value={selectedTech2 ?? ''}
              onChange={e => setSelectedTech2(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setTechModalOpen(false)}
              style={{ padding: '5px 14px', borderRadius: 4, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              Cancel
            </button>
            <button
              disabled={techSaving || !selectedTech}
              onClick={async () => {
                if (!selectedTech) return;
                setTechSaving(true);
                try {
                  await updateRepairTechs(repair.repairKey, selectedTech, selectedTech2);
                  message.success('Technicians updated');
                  setTechModalOpen(false);
                } catch {
                  message.error('Failed to update technicians');
                } finally {
                  setTechSaving(false);
                }
              }}
              style={{ padding: '5px 14px', borderRadius: 4, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              {techSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
