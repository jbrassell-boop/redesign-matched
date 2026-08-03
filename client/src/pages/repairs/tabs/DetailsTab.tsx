import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  /** Optional refresh callback. Fired after a write that changes the repair
   *  header (Update Techs) so the cockpit can re-fetch the repair AND the line
   *  items — the tech push lands on both. */
  onRepairChanged?: () => void;
}

const fieldStyle: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  display: 'flex', alignItems: 'center',
};
const lblStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4,
};
const sectionHd: React.CSSProperties = {
  background: 'var(--neutral-50, var(--bg))',
  padding: '7px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--navy)',
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
const dtActionsLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 };
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

const dtCommentPlaceholderStyle: React.CSSProperties = {
  minHeight: 44, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '6px 7px', fontSize: 11,
  color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8,
};
const dtNotesBoxStyle: React.CSSProperties = {
  background: 'var(--info-section-bg)', border: '1px solid var(--info-section-border)',
  borderRadius: 4, padding: '5px 7px',
};
const dtNotesLabelStyle: React.CSSProperties = { fontSize: 8, fontWeight: 700, color: 'var(--navy)', marginBottom: 1 };
const dtNotesTextStyle: React.CSSProperties = { fontSize: 11, color: 'var(--label)' };
const dtFlagsBannerStyle: React.CSSProperties = {
  background: 'var(--amber-light)',
  border: '1px solid var(--amber-border)',
  borderLeft: '4px solid var(--amber)',
  borderRadius: '0 6px 6px 0',
  padding: '7px 12px',
  display: 'flex', gap: 10, alignItems: 'center',
};
const dtFlagsLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--badge-amber-text)', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 };
const dtFlagsRowStyle: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const dtRushBadgeStyle: React.CSSProperties = { background: 'var(--danger)', color: 'var(--card)', padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
const dtFlagBadgeStyle: React.CSSProperties = { background: 'var(--badge-amber-text)', color: 'var(--card)', padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
const dtFlagsReviewStyle: React.CSSProperties = { marginLeft: 'auto', fontSize: 11, color: 'var(--badge-amber-text)', fontStyle: 'italic' };
const dtTechModalTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--navy)' };
const dtTechModalBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' };
const dtTechFieldLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 };
const dtTechSelectStyle: React.CSSProperties = { width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '0 8px' };
const dtTechHintStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 };
const dtReadOnlyBannerStyle: React.CSSProperties = {
  background: 'var(--info-section-bg)', border: '1px solid var(--info-section-border)',
  borderLeft: '4px solid var(--primary)', borderRadius: '0 6px 6px 0',
  padding: '7px 12px', display: 'flex', gap: 10, alignItems: 'center',
};
const dtReadOnlyLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 };
const dtReadOnlyTextStyle: React.CSSProperties = { fontSize: 11, color: 'var(--label)' };
const dtTechBtnRowStyle: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 };
const dtCancelBtnStyle: React.CSSProperties = { padding: '5px 14px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontSize: 12 };
const dtSaveBtnStyle: React.CSSProperties = { padding: '5px 14px', borderRadius: 4, border: 'none', background: 'var(--primary)', color: 'var(--card)', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const dtOutsourceGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px' };

export const DetailsTab = memo(({ repair, flags, onRepairChanged }: DetailsTabProps) => {
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
  // Update Techs modal — legacy frmRepairOpen_UpdateTech: pick a SLOT (Tech 1 /
  // Tech 2), pick a SCOPE for the line-item push, pick the technician, confirm.
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [techList, setTechList] = useState<TechnicianOption[]>([]);
  const [techSlot, setTechSlot] = useState<1 | 2>(1);
  const [techScopeAll, setTechScopeAll] = useState(true);
  const [selectedTech, setSelectedTech] = useState<number>(repair.techKey ?? 0);
  const [techSaving, setTechSaving] = useState(false);

  // A FINALIZED invoice makes the repair read-only server-side. Being closed
  // does NOT — legacy's closed checkbox locks nothing (see RepairLock.cs), and
  // 99.5% of repairs carry the flag. Surface the lock and disable the writes so
  // the user sees a state, not a 409 toast.
  const readOnly = repair.isReadOnly ?? false;

  // Preload the CURRENT occupant of the selected slot. Only one slot is written
  // per save now, so the old "always null the secondary" default (which erased
  // an existing Tech 2 on every save) has no equivalent here.
  const slotCurrentKey = useCallback(
    (slot: 1 | 2) => (slot === 1 ? repair.techKey ?? 0 : repair.tech2Key ?? 0),
    [repair.techKey, repair.tech2Key],
  );

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

  const actionButtons = useMemo(() => [
    { label: 'Consumption',     mutates: true, style: { background: 'var(--primary)', color: 'var(--card)' } as React.CSSProperties, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, 'Y'); loadItems(); message.success('All items approved (consumption)'); }
      catch { message.error('Failed to approve items'); }
    } },
    { label: 'Unapproved',      mutates: true, style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, ''); loadItems(); message.success('All items unapproved'); }
      catch { message.error('Failed to unapprove items'); }
    } },
    { label: 'Approved',        mutates: true, style: { background: 'var(--success)', color: 'var(--card)' }, action: async () => {
      try { await bulkApproveLineItems(repair.repairKey, 'Y'); loadItems(); message.success('All items approved'); }
      catch { message.error('Failed to approve items'); }
    } },
    { label: 'Update Slips',    mutates: false, style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: () => {
      getUpdateSlips(repair.repairKey).then(setSlipsData).catch(() => message.error('Failed to load update slips'));
      setSlipsModalOpen(true);
    } },
    { label: 'Amend Repair',    mutates: true, style: { background: 'var(--amber)', color: 'var(--text-near-black)' }, action: () => {
      handleOpenAmendments();
    } },
    { label: 'Defect Tracking', mutates: false, style: { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }, action: () => {
      getDefectTracking(repair.repairKey).then(setDefectsData).catch(() => message.error('Failed to load defect tracking'));
      setDefectsModalOpen(true);
    } },
    { label: 'Update Techs',    mutates: true, style: { background: 'var(--neutral-50, var(--bg))', color: 'var(--navy)', border: '1px solid var(--border)' }, action: () => {
      // Repair-scoped list: outsource vendors for an outsourced WO, otherwise
      // techs qualified for this scope type (legacy techsGet filtering).
      getRepairTechnicians(repair.repairKey).then(setTechList).catch(() => message.error('Failed to load technicians'));
      setTechSlot(1);
      setTechScopeAll(true);
      setSelectedTech(repair.techKey ?? 0);
      setTechModalOpen(true);
    } },
    { label: 'Inventory',       mutates: false, style: { background: 'var(--neutral-50, var(--bg))', color: 'var(--navy)', border: '1px solid var(--border)' } as React.CSSProperties, action: () => {
      getRepairInventoryUsage(repair.repairKey).then(setInvData).catch(() => message.error('Failed to load inventory'));
      setInvModalOpen(true);
    } },
  ], [repair.repairKey, repair.techKey, loadItems]);

  return (
    <div style={detailsContainerStyle}>

      {/* Read-only banner — an invoice-finalized repair is locked server-side,
          so say so instead of letting the writes 409. Closed repairs are NOT
          locked and get no banner. */}
      {readOnly && (
        <div style={dtReadOnlyBannerStyle}>
          <div style={dtReadOnlyLabelStyle}>Read Only</div>
          <div style={dtReadOnlyTextStyle}>
            This repair’s invoice is finalized. Void the invoice to make changes.
          </div>
        </div>
      )}

      {/* Action bar */}
      <div style={dtActionBarStyle}>
        <span style={dtActionsLabelStyle}>
          Actions
        </span>
        {actionButtons.map(btn => {
          const disabled = readOnly && btn.mutates === true;
          return (
            <button
              key={btn.label}
              disabled={disabled}
              title={disabled ? 'This repair is read-only — its invoice is finalized.' : undefined}
              onClick={() => (btn as any).action ? (btn as any).action() : message.warning('Action not configured')}
              style={{
                ...dtActionBtnBaseStyle,
                ...btn.style,
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {btn.label}
            </button>
          );
        })}
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
                aria-label="Repair Reason"
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
                aria-label="PS Level"
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


      {/* Outsource */}
      <div style={dtCardStyle}>
        <h3 style={sectionHd}>Outsource</h3>
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
        <h3 style={sectionHd}>Comments</h3>
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
            <div style={dtTechFieldLabelStyle}>Tech 1 or 2</div>
            <select
              aria-label="Technician slot"
              style={dtTechSelectStyle}
              value={techSlot}
              onChange={e => {
                const slot = Number(e.target.value) === 2 ? 2 : 1;
                setTechSlot(slot);
                // Preload whoever currently holds the newly-selected slot.
                setSelectedTech(slotCurrentKey(slot));
              }}
            >
              <option value={1}>Tech 1</option>
              <option value={2}>Tech 2</option>
            </select>
          </div>
          <div>
            <div style={dtTechFieldLabelStyle}>Repair Items</div>
            <select
              aria-label="Repair items scope"
              style={dtTechSelectStyle}
              value={techScopeAll ? 'all' : 'unteched'}
              onChange={e => setTechScopeAll(e.target.value === 'all')}
            >
              <option value="all">All Repair Items</option>
              <option value="unteched">Repair Items without Tech</option>
            </select>
          </div>
          <div>
            <div style={dtTechFieldLabelStyle}>Technician *</div>
            <select
              aria-label="Technician"
              style={dtTechSelectStyle}
              value={selectedTech}
              onChange={e => setSelectedTech(Number(e.target.value))}
            >
              <option value={0}>Select…</option>
              {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
            </select>
          </div>
          <div style={dtTechHintStyle}>
            Sets {techSlot === 1 ? 'Tech 1' : 'Tech 2'} on this work order and assigns the
            technician to {techScopeAll ? 'all repair items' : 'repair items that have no tech yet'}.
            The other tech slot is left unchanged.
          </div>
          <div style={dtTechBtnRowStyle}>
            <button onClick={() => setTechModalOpen(false)}
              style={dtCancelBtnStyle}>
              Cancel
            </button>
            <button
              disabled={techSaving || !selectedTech}
              onClick={() => {
                if (!selectedTech) return;
                const techName = techList.find(t => t.techKey === selectedTech)?.techName ?? '';
                Modal.confirm({
                  title: 'Confirm Update',
                  content: `Are you sure you want to update the technicians? ${techName || 'The selected technician'} will be set as ${techSlot === 1 ? 'Tech 1' : 'Tech 2'} and applied to ${techScopeAll ? 'all repair items' : 'repair items without a tech'}.`,
                  okText: 'Update',
                  onOk: async () => {
                    setTechSaving(true);
                    try {
                      const r = await updateRepairTechs(repair.repairKey, selectedTech, {
                        tech1: techSlot === 1,
                        allRepairItems: techScopeAll,
                      });
                      message.success(`Technicians updated — ${r.lineItemsUpdated} repair item${r.lineItemsUpdated === 1 ? '' : 's'} assigned`);
                      setTechModalOpen(false);
                      // Refresh the line items this tab owns AND ask the cockpit
                      // to re-fetch the repair, so the header techs and the TECH
                      // column both stop showing stale data.
                      loadItems();
                      onRepairChanged?.();
                    } catch {
                      message.error('Failed to update technicians');
                    } finally {
                      setTechSaving(false);
                    }
                  },
                });
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
});
