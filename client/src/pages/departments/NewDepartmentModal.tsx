import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { createDepartment, type CreateDepartmentPayload } from '../../api/departments';
import { getClientsSimple, getCarriers, getScopeTypes, type LookupOption } from '../../api/lookups';

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none',
};
const fldDisabled: React.CSSProperties = {
  ...fld, background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed',
};
const secHead: React.CSSProperties = {
  background: 'var(--navy)', color: 'var(--card)', padding: '4px 10px',
  fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' };
const g3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' };

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}><span style={lbl}>{l}</span>{children}</label>
);

const Inp = ({ value, onChange, placeholder, disabled }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) => (
  <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={disabled ? fldDisabled : fld} disabled={disabled} />
);

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientKey?: number | null;   // pre-populate from context (e.g. client's dept tab)
  clientName?: string;          // display name when pre-populated
}

const DEFAULTS: Partial<CreateDepartmentPayload> = {
  showConsumptionOnReq: false, enforceScopeTypeFiltering: false,
  showUAorNWT: false, showItemizedDesc: false, emailNewRepairs: false,
  trackingRequired: false, taxExempt: false, paysByCreditCard: false, onsiteService: false,
};

export const NewDepartmentModal = ({ open, onClose, onCreated, clientKey: presetClientKey, clientName }: Props) => {
  const [form, setForm]             = useState<Partial<CreateDepartmentPayload>>(DEFAULTS);
  const [clients, setClients]       = useState<LookupOption[]>([]);
  const [carriers, setCarriers]     = useState<LookupOption[]>([]);
  const [scopeTypes, setScopeTypes] = useState<LookupOption[]>([]);
  const [newScope, setNewScope]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof CreateDepartmentPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v === '' ? null : v }));

  const lookupZip = async (zip: string) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return;
      const data = await res.json();
      const place = data.places?.[0];
      if (place) {
        setForm(prev => ({ ...prev, city: place['place name'], state: place['state abbreviation'] }));
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setForm({ ...DEFAULTS, clientKey: presetClientKey ?? null });
    setNewScope(false);
    Promise.all([getClientsSimple(), getCarriers(), getScopeTypes()])
      .then(([c, car, st]) => {
        if (cancelled) return;
        setClients(c);
        setCarriers(car);
        setScopeTypes(st);
      })
      .catch(() => { if (!cancelled) message.error('Failed to load form data'); });
    return () => { cancelled = true; };
  }, [open, presetClientKey]);

  const handleSubmit = async () => {
    if (!form.name?.trim()) { message.error('Department name is required'); return; }
    setSubmitting(true);
    try {
      const payload: CreateDepartmentPayload = {
        ...(form as CreateDepartmentPayload),
        serialNumber: newScope ? (form.serialNumber ?? null) : null,
        scopeTypeKey: newScope ? (form.scopeTypeKey ?? null) : null,
      };
      const { deptKey } = await createDepartment(payload);
      message.success(`Department #${deptKey} created`);
      onCreated();
      handleClose();
    } catch {
      message.error('Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(DEFAULTS);
    setNewScope(false);
    onClose();
  };

  const chk = (key: keyof CreateDepartmentPayload, label: string) => (
    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Department</span>}
      width={640}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Department Info ── */}
      <div style={secHead}>Department Info</div>

      {/* Client — read-only if pre-populated from context */}
      {presetClientKey ? (
        <div style={{ marginBottom: 6 }}>
          <F label="Client">
            <input value={clientName ?? `Client #${presetClientKey}`} disabled style={fldDisabled} />
          </F>
        </div>
      ) : (
        <div style={{ marginBottom: 6 }}>
          <F label="Client">
            <select value={form.clientKey ?? ''} onChange={e => set('clientKey', Number(e.target.value) || null)} style={fld}>
              <option value="">— select client (optional) —</option>
              {clients.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </F>
        </div>
      )}

      <div style={{ ...g2, marginBottom: 6 }}>
        <F label="Department Name *">
          <Inp value={form.name} onChange={v => set('name', v)} placeholder="Required" />
        </F>
        <F label="Phone">
          <Inp value={form.phone ?? ''} onChange={v => set('phone', v)} />
        </F>
      </div>

      {/* Service Location */}
      <div style={{ marginBottom: 6 }}>
        <div style={lbl}>Service Location</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          {[{ key: 1, label: 'Upper Chichester' }, { key: 2, label: 'Nashville' }].map(loc => (
            <label key={loc.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="radio"
                name="serviceLocation"
                checked={form.serviceLocationKey === loc.key}
                onChange={() => set('serviceLocationKey', loc.key)}
              />
              {loc.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Address ── */}
      <div style={secHead}>Shipping Address</div>
      <div style={g2}>
        <F label="Address Line 1">
          <Inp value={form.address1 ?? ''} onChange={v => set('address1', v)} />
        </F>
        <F label="Default Shipping Carrier">
          <select value={form.carrierKey ?? ''} onChange={e => set('carrierKey', Number(e.target.value) || null)} style={fld}>
            <option value="">— select —</option>
            {carriers.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </F>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px', gap: '6px 8px', marginTop: 6 }}>
        <F label="City">
          <Inp value={form.city ?? ''} onChange={v => set('city', v)} />
        </F>
        <F label="State">
          <select value={form.state ?? ''} onChange={e => set('state', e.target.value)} style={fld}>
            <option value="">—</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Zip">
          <Inp value={form.zip ?? ''} onChange={v => { set('zip', v); lookupZip(v); }} />
        </F>
      </div>

      {/* ── Contact ── */}
      <div style={secHead}>Contact</div>
      <div style={g3}>
        <F label="First Name">
          <Inp value={form.contactFirst ?? ''} onChange={v => set('contactFirst', v)} />
        </F>
        <F label="Last Name">
          <Inp value={form.contactLast ?? ''} onChange={v => set('contactLast', v)} />
        </F>
        <F label="Email">
          <Inp value={form.contactEmail ?? ''} onChange={v => set('contactEmail', v)} />
        </F>
      </div>

      {/* ── New Scope ── */}
      <div style={secHead}>New Scope</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', marginBottom: 8 }}>
        <input type="checkbox" checked={newScope} onChange={e => setNewScope(e.target.checked)} />
        Add a scope for this department
      </label>
      {newScope && (
        <div style={g2}>
          <F label="Serial Number">
            <Inp value={form.serialNumber ?? ''} onChange={v => set('serialNumber', v)} placeholder="Enter serial number" />
          </F>
          <F label="Scope Type">
            <select value={form.scopeTypeKey ?? ''} onChange={e => set('scopeTypeKey', Number(e.target.value) || null)} style={fld}>
              <option value="">— select scope type —</option>
              {scopeTypes.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </F>
        </div>
      )}

      {/* ── Options ── */}
      <div style={secHead}>Options</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
        {chk('showConsumptionOnReq',     'Show Consumption On Req')}
        {chk('enforceScopeTypeFiltering','Enforce Scope Type Filtering')}
        {chk('showUAorNWT',              'Show UA Or NWT')}
        {chk('showItemizedDesc',         'Show Itemized Descriptions')}
        {chk('emailNewRepairs',          'Email New Repairs')}
        {chk('trackingRequired',         'Tracking # Required')}
        {chk('taxExempt',                'Tax Exempt')}
        {chk('paysByCreditCard',         'Pays By Credit Card')}
        {chk('onsiteService',            'On-Site Service')}
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {submitting ? 'Creating…' : 'Create Department'}
        </button>
      </div>
    </Modal>
  );
};
