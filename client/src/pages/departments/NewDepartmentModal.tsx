import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { createDepartment, type CreateDepartmentPayload } from '../../api/departments';
import { getClientsSimple, getCarriers, type LookupOption } from '../../api/lookups';

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid #d1d5db', borderRadius: 3,
  background: '#fff', padding: '0 7px', fontSize: 11, color: '#374151',
  width: '100%', fontFamily: 'inherit', outline: 'none',
};
const secHead: React.CSSProperties = {
  background: 'var(--navy)', color: '#fff', padding: '4px 10px',
  fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' };
const g3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' };

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <div><div style={lbl}>{l}</div>{children}</div>
);

const Inp = ({ value, onChange, placeholder }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string }) => (
  <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={fld} />
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
}

const DEFAULTS: Partial<CreateDepartmentPayload> = {
  showConsumptionOnReq: false, enforceScopeTypeFiltering: false,
  showUAorNWT: false, showItemizedDesc: false, emailNewRepairs: false,
  trackingRequired: false, taxExempt: false, paysByCreditCard: false, onsiteService: false,
};

export const NewDepartmentModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm]         = useState<Partial<CreateDepartmentPayload>>(DEFAULTS);
  const [clients, setClients]   = useState<LookupOption[]>([]);
  const [carriers, setCarriers] = useState<LookupOption[]>([]);
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
    Promise.all([getClientsSimple(), getCarriers()])
      .then(([c, car]) => { setClients(c); setCarriers(car); })
      .catch(() => message.error('Failed to load form data'));
  }, [open]);

  const handleSubmit = async () => {
    if (!form.clientKey) { message.error('Client is required'); return; }
    if (!form.name?.trim()) { message.error('Department name is required'); return; }
    setSubmitting(true);
    try {
      const { deptKey } = await createDepartment(form as CreateDepartmentPayload);
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
      <div style={{ ...g2, marginBottom: 6 }}>
        <F label="Client *">
          <select value={form.clientKey ?? ''} onChange={e => set('clientKey', Number(e.target.value) || null)} style={fld}>
            <option value="">— select client —</option>
            {clients.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </F>
        <F label="Department Name *">
          <Inp value={form.name} onChange={v => set('name', v)} placeholder="Required" />
        </F>
      </div>
      <div style={g2}>
        <F label="Address">
          <Inp value={form.address1 ?? ''} onChange={v => set('address1', v)} />
        </F>
        <F label="Phone">
          <Inp value={form.phone ?? ''} onChange={v => set('phone', v)} />
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

      {/* ── Defaults ── */}
      <div style={secHead}>Billing &amp; Defaults</div>
      <div style={g2}>
        <F label="Default Shipping Carrier">
          <select value={form.carrierKey ?? ''} onChange={e => set('carrierKey', Number(e.target.value) || null)} style={fld}>
            <option value="">— select —</option>
            {carriers.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </F>
      </div>

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
        <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {submitting ? 'Creating…' : 'Create Department'}
        </button>
      </div>
    </Modal>
  );
};
