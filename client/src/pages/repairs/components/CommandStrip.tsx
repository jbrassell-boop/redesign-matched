import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { RepairFull } from '../types';
import { patchRepairHeader, checkRackPosition } from '../../../api/repairs';

interface CommandStripProps {
  repair: RepairFull;
  onRefresh?: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
};

const chipStyle = (hasValue: boolean): React.CSSProperties => ({
  background: 'var(--neutral-50)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: hasValue ? 'var(--navy)' : 'var(--muted)',
  fontStyle: hasValue ? 'normal' : 'italic',
  whiteSpace: 'nowrap',
});

// Display-only chip.
const Chip = ({ label, value, title }: { label: string; value?: string | null; title?: string }) => (
  <div title={title} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={labelStyle}>{label}</div>
    <div style={chipStyle(!!value)}>{value || '—'}</div>
  </div>
);

// Click-to-edit chip: Enter/blur commits, Esc cancels. `onSave` may reject the
// value by returning false (e.g. rack position already in use) — the chip then
// stays in edit mode so the user can correct it.
const EditableChip = ({ label, value, title, onSave }: {
  label: string;
  value?: string | null;
  title?: string;
  onSave: (next: string) => Promise<boolean>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // Synchronous re-entrancy guard: Enter then blur both call commit before
  // React commits saving=true, so a state check alone double-submits.
  const inFlightRef = useRef(false);
  // Last value onSave rejected — blur right after a rejected Enter would
  // otherwise re-submit the same value and double the warning.
  const rejectedRef = useRef<string | null>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next === (value ?? '')) { setEditing(false); return; }
    if (inFlightRef.current || next === rejectedRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    try {
      const ok = await onSave(next);
      if (ok) {
        rejectedRef.current = null;
        setEditing(false);
      } else {
        rejectedRef.current = next;
      }
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div title={title ? `${title} — click to edit` : 'Click to edit'} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={labelStyle}>{label}</div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          disabled={saving}
          onChange={e => { rejectedRef.current = null; setDraft(e.target.value); }}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(value ?? ''); }
          }}
          style={{
            ...chipStyle(true),
            fontFamily: 'inherit',
            outline: 'none',
            borderColor: 'var(--navy)',
            width: Math.max(64, draft.length * 7 + 24),
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ ...chipStyle(!!value), cursor: 'pointer', borderStyle: value ? 'solid' : 'dashed' }}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
};

export const CommandStrip = ({ repair, onRefresh }: CommandStripProps) => {
  // Legacy rule (WSRepairOpen): rack positions apply to flexible scopes;
  // rigid scopes live in trays and always show N/A.
  const isRigid = repair.rigidOrFlexible === 'R';

  const patchHeader = async (patch: { purchaseOrder?: string; rackLocation?: string }): Promise<boolean> => {
    try {
      await patchRepairHeader(repair.repairKey, patch);
      onRefresh?.();
      return true;
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      // 409 carries a specific reason (e.g. rack slot taken) — show it.
      message.error(resp?.status === 409 && resp.data?.message ? resp.data.message : 'Save failed');
      return false;
    }
  };

  const savePo = (next: string) => patchHeader({ purchaseOrder: next });

  const saveRack = async (next: string): Promise<boolean> => {
    if (next) {
      try {
        const inUseBy = await checkRackPosition(repair.repairKey, next);
        if (inUseBy) {
          message.warning(`Rack position is in use by W.O. #${inUseBy}`);
          return false;
        }
      } catch {
        message.error('Rack position check failed');
        return false;
      }
    }
    return patchHeader({ rackLocation: next });
  };

  const leadTime = repair.leadTimeDays != null ? `${repair.leadTimeDays}d` : null;
  const tat = repair.tatDays != null ? `${repair.tatDays}d` : null;
  const levelTitle = repair.levelDueDate
    ? `Highest item level on the quote. Promised by ${repair.levelDueDate} (${repair.levelDeliveryDays} business days from Date In)`
    : 'Highest item level on the quote — set once line items exist';

  return (
    <div style={{
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      padding: '8px 12px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px 12px',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      <Chip label="Client" value={repair.client} />
      <Chip label="Department" value={repair.dept} />
      <Chip label="WO#" value={repair.wo} title="Work Order Number" />
      <EditableChip label="PO#" value={repair.purchaseOrder} title="Purchase Order Number" onSave={savePo} />
      {isRigid ? (
        <Chip label="Rack" value="N/A" title="Rack positions apply to flexible scopes only" />
      ) : (
        <EditableChip label="Rack" value={repair.rackPosition} title="Rack position (must be free of other open WOs)" onSave={saveRack} />
      )}
      <Chip label="Repair Level" value={repair.repairLevel} title={levelTitle} />
      <Chip label="Lead Time" value={leadTime} title="Business days since Date In — runs from receipt, no approval needed" />
      <Chip label="TAT" value={tat} title="Turn Around Time: business days since customer approval — blank until approved" />
      <Chip label="Date In" value={repair.dateIn} />
    </div>
  );
};
