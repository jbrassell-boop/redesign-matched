import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';
import type { ClientFlag } from '../../clients/types';
import { getRepairLineItems, updateRepairTechs, getRepairTechnicians, bulkApproveLineItems, getUpdateSlips, getDefectTracking, getRepairInventoryUsage, patchRepairHeader, type RepairHeaderPatch } from '../../../api/repairs';
import type { TechnicianOption } from '../../../api/repairs';
import { getRepairReasonOptions, type LookupOption } from '../../../api/lookups';
import { useAutosave } from '../../../hooks/useAutosave';
import { AutosaveIndicator } from '../../../components/common/AutosaveIndicator';
import { RepairItemsTable } from '../components/RepairItemsTable';
import { AmendmentModal } from '../components/AmendmentModal';
import { UpdateSlipsModal } from '../components/UpdateSlipsModal';
import { DefectTrackingModal } from '../components/DefectTrackingModal';
import { InventoryPicklistModal } from '../components/InventoryPicklistModal';

interface DetailsTabProps {
  repair: RepairFull;
  flags: ClientFlag[];
}

const fieldStyle: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  display: 'flex', alignItems: 'center',
};
const lblStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4,
};
const sectionHd: React.CSSProperties = {
  background: 'var(--neutral-50, var(--bg))',
  padding: '7px 14px', fontSize: 10.5, fontWeight: 700, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: '.05em',
  borderBottom: '1px solid var(--border)',
  borderTop: '1px solid var(--border)',
};

// ── Extracted static styles ──
const detailsContainerStyle: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' };
const dtActionBarStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '7px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
};
const dtActionsLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 };
const dtActionBtnBaseStyle: React.CSSProperties = {
  height: 28, padding: '0 10px', borderRadius: 4,
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', border: 'none',
};
const dtCardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' };
const dtSectionHdFlexStyle: React.CSSProperties = { ...sectionHd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const dtFormPadStyle: React.CSSProperties = { padding: '8px 12px' };
const dtTwoColGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', marginBottom: 8 };
const dtTextareaStyle: React.CSSProperties = {
  minHeight: 64, width: '100%', border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '6px 7px', fontSize: 11, color: 'var(--label)', lineHeight: 1.4,
  resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
};
const dtAngBtnGroupStyle: React.CSSProperties = { display: 'flex', gap: 3 };
const dtAngSmallBtnStyle: React.CSSProperties = {
  height: 20, padding: '0 7px', fontSize: 9, fontWeight: 600,
  background: 'var(--card)', color: 'var(--navy)', border: '1px solid var(--border)',
  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
};
const dtThreeColGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 6 };
const dtEmptyFieldStyle: React.CSSProperties = { color: 'var(--muted)', fontStyle: 'italic', fontSize: 10 };
const dtCommentPlaceholderStyle: React.CSSProperties = {
  minHeight: 44, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '6px 7px', fontSize: 10,
  color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8,
};
const dtNotesBoxStyle: React.CSSProperties = {
  background: 'var(--info-section-bg)', border: '1px solid var(--info-section-border)',
  borderRadius: 4, padding: '5px 7px',
};
const dtNotesLabelStyle: React.CSSProperties = { fontSize: 8, fontWeight: 700, color: 'var(--navy)', marginBottom: 1 };
const dtNotesTextStyle: React.CSSProperties = { fontSize: 10, color: 'var(--label)' };
const dtFlagsBannerStyle: React.CSSProperties = {
  background: 'var(--amber-light)',
  border: '1px solid var(--amber-border)',
  borderLeft: '4px solid var(--amber)',
  borderRadius: '0 6px 6px 0',
  padding: '7px 12px',
  display: 'flex', gap: 10, alignItems: 'center',
};
const dtFlagsLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'var(--badge-amber-text)', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 };
const dtFlagsRowStyle: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const dtRushBadgeStyle: React.CSSProperties = { background: 'var(--danger)', color: 'var(--card)', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 };
const dtFlagBadgeStyle: React.CSSProperties = { background: 'var(--badge-amber-text)', color: 'var(--card)', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 };
const dtFlagsReviewStyle: React.CSSProperties = { marginLeft: 'auto', fontSize: 10, color: 'var(--badge-amber-text)', fontStyle: 'italic' };
const dtTechModalTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--navy)' };
const dtTechModalBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' };
const dtTechFieldLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 };
const dtTechSelectStyle: React.CSSProperties = { width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '0 8px' };
const dtTechBtnRowStyle: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 };
const dtCancelBtnStyle: React.CSSProperties = { padding: '5px 14px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontSize: 12 };
const dtSaveBtnStyle: React.CSSProperties = { padding: '5px 14px', borderRadius: 4, border: 'none', background: 'var(--primary)', color: 'var(--card)', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const dtOutsourceGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px' };

export const DetailsTab = ({ repair, flags }: DetailsTabProps) => {
  const [items, setItems] = useState<RepairLineItem[]>([]);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendTranKey, setAmendTranKey] = useState<number | undefined>(undefined);
  // Data modals
  const [slipsModalOpen, setSlipsModalOpen] = useState(false);
  const [slipsData, setSlipsData] = useState<{ slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[]>([]);
  const [defectsModalOpen, setDefectsModalOpen] = useState(false);
  const [defectsData, setDefectsData] = useState<{ itemKey: number; item: string; comment: string }[]>([]);
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [invData, setInvData] = useState<{ key: number; inventoryItem: string; size: string; repairItem: string }[]>([]);
  // Update Techs modal
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [techList, setTechList] = useState<TechnicianOption[]>([]);
  const [selectedTech, setSelectedTech] = useState<number>(repair.techKey ?? 0);
  const [selectedTech2, setSelectedTech2] = useState<number | null>(null);
  const [techSaving, setTechSaving] = useState(false);

  // ── Complaint section: editable state ──
  const [repairReasons, setRepairReasons] = useState<LookupOption[]>([]);
  const [repairReason, setRepairReason] = useState(repair.repairReason ?? '');
  const [psLevel, setPsLevel] = useState(repair.psLevel ?? '');
  const [complaint, setComplaint] = useState(repair.complaint ?? '');

  useEffect(() => {
    getRepairReasonOptions().then(setRepairReasons).catch(() => { message.error('Failed to load repair reasons'); });
  }, []);

  const detailsSaveFn = useCallback(
    (data: Partial<RepairHeaderPatch>) => patchRepairHeader(repair.repairKey, data),
    [repair.repairKey],
  );
  const { handleChange: detailsChange, status: detailsStatus } = useAutosave<RepairHeaderPatch>(detailsSaveFn, 800);

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
    { label: 'Consumption',     style: { background: 'var(--primary)', color: 'var(--card)' }, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, 'Y'); loadItems(); message.success('All items approved (consumption)'); }
      catch { message.error('Failed to approve items'); }
    } },
    { label: 'Unapproved',      style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, ''); loadItems(); message.success('All items unapproved'); }
      catch { message.error('Failed to unapprove items'); }
    } },
    { label: 'Approved',        style: { background: 'var(--success)', color: 'var(--card)' }, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, 'Y'); loadItems(); message.success('All items approved'); }
      catch { message.error('Failed to approve items'); }
    } },
    { label: 'Update Slips',    style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: () => {
      getUpdateSlips(repair.repairKey).then(setSlipsData).catch(() => message.error('Failed to load update slips'));
      setSlipsModalOpen(true);
    } },
    { label: 'Amend Repair',    style: { background: 'var(--amber)', color: 'var(--text-near-black)' }, action: () => {
      handleOpenAmendments();
    } },
    { label: 'Defect Tracking', style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: () => {
      getDefectTracking(repair.repairKey).then(setDefectsData).catch(() => message.error('Failed to load defect tracking'));
      setDefectsModalOpen(true);
    } },
    { label: 'Update Techs',    style: { background: 'var(--neutral-50, var(--bg))', color: 'var(--navy)', border: '1px solid var(--border)' }, action: () => {
      getRepairTechnicians().then(setTechList).catch(() => message.error('Failed to load technicians'));
      setSelectedTech(repair.techKey ?? 0);
      setSelectedTech2(null);
      setTechModalOpen(true);
    } },
    { label: 'Inventory',       style: { background: 'var(--neutral-50, var(--bg))', color: 'var(--navy)', border: '1px solid var(--border)' }, action: () => {
      getRepairInventoryUsage(repair.repairKey).then(setInvData).catch(() => message.error('Failed to load inventory'));
      setInvModalOpen(true);
    } },
  ];

  return (
    <div style={detailsContainerStyle}>

      {/* Action bar */}
      <div style={dtActionBarStyle}>
        <span style={dtActionsLabelStyle}>
          Actions
        </span>
        {actionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={() => (btn as any).action ? (btn as any).action() : message.warning('Action not configured')}
            style={{
              ...dtActionBtnBaseStyle,
              ...btn.style,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Customer Complaint — editable */}
      <div style={dtCardStyle}>
        <div style={dtSectionHdFlexStyle}>
          <span>Customer Complaint</span>
          <AutosaveIndicator status={detailsStatus} />
        </div>
        <div style={dtFormPadStyle}>
          <div style={dtTwoColGridStyle}>
            <div>
              <div style={lblStyle}>Repair Reason</div>
              <select
                style={{ ...fieldStyle, width: '100%', appearance: 'auto', fontFamily: 'inherit' }}
                value={repairReason}
                onChange={e => { setRepairReason(e.target.value); detailsChange('repairReason', e.target.value || undefined); }}
              >
                <option value="">—</option>
                {repairReasons.map(r => <option key={r.key} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <div style={lblStyle}>PS Level</div>
              <select
                style={{ ...fieldStyle, width: '100%', appearance: 'auto', fontFamily: 'inherit' }}
                value={psLevel}
                onChange={e => { setPsLevel(e.target.value); detailsChange('psLevel', e.target.value || undefined); }}
              >
                <option value="">—</option>
                {['PS1', 'PS2', 'PS3', 'PS4', 'PS5'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <textarea
            style={dtTextareaStyle}
            value={complaint}
            onChange={e => { setComplaint(e.target.value); detailsChange('complaint', e.target.value || undefined); }}
            placeholder="No complaint recorded"
            aria-label="Customer complaint"
          />
        </div>
      </div>

      {/* Flags banner — only if flags exist or repair is urgent */}
      {(repair.isUrgent || flags.length > 0) && (
        <div style={dtFlagsBannerStyle}>
          <div style={dtFlagsLabelStyle}>
            Flags
          </div>
          <div style={dtFlagsRowStyle}>
            {repair.isUrgent && (
              <span style={dtRushBadgeStyle}>
                ⚑ Rush
              </span>
            )}
            {flags.map((f) => (
              <span key={f.flagKey} style={dtFlagBadgeStyle}>
                ⚑ {f.flag}
              </span>
            ))}
          </div>
          <div style={dtFlagsReviewStyle}>
            Review before proceeding
          </div>
        </div>
      )}

      {/* Repair items table — full width */}
      <RepairItemsTable
        repairKey={repair.repairKey}
        items={items}
        onItemsChanged={loadItems}
        onOpenAmendments={handleOpenAmendments}
        hasAmendments={hasAmendments}
      />
      <AmendmentModal
        repairKey={repair.repairKey}
        repair={repair}
        open={amendOpen}
        onClose={() => setAmendOpen(false)}
        onAmendmentCreated={() => { loadItems(); setAmendOpen(false); }}
        prefillTranKey={amendTranKey}
      />

      {/* Angulation IN */}
      <div style={dtCardStyle}>
        <div style={dtSectionHdFlexStyle}>
          <span>Angulation IN</span>
          <div style={dtAngBtnGroupStyle}>
            {(['Reset', 'Override'] as const).map(lbl => (
              <button key={lbl}
                onClick={() => message.info(`${lbl} angulation — use Inspections tab`)}
                style={dtAngSmallBtnStyle}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={dtFormPadStyle}>
          <div style={dtThreeColGridStyle}>
            {(['UP', 'DOWN', 'RIGHT', 'LEFT', 'Epoxy', 'Size'] as const).map(lbl => (
              <div key={lbl}>
                <div style={lblStyle}>{lbl}</div>
                <div style={fieldStyle}>
                  <span style={dtEmptyFieldStyle}>—</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={lblStyle}>Max Charge</div>
            <div style={fieldStyle}><span style={dtEmptyFieldStyle}>—</span></div>
          </div>
        </div>
      </div>

      {/* Outsource */}
      <div style={dtCardStyle}>
        <div style={sectionHd}>Outsource</div>
        <div style={dtFormPadStyle}>
          <div style={dtOutsourceGridStyle}>
            {[
              { label: 'Vendor', value: repair.outsourceVendor },
              { label: 'Cost',   value: repair.outsourceCost != null ? `$${repair.outsourceCost}` : null },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={lblStyle}>{label}</div>
                <div style={fieldStyle}>{value || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={lblStyle}>Tracking</div>
              <div style={fieldStyle}>{repair.outsourceTracking || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div style={dtCardStyle}>
        <div style={sectionHd}>Comments</div>
        <div style={dtFormPadStyle}>
          <div style={dtCommentPlaceholderStyle}>
            Add a comment…
          </div>
          {repair.notes && (
            <div style={dtNotesBoxStyle}>
              <div style={dtNotesLabelStyle}>Notes</div>
              <div style={dtNotesTextStyle}>{repair.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Update Techs Modal */}
      <Modal
        open={techModalOpen}
        onCancel={() => setTechModalOpen(false)}
        title={<span style={dtTechModalTitleStyle}>Update Technicians</span>}
        footer={null}
        width={400}
      >
        <div style={dtTechModalBodyStyle}>
          <div>
            <div style={dtTechFieldLabelStyle}>Primary Technician *</div>
            <select
              style={dtTechSelectStyle}
              value={selectedTech}
              onChange={e => setSelectedTech(Number(e.target.value))}
            >
              <option value={0}>Select…</option>
              {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
            </select>
          </div>
          <div>
            <div style={dtTechFieldLabelStyle}>Secondary Technician</div>
            <select
              style={dtTechSelectStyle}
              value={selectedTech2 ?? ''}
              onChange={e => setSelectedTech2(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
            </select>
          </div>
          <div style={dtTechBtnRowStyle}>
            <button onClick={() => setTechModalOpen(false)}
              style={dtCancelBtnStyle}>
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
              style={dtSaveBtnStyle}>
              {techSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <UpdateSlipsModal
        open={slipsModalOpen}
        onClose={() => setSlipsModalOpen(false)}
        repair={repair}
        slips={slipsData}
        onSlipCreated={() => {
          getUpdateSlips(repair.repairKey).then(setSlipsData).catch(() => { message.error('Failed to load update slips'); });
        }}
      />
      <DefectTrackingModal
        open={defectsModalOpen}
        onClose={() => setDefectsModalOpen(false)}
        repair={repair}
        defects={defectsData}
      />
      <InventoryPicklistModal
        open={invModalOpen}
        onClose={() => setInvModalOpen(false)}
        repair={repair}
        items={invData}
      />
    </div>
  );
};
