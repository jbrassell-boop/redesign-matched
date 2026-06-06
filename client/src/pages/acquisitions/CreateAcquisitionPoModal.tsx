import { useState, useEffect, useMemo } from 'react';
import { Modal, message } from 'antd';
import { useServiceLocation } from '../../hooks/useServiceLocation';
import {
  createAcquisitionPurchaseOrder,
  type CreateAcquisitionPoLine,
} from '../../api/acquisitions';
import { getSuppliers } from '../../api/suppliers';
import { getScopeTypes, type LookupOption } from '../../api/lookups';
import type { SupplierListItem } from '../suppliers/types';

// ── Shared form-field styles (mirrors NewRepairModal / CreateInventoryPoModal) ──
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
  onClose: () => void;
  onCreated: (poNumber: string) => void;
}

type LineRow = { scopeTypeKey: number | null; serialNumber: string; scopeCost: number };

const blankLine = (): LineRow => ({ scopeTypeKey: null, serialNumber: '', scopeCost: 0 });

export const CreateAcquisitionPoModal = ({ open, onClose, onCreated }: Props) => {
  const { locationKey, locations } = useServiceLocation();

  // tblPaymentMethods is empty on the local DB so we don't list options — the
  // backend accepts a null payment method (it's optional). A numeric input
  // lets a tester supply a real key once that table is seeded without us
  // shipping a new lookups endpoint just for this slice.
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [scopeTypes, setScopeTypes] = useState<LookupOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [serviceLocationKey, setServiceLocationKey] = useState<number>(locationKey);
  const [supplierKey, setSupplierKey] = useState<number | null>(null);
  const [paymentMethodKey, setPaymentMethodKey] = useState<string>(''); // empty → null on submit
  const [dateOfPO, setDateOfPO] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineRow[]>([blankLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset + load lookups on open. Filter the supplier list to acquisition
  // suppliers — they're the only suppliers with scopes to acquire.
  useEffect(() => {
    if (!open) return;
    setServiceLocationKey(locationKey);
    setSupplierKey(null);
    setPaymentMethodKey('');
    setDateOfPO(new Date().toISOString().slice(0, 10));
    setLines([blankLine()]);
    setErrorMsg(null);

    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      // pageSize 500 covers happy-plant comfortably (full count is ~few hundred).
      getSuppliers({ page: 1, pageSize: 500 }),
      getScopeTypes(),
    ])
      .then(([sups, types]) => {
        if (cancelled) return;
        setSuppliers(sups.items.filter(s => s.isAcquisitionSupplier && s.isActive));
        setScopeTypes(types);
      })
      .catch(() => { if (!cancelled) message.error('Failed to load PO form data'); })
      .finally(() => { if (!cancelled) setLoadingLookups(false); });
    return () => { cancelled = true; };
  }, [open, locationKey]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.scopeCost) || 0), 0),
    [lines],
  );

  const updateLine = (i: number, patch: Partial<LineRow>) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (i: number) => setLines(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!serviceLocationKey) { setErrorMsg('Service location is required.'); return; }
    if (!supplierKey) { setErrorMsg('Supplier is required.'); return; }
    if (lines.length === 0) { setErrorMsg('At least one line is required.'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.scopeTypeKey) { setErrorMsg(`Line ${i + 1}: pick a scope type.`); return; }
      if (l.scopeCost < 0) { setErrorMsg(`Line ${i + 1}: cost cannot be negative.`); return; }
    }

    // Optional payment method: blank → null; non-blank must parse to a positive int.
    let pmKey: number | null = null;
    if (paymentMethodKey.trim() !== '') {
      const parsed = Number(paymentMethodKey);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setErrorMsg('Payment method must be a positive integer (or leave blank).');
        return;
      }
      pmKey = parsed;
    }

    setSubmitting(true);
    try {
      const payload: CreateAcquisitionPoLine[] = lines.map(l => ({
        scopeTypeKey: l.scopeTypeKey!,
        serialNumber: l.serialNumber.trim() || null,
        scopeCost: Number(l.scopeCost),
      }));
      const res = await createAcquisitionPurchaseOrder({
        serviceLocationKey,
        supplierKey,
        dateOfPO: dateOfPO || null,
        paymentMethodKey: pmKey,
        lines: payload,
      });
      message.success(`Acquisition PO ${res.supplierPONumber} created (total $${res.poTotal.toFixed(2)})`);
      onCreated(res.supplierPONumber);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create acquisition PO';
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
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Acquisition PO</span>}
      width={760}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      <div style={sectionHead}>Header</div>
      <div style={grid3}>
        <F label="Service Location">
          {/* The PO is created for your ACTIVE (banner) location; the backend now requires
              body.ServiceLocationKey to match it, so this is read-only here — switch
              locations via the top banner. */}
          <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', color: 'var(--muted)' }}
               aria-label="Service location (from banner)">
            {locations.find(l => l.key === serviceLocationKey)?.label ?? `Location ${serviceLocationKey}`}
          </div>
        </F>
        <F label="Supplier *">
          <select
            value={supplierKey ?? ''}
            onChange={e => setSupplierKey(Number(e.target.value) || null)}
            style={fieldStyle}
            aria-label="Supplier"
            disabled={loadingLookups}
          >
            <option value="">{loadingLookups ? 'Loading…' : '— select supplier —'}</option>
            {suppliers.map(s => (
              <option key={s.supplierKey} value={s.supplierKey}>
                {s.name}{s.city ? ` — ${s.city}, ${s.state}` : ''}
              </option>
            ))}
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
        <F label="Payment Method (optional)">
          <input
            type="number"
            min={1}
            step={1}
            value={paymentMethodKey}
            placeholder="numeric ID, or leave blank"
            onChange={e => setPaymentMethodKey(e.target.value)}
            style={fieldStyle}
            aria-label="Payment method key"
          />
        </F>
      </div>

      <div style={sectionHead}>Lines</div>
      {!loadingLookups && suppliers.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>
          No acquisition suppliers found — toggle Acquisition Supplier on a supplier first.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 28px', gap: '4px 8px', alignItems: 'center' }}>
        <div style={labelStyle}>Scope Type</div>
        <div style={labelStyle}>Serial (optional)</div>
        <div style={labelStyle}>Cost</div>
        <div />

        {lines.map((line, i) => (
          <LineRowControls
            key={i}
            line={line}
            scopeTypes={scopeTypes}
            canRemove={lines.length > 1}
            onScopeType={k => updateLine(i, { scopeTypeKey: k })}
            onSerial={v => updateLine(i, { serialNumber: v })}
            onCost={v => updateLine(i, { scopeCost: v })}
            onRemove={() => removeLine(i)}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={addLine}
          style={{
            height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600,
            background: 'var(--neutral-100)', color: 'var(--navy)',
            border: '1px solid var(--border)', borderRadius: 3,
            cursor: 'pointer', fontFamily: 'inherit',
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
          disabled={submitting}
          style={{
            height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700,
            background: 'var(--primary)', color: 'var(--card)', border: 'none',
            borderRadius: 4, cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Creating…' : 'Create PO'}
        </button>
      </div>
    </Modal>
  );
};

const LineRowControls = ({
  line, scopeTypes, canRemove, onScopeType, onSerial, onCost, onRemove,
}: {
  line: LineRow;
  scopeTypes: LookupOption[];
  canRemove: boolean;
  onScopeType: (k: number) => void;
  onSerial: (v: string) => void;
  onCost: (v: number) => void;
  onRemove: () => void;
}) => (
  <>
    <select
      value={line.scopeTypeKey ?? ''}
      onChange={e => onScopeType(Number(e.target.value))}
      style={fieldStyle}
      aria-label="Scope type"
    >
      <option value="">— select scope type —</option>
      {scopeTypes.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
    </select>
    <input
      type="text"
      value={line.serialNumber}
      onChange={e => onSerial(e.target.value)}
      placeholder="optional"
      style={fieldStyle}
      aria-label="Serial number"
    />
    <input
      type="number"
      min={0}
      step="0.01"
      value={line.scopeCost}
      onChange={e => onCost(Number(e.target.value))}
      style={fieldStyle}
      aria-label="Scope cost"
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
