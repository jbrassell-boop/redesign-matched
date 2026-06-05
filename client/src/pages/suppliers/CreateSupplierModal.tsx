import { useState } from 'react';
import { Modal, message } from 'antd';
import { createSupplier, type CreateSupplierPayload } from '../../api/suppliers';

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
const g3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' };

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}><span style={lbl}>{l}</span>{children}</label>
);

const Inp = ({ value, onChange, placeholder, maxLength }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) => (
  <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={fld} />
);

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// Role keys mirror tblSupplierRolesRef (1=Parts, 2=Repair, 3=Acquisition, 4=Carts).
const ROLES: { key: number; label: string }[] = [
  { key: 1, label: 'Parts' },
  { key: 2, label: 'Repair' },
  { key: 3, label: 'Acquisition' },
  { key: 4, label: 'Carts' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DEFAULTS: Partial<CreateSupplierPayload> = { isAcquisitionSupplier: false };

export const CreateSupplierModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm]           = useState<Partial<CreateSupplierPayload>>(DEFAULTS);
  const [roleKeys, setRoleKeys]   = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof CreateSupplierPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v === '' ? null : v }));

  const toggleRole = (key: number) =>
    setRoleKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const reset = () => { setForm(DEFAULTS); setRoleKeys([]); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.name?.trim()) { message.error('Supplier name is required'); return; }
    if (roleKeys.length === 0) { message.error('Select at least one role'); return; }
    setSubmitting(true);
    try {
      const payload: CreateSupplierPayload = {
        ...(form as CreateSupplierPayload),
        name: form.name.trim(),
        roleKeys,
        // Acquisition role implies the acquisition-supplier flag.
        isAcquisitionSupplier: form.isAcquisitionSupplier || roleKeys.includes(3),
      };
      const { supplierKey } = await createSupplier(payload);
      message.success(`Supplier #${supplierKey} created`);
      onCreated();
      handleClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterOpenChange={(opened) => { if (!opened) reset(); }}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Supplier</span>}
      width={620}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Supplier Info ── */}
      <div style={secHead}>Supplier Info</div>
      <div style={{ ...g2, marginBottom: 6 }}>
        <F label="Supplier Name *">
          <Inp value={form.name} onChange={v => set('name', v)} placeholder="Required" />
        </F>
        <F label="Also Known As">
          <Inp value={form.name2 ?? ''} onChange={v => set('name2', v)} placeholder="Optional" />
        </F>
      </div>
      <div style={g2}>
        <F label="Phone">
          <Inp value={form.phone ?? ''} onChange={v => set('phone', v)} />
        </F>
        <F label="Fax">
          <Inp value={form.fax ?? ''} onChange={v => set('fax', v)} />
        </F>
      </div>

      {/* ── Roles ── */}
      <div style={secHead}>Roles *</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
        {ROLES.map(r => (
          <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
            <input type="checkbox" checked={roleKeys.includes(r.key)} onChange={() => toggleRole(r.key)} />
            {r.label}
          </label>
        ))}
      </div>

      {/* ── Contact ── */}
      <div style={secHead}>Contact</div>
      <div style={g2}>
        <F label="First Name">
          <Inp value={form.contactFirst ?? ''} onChange={v => set('contactFirst', v)} />
        </F>
        <F label="Last Name">
          <Inp value={form.contactLast ?? ''} onChange={v => set('contactLast', v)} />
        </F>
      </div>

      {/* ── Shipping Address ── */}
      <div style={secHead}>Shipping Address</div>
      <div style={g2}>
        <F label="Address Line 1">
          <Inp value={form.shipAddr1 ?? ''} onChange={v => set('shipAddr1', v)} />
        </F>
        <F label="Address Line 2">
          <Inp value={form.shipAddr2 ?? ''} onChange={v => set('shipAddr2', v)} />
        </F>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px', gap: '6px 8px', marginTop: 6 }}>
        <F label="City">
          <Inp value={form.shipCity ?? ''} onChange={v => set('shipCity', v)} />
        </F>
        <F label="State">
          <select value={form.shipState ?? ''} onChange={e => set('shipState', e.target.value)} style={fld}>
            <option value="">—</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Zip">
          <Inp value={form.shipZip ?? ''} onChange={v => set('shipZip', v)} />
        </F>
      </div>

      {/* ── Mailing Address ── */}
      <div style={secHead}>Mailing Address</div>
      <div style={g2}>
        <F label="Address Line 1">
          <Inp value={form.mailAddr1 ?? ''} onChange={v => set('mailAddr1', v)} />
        </F>
        <F label="Address Line 2">
          <Inp value={form.mailAddr2 ?? ''} onChange={v => set('mailAddr2', v)} />
        </F>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px', gap: '6px 8px', marginTop: 6 }}>
        <F label="City">
          <Inp value={form.mailCity ?? ''} onChange={v => set('mailCity', v)} />
        </F>
        <F label="State">
          <select value={form.mailState ?? ''} onChange={e => set('mailState', e.target.value)} style={fld}>
            <option value="">—</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Zip">
          <Inp value={form.mailZip ?? ''} onChange={v => set('mailZip', v)} />
        </F>
      </div>

      {/* ── Billing Address ── */}
      <div style={secHead}>Billing Address</div>
      <div style={g2}>
        <F label="Address Line 1">
          <Inp value={form.billAddr1 ?? ''} onChange={v => set('billAddr1', v)} />
        </F>
        <F label="Address Line 2">
          <Inp value={form.billAddr2 ?? ''} onChange={v => set('billAddr2', v)} />
        </F>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px', gap: '6px 8px', marginTop: 6 }}>
        <F label="City">
          <Inp value={form.billCity ?? ''} onChange={v => set('billCity', v)} />
        </F>
        <F label="State">
          <select value={form.billState ?? ''} onChange={e => set('billState', e.target.value)} style={fld}>
            <option value="">—</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Zip">
          <Inp value={form.billZip ?? ''} onChange={v => set('billZip', v)} />
        </F>
      </div>

      {/* ── Options ── */}
      <div style={secHead}>Options</div>
      <div style={g3}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.isAcquisitionSupplier} onChange={e => set('isAcquisitionSupplier', e.target.checked)} />
          Acquisition Supplier
        </label>
      </div>

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
          {submitting ? 'Creating…' : 'Create Supplier'}
        </button>
      </div>
    </Modal>
  );
};
