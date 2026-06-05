import { useState, useEffect, useMemo } from 'react';
import { Modal, message } from 'antd';
import { useServiceLocation } from '../../hooks/useServiceLocation';
import {
  createInventoryPurchaseOrder,
  getSupplierInventory,
  type CreateInventoryPoLine,
} from '../../api/suppliers';
import { getSupplierPoTypes, type LookupOption } from '../../api/lookups';
import type { SupplierInventoryItem } from './types';

// ── Shared form-field styles (mirrors NewRepairModal so it feels native) ──
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fieldStyle: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none',
};
const sectionHead: React.CSSProperties = {
  background: 'var(--navy)', color: 'var(--card)', padding: '4px 10px',
  fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' };

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);

interface Props {
  open: boolean;
  supplierKey: number;
  supplierName: string;
  onClose: () => void;
  onCreated: (poNumber: string) => void;
}

type LineRow = { supplierSizesKey: number | null; orderQuantity: number; unitCost: number };

const blankLine = (): LineRow => ({ supplierSizesKey: null, orderQuantity: 1, unitCost: 0 });

export const CreateInventoryPoModal = ({ open, supplierKey, supplierName, onClose, onCreated }: Props) => {
  const { locationKey, locations } = useServiceLocation();

  const [poTypes, setPoTypes] = useState<LookupOption[]>([]);
  const [supplierSizes, setSupplierSizes] = useState<SupplierInventoryItem[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [serviceLocationKey, setServiceLocationKey] = useState<number>(locationKey);
  // Backend lookup IDs: 1 = Parts, 2 = Instruments For Sale. Parts is the right
  // default per spec — most inventory POs are parts replenishment.
  const [supplierPOTypeKey, setSupplierPOTypeKey] = useState<number>(1);
  const [dateOfPO, setDateOfPO] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineRow[]>([blankLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form + reload lookups whenever the modal opens against a supplier.
  // Sizes are per-supplier (the backend ownership check 400s if a size from
  // another supplier sneaks in), so we re-fetch when supplierKey changes.
  useEffect(() => {
    if (!open) return;
    setServiceLocationKey(locationKey);
    setSupplierPOTypeKey(1);
    setDateOfPO(new Date().toISOString().slice(0, 10));
    setLines([blankLine()]);
    setErrorMsg(null);

    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([getSupplierPoTypes(), getSupplierInventory(supplierKey)])
      .then(([types, sizes]) => {
        if (cancelled) return;
        setPoTypes(types);
        setSupplierSizes(sizes.filter(s => s.isActive));
      })
      .catch(() => { if (!cancelled) message.error('Failed to load PO form data'); })
      .finally(() => { if (!cancelled) setLoadingLookups(false); });
    return () => { cancelled = true; };
  }, [open, supplierKey, locationKey]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.orderQuantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines],
  );

  const updateLine = (i: number, patch: Partial<LineRow>) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (i: number) => setLines(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  // Apply the size's catalog unit cost when the user picks a size (only when
  // they haven't already overridden the cost — a typed value wins over the lookup).
  const pickSize = (i: number, supplierSizesKey: number) => {
    const size = supplierSizes.find(s => s.supplierSizesKey === supplierSizesKey);
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const useCatalogCost = !l.unitCost || l.unitCost === 0;
      return {
        ...l,
        supplierSizesKey,
        unitCost: useCatalogCost && size ? size.unitCost : l.unitCost,
      };
    }));
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    // Client-side guards mirroring the API's 400 paths — quick feedback.
    if (!serviceLocationKey) { setErrorMsg('Service location is required.'); return; }
    if (!supplierPOTypeKey) { setErrorMsg('PO type is required.'); return; }
    if (lines.length === 0) { setErrorMsg('At least one line is required.'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.supplierSizesKey) { setErrorMsg(`Line ${i + 1}: pick an item.`); return; }
      if (!l.orderQuantity || l.orderQuantity <= 0) { setErrorMsg(`Line ${i + 1}: quantity must be > 0.`); return; }
      if (l.unitCost < 0) { setErrorMsg(`Line ${i + 1}: unit cost cannot be negative.`); return; }
    }

    setSubmitting(true);
    try {
      const payload: CreateInventoryPoLine[] = lines.map(l => ({
        supplierSizesKey: l.supplierSizesKey!,
        orderQuantity: Number(l.orderQuantity),
        unitCost: Number(l.unitCost),
      }));
      const res = await createInventoryPurchaseOrder(supplierKey, {
        serviceLocationKey,
        supplierPOTypeKey,
        dateOfPO: dateOfPO || null,
        lines: payload,
      });
      message.success(`PO ${res.supplierPONumber} created (total $${res.poTotal.toFixed(2)})`);
      onCreated(res.supplierPONumber);
    } catch (e) {
      // apiClient interceptor surfaces the backend `message` field on Error.message.
      const msg = e instanceof Error ? e.message : 'Failed to create PO';
      setErrorMsg(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Inventory PO — {supplierName}</span>}
      width={760}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      <div style={sectionHead}>Header</div>
      <div style={grid3}>
        <F label="Service Location *">
          <select
            value={serviceLocationKey}
            onChange={e => setServiceLocationKey(Number(e.target.value))}
            style={fieldStyle}
            aria-label="Service location"
          >
            {locations.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </F>
        <F label="PO Type *">
          <select
            value={supplierPOTypeKey}
            onChange={e => setSupplierPOTypeKey(Number(e.target.value))}
            style={fieldStyle}
            aria-label="PO type"
          >
            {poTypes.length === 0
              ? <>
                  <option value={1}>Parts</option>
                  <option value={2}>Instruments For Sale</option>
                </>
              : poTypes.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </F>
        <F label="Date">
          <input
            type="date"
            value={dateOfPO}
            onChange={e => setDateOfPO(e.target.value)}
            style={fieldStyle}
            aria-label="Date of PO"
          />
        </F>
      </div>

      <div style={sectionHead}>Lines</div>
      {loadingLookups && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Loading supplier catalog…</div>
      )}
      {!loadingLookups && supplierSizes.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>
          This supplier has no active sizes/parts — can't add lines until the catalog is populated.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 28px', gap: '4px 8px', alignItems: 'center' }}>
        <div style={labelStyle}>Item</div>
        <div style={labelStyle}>Qty</div>
        <div style={labelStyle}>Unit Cost</div>
        <div />

        {lines.map((line, i) => (
          <ItemRow
            key={i}
            line={line}
            supplierSizes={supplierSizes}
            canRemove={lines.length > 1}
            onSize={k => pickSize(i, k)}
            onQty={v => updateLine(i, { orderQuantity: v })}
            onCost={v => updateLine(i, { unitCost: v })}
            onRemove={() => removeLine(i)}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={addLine}
          disabled={supplierSizes.length === 0}
          style={{
            height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600,
            background: 'var(--neutral-100)', color: 'var(--navy)',
            border: '1px solid var(--border)', borderRadius: 3,
            cursor: supplierSizes.length === 0 ? 'default' : 'pointer',
            opacity: supplierSizes.length === 0 ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          + Add Line
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
          Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 10, padding: '6px 10px', fontSize: 11.5, fontWeight: 600,
            color: 'var(--danger)', background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 4,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          style={{
            height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600,
            background: 'var(--neutral-100)', color: 'var(--navy)',
            border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || supplierSizes.length === 0}
          style={{
            height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700,
            background: 'var(--primary)', color: 'var(--card)', border: 'none',
            borderRadius: 4, cursor: submitting ? 'default' : 'pointer',
            opacity: (submitting || supplierSizes.length === 0) ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Creating…' : 'Create PO'}
        </button>
      </div>
    </Modal>
  );
};

// ── Line row (extracted because it has several inputs and reads better separately) ──
const ItemRow = ({
  line, supplierSizes, canRemove, onSize, onQty, onCost, onRemove,
}: {
  line: LineRow;
  supplierSizes: SupplierInventoryItem[];
  canRemove: boolean;
  onSize: (k: number) => void;
  onQty: (v: number) => void;
  onCost: (v: number) => void;
  onRemove: () => void;
}) => (
  <>
    <select
      value={line.supplierSizesKey ?? ''}
      onChange={e => onSize(Number(e.target.value))}
      style={fieldStyle}
      aria-label="Supplier size"
    >
      <option value="">— select item —</option>
      {supplierSizes.map(s => (
        <option key={s.supplierSizesKey} value={s.supplierSizesKey}>
          {s.itemDescription} — {s.sizeDescription}
          {s.supplierPartNo ? ` (${s.supplierPartNo})` : ''}
        </option>
      ))}
    </select>
    <input
      type="number"
      min={1}
      step={1}
      value={line.orderQuantity}
      onChange={e => onQty(Number(e.target.value))}
      style={fieldStyle}
      aria-label="Order quantity"
    />
    <input
      type="number"
      min={0}
      step="0.01"
      value={line.unitCost}
      onChange={e => onCost(Number(e.target.value))}
      style={fieldStyle}
      aria-label="Unit cost"
    />
    <button
      type="button"
      onClick={onRemove}
      disabled={!canRemove}
      aria-label="Remove line"
      style={{
        height: 28, width: 28, border: '1px solid var(--border)',
        background: 'var(--card)', color: 'var(--muted)',
        borderRadius: 3, cursor: canRemove ? 'pointer' : 'default',
        opacity: canRemove ? 1 : 0.4, fontFamily: 'inherit', fontSize: 14,
      }}
    >
      ×
    </button>
  </>
);
