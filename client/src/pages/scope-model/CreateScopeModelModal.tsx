import { useState } from 'react';
import { Modal, message } from 'antd';
import { createScopeModel, getManufacturers, type CreateScopeModelPayload } from '../../api/scopeModels';
import { getScopeTypeCategories, getScopeCategories, type LookupOption } from '../../api/lookups';
import type { Manufacturer } from './types';

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const secHead: React.CSSProperties = {
  background: 'var(--navy)', color: 'var(--card)', padding: '4px 10px',
  fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' };

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}><span style={lbl}>{l}</span>{children}</label>
);

// XX#### — two uppercase letters + up to four digits. Mirrors the server-side rule.
const ITEM_CODE_RE = /^[A-Z]{2}\d{0,4}$/;

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'F', label: 'Flexible' },
  { value: 'R', label: 'Rigid' },
  { value: 'I', label: 'Instrument' },
  { value: 'C', label: 'Camera' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  description: string;
  type: string;
  scopeTypeCatKey: number | null;
  manufacturerKey: number | null;
  scopeCategoryKey: number | null;
  itemCode: string;
}

const DEFAULTS: FormState = {
  description: '', type: 'F', scopeTypeCatKey: null,
  manufacturerKey: null, scopeCategoryKey: null, itemCode: '',
};

export const CreateScopeModelModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm]                 = useState<FormState>(DEFAULTS);
  const [typeCategories, setTypeCategories] = useState<LookupOption[]>([]);
  const [manufacturers, setManufacturers]   = useState<Manufacturer[]>([]);
  const [scopeCategories, setScopeCategories] = useState<LookupOption[]>([]);
  const [submitting, setSubmitting]     = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const reset = () => {
    setForm(DEFAULTS);
    setTypeCategories([]);
    setManufacturers([]);
    setScopeCategories([]);
  };

  // Load lookups on open (per existing modal pattern — fetch on afterOpenChange,
  // not in a synchronous-setState effect).
  const handleOpenChange = (opened: boolean) => {
    if (!opened) { reset(); return; }
    Promise.all([getScopeTypeCategories(), getManufacturers(), getScopeCategories()])
      .then(([cats, mfgs, scats]) => {
        setTypeCategories(cats);
        setManufacturers(mfgs);
        setScopeCategories(scats);
      })
      .catch(() => message.error('Failed to load form data'));
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const desc = form.description.trim();
    if (!desc) { message.error('Description is required'); return; }
    if (!form.scopeTypeCatKey) { message.error('Category is required'); return; }
    if (form.type === 'I' && !form.scopeCategoryKey) {
      message.error('Scope category is required for instrument models');
      return;
    }
    const itemCode = form.itemCode.trim().toUpperCase();
    if (itemCode && !ITEM_CODE_RE.test(itemCode)) {
      message.error('Item code must be two letters followed by up to four digits (e.g. AB1234)');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateScopeModelPayload = {
        description: desc,
        type: form.type,
        scopeTypeCatKey: form.scopeTypeCatKey,
        manufacturerKey: form.manufacturerKey,
        scopeCategoryKey: form.type === 'I' ? form.scopeCategoryKey : null,
        itemCode: itemCode || null,
      };
      const { scopeTypeKey } = await createScopeModel(payload);
      message.success(`Scope model #${scopeTypeKey} created`);
      onCreated();
      handleClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to create scope model');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterOpenChange={handleOpenChange}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Scope Model</span>}
      width={560}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Model Info ── */}
      <div style={secHead}>Model Info</div>
      <div style={{ marginBottom: 6 }}>
        <F label="Description *">
          <input
            type="text"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="e.g. GIF-H190"
            style={fld}
          />
        </F>
      </div>
      <div style={g2}>
        <F label="Type *">
          <select value={form.type} onChange={e => set('type', e.target.value)} style={fld}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </F>
        <F label="Category *">
          <select
            value={form.scopeTypeCatKey ?? ''}
            onChange={e => set('scopeTypeCatKey', Number(e.target.value) || null)}
            style={fld}
          >
            <option value="">— select category —</option>
            {typeCategories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </F>
      </div>

      <div style={{ ...g2, marginTop: 6 }}>
        <F label="Manufacturer">
          <select
            value={form.manufacturerKey ?? ''}
            onChange={e => set('manufacturerKey', Number(e.target.value) || null)}
            style={fld}
          >
            <option value="">— select (optional) —</option>
            {manufacturers.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
          </select>
        </F>
        <F label="Item Code">
          <input
            type="text"
            value={form.itemCode}
            onChange={e => set('itemCode', e.target.value.toUpperCase())}
            placeholder="e.g. AB1234"
            maxLength={6}
            style={fld}
          />
        </F>
      </div>

      {/* Instrument models require a scope category */}
      {form.type === 'I' && (
        <div style={{ marginTop: 6 }}>
          <F label="Scope Category *">
            <select
              value={form.scopeCategoryKey ?? ''}
              onChange={e => set('scopeCategoryKey', Number(e.target.value) || null)}
              style={fld}
            >
              <option value="">— select scope category —</option>
              {scopeCategories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </F>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Creating…' : 'Create Model'}
        </button>
      </div>
    </Modal>
  );
};
