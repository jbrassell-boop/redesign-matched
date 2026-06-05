import { useState, useEffect } from 'react';
import { Modal, Select, message } from 'antd';
import { useServiceLocation } from '../../hooks/useServiceLocation';
import { getSuppliers, getSupplierInventory } from '../../api/suppliers';
import { getSupplierPoTypes, type LookupOption } from '../../api/lookups';
import { createInventoryPurchaseOrder } from '../../api/suppliers';
import type { SupplierListItem, SupplierInventoryItem } from '../suppliers/types';

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2, display: 'block',
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3, background: 'var(--card)',
  padding: '0 7px', fontSize: 11, color: 'var(--label)', width: '100%', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const secHead: React.CSSProperties = {
  background: 'var(--navy)', color: 'var(--card)', padding: '4px 10px', fontSize: 11.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.05em', borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const th: React.CSSProperties = { padding: '4px 6px', textAlign: 'left' };

interface Line {
  supplierSizesKey: number;
  label: string;
  orderQuantity: number;
  unitCost: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const partLabel = (p: { itemDescription: string; sizeDescription: string; supplierPartNo: string }) =>
  [p.itemDescription, p.sizeDescription, p.supplierPartNo].filter(Boolean).join(' · ');

export const CreatePurchaseOrderModal = ({ open, onClose, onCreated }: Props) => {
  const { locationKey } = useServiceLocation();
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [poTypes, setPoTypes] = useState<LookupOption[]>([]);
  const [supplierKey, setSupplierKey] = useState<number | null>(null);
  const [poTypeKey, setPoTypeKey] = useState<number | null>(null);
  const [parts, setParts] = useState<SupplierInventoryItem[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load suppliers + PO types when the modal opens; reset everything else.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSupplierKey(null); setPoTypeKey(null); setParts([]); setLines([]);
    Promise.all([getSuppliers({ pageSize: 500 }), getSupplierPoTypes()])
      .then(([s, t]) => {
        if (cancelled) return;
        setSuppliers(s.items);
        setPoTypes(t);
        if (t.length === 1) setPoTypeKey(t[0].key);
      })
      .catch(() => { if (!cancelled) message.error('Failed to load purchase-order form data'); });
    return () => { cancelled = true; };
  }, [open]);

  // Load the chosen supplier's orderable parts.
  useEffect(() => {
    if (supplierKey == null) { setParts([]); return; }
    let cancelled = false;
    setPartsLoading(true); setLines([]);
    getSupplierInventory(supplierKey)
      .then(p => { if (!cancelled) setParts(p.filter(x => x.isActive)); })
      .catch(() => { if (!cancelled) message.error('Failed to load supplier parts'); })
      .finally(() => { if (!cancelled) setPartsLoading(false); });
    return () => { cancelled = true; };
  }, [supplierKey]);

  const addLine = (sizesKey: number) => {
    if (lines.some(l => l.supplierSizesKey === sizesKey)) return;
    const part = parts.find(p => p.supplierSizesKey === sizesKey);
    if (!part) return;
    setLines(prev => [...prev, {
      supplierSizesKey: sizesKey, label: partLabel(part),
      orderQuantity: 1, unitCost: part.unitCost ?? 0,
    }]);
  };
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => (l.supplierSizesKey === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) =>
    setLines(prev => prev.filter(l => l.supplierSizesKey !== key));

  const poTotal = lines.reduce((sum, l) => sum + l.orderQuantity * l.unitCost, 0);
  const canSubmit = supplierKey != null && poTypeKey != null && lines.length > 0
    && lines.every(l => l.orderQuantity > 0 && l.unitCost >= 0);

  const handleSubmit = async () => {
    if (!canSubmit || supplierKey == null || poTypeKey == null) return;
    setSubmitting(true);
    try {
      const res = await createInventoryPurchaseOrder(supplierKey, {
        serviceLocationKey: locationKey,
        supplierPOTypeKey: poTypeKey,
        lines: lines.map(l => ({
          supplierSizesKey: l.supplierSizesKey, orderQuantity: l.orderQuantity, unitCost: l.unitCost,
        })),
      });
      message.success(`PO ${res.supplierPONumber} created ($${res.poTotal.toFixed(2)})`);
      onCreated();
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const availableParts = parts.filter(p => !lines.some(l => l.supplierSizesKey === p.supplierSizesKey));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      footer={null}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>Create Purchase Order</span>}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      <div style={secHead}>Purchase Order</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        <label style={{ display: 'block' }}>
          <span style={lbl}>Supplier *</span>
          <Select
            showSearch optionFilterProp="label" placeholder="Select supplier"
            value={supplierKey ?? undefined} onChange={v => setSupplierKey(v)} style={{ width: '100%' }}
            options={suppliers.map(s => ({ value: s.supplierKey, label: s.name }))}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={lbl}>PO Type *</span>
          <select value={poTypeKey ?? ''} onChange={e => setPoTypeKey(Number(e.target.value) || null)} style={fld}>
            <option value="">&mdash; select &mdash;</option>
            {poTypes.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <div style={secHead}>Line Items</div>
      {supplierKey == null ? (
        <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 0' }}>Select a supplier to add parts.</div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <Select
              key={`add-${lines.length}`}
              showSearch optionFilterProp="label"
              placeholder={partsLoading ? 'Loading parts…' : 'Add a part…'}
              loading={partsLoading} disabled={partsLoading || availableParts.length === 0}
              style={{ width: '100%' }} onChange={(v: number) => addLine(v)}
              options={availableParts.map(p => ({ value: p.supplierSizesKey, label: partLabel(p) }))}
            />
          </div>
          {lines.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0' }}>No line items yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={th}>Part</th>
                  <th style={{ ...th, width: 70 }}>Qty</th>
                  <th style={{ ...th, width: 96 }}>Unit Cost</th>
                  <th style={{ ...th, width: 86, textAlign: 'right' }}>Total</th>
                  <th style={{ width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.supplierSizesKey} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 6px' }}>{l.label}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="number" min={1} value={l.orderQuantity}
                        onChange={e => updateLine(l.supplierSizesKey, { orderQuantity: Math.max(0, Number(e.target.value) || 0) })}
                        style={{ ...fld, height: 24 }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="number" min={0} step="0.01" value={l.unitCost}
                        onChange={e => updateLine(l.supplierSizesKey, { unitCost: Math.max(0, Number(e.target.value) || 0) })}
                        style={{ ...fld, height: 24 }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>${(l.orderQuantity * l.unitCost).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => removeLine(l.supplierSizesKey)} aria-label="Remove line"
                        style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                      >&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '6px', textAlign: 'right' }}>PO Total</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>${poTotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >Cancel</button>
        <button
          onClick={handleSubmit} disabled={!canSubmit || submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: canSubmit ? 'var(--primary)' : 'var(--neutral-200)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
        >{submitting ? 'Creating…' : 'Create PO'}</button>
      </div>
    </Modal>
  );
};
