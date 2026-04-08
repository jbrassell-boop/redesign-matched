import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { createNewClient, type CreateClientPayload } from '../../api/clients';
import { createDepartment } from '../../api/departments';
import { getSalesReps, getPricingCategories, getPaymentTerms, getScopeTypes, getCarriers, type LookupOption } from '../../api/lookups';

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none',
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

const Inp = ({ value, onChange, placeholder, type }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <input type={type ?? 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={fld} />
);

const Sel = ({ value, onChange, options, placeholder }: { value: number | string | undefined; onChange: (v: string) => void; options: LookupOption[]; placeholder?: string }) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={fld}>
    <option value="">{placeholder ?? '— select —'}</option>
    {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
  </select>
);

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

interface DeptForm {
  name: string;
  salesRepKey: number | null;
  pricingCategoryKey: number | null;
  serviceLocationKey: number | null;
  carrierKey: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CLIENT_DEFAULTS: Partial<CreateClientPayload> = {
  blindPS3: false, reqTotalsOnly: false, blindTotalsOnFinal: false,
  pORequired: false, neverHold: false, skipTracking: false,
  emailNewRepairs: false, nationalAccount: false,
};

const DEPT_DEFAULTS: DeptForm = {
  name: '', salesRepKey: null, pricingCategoryKey: null,
  serviceLocationKey: null, carrierKey: null,
};

export const NewClientModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm]             = useState<Partial<CreateClientPayload>>(CLIENT_DEFAULTS);
  const [dept, setDept]             = useState<DeptForm>(DEPT_DEFAULTS);
  const [newScope, setNewScope]     = useState(false);
  const [scopeSerial, setScopeSerial]   = useState('');
  const [scopeTypeKey, setScopeTypeKey] = useState<number | null>(null);

  const [salesReps, setSalesReps]     = useState<LookupOption[]>([]);
  const [pricingCats, setPricingCats] = useState<LookupOption[]>([]);
  const [payTerms, setPayTerms]       = useState<LookupOption[]>([]);
  const [scopeTypes, setScopeTypes]   = useState<LookupOption[]>([]);
  const [carriers, setCarriers]       = useState<LookupOption[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  const set = (k: keyof CreateClientPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v === '' ? null : v }));

  const setD = (k: keyof DeptForm, v: unknown) =>
    setDept(prev => ({ ...prev, [k]: v === '' ? null : v }));

  const lookupZip = async (zip: string, cityKey: keyof CreateClientPayload, stateKey: keyof CreateClientPayload) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return;
      const data = await res.json();
      const place = data.places?.[0];
      if (place) {
        setForm(prev => ({ ...prev, [cityKey]: place['place name'], [stateKey]: place['state abbreviation'] }));
      }
    } catch (err) { console.error('[NewClientModal] zip lookup failed', err); }
  };

  useEffect(() => {
    if (!open) return;
    Promise.all([getSalesReps(), getPricingCategories(), getPaymentTerms(), getScopeTypes(), getCarriers()])
      .then(([sr, pc, pt, st, car]) => {
        setSalesReps(sr); setPricingCats(pc); setPayTerms(pt);
        setScopeTypes(st); setCarriers(car);
      })
      .catch(() => message.error('Failed to load form data'));
  }, [open]);

  const handleSubmit = async () => {
    if (!form.name?.trim()) { message.error('Client name is required'); return; }
    setSubmitting(true);
    try {
      const { clientKey } = await createNewClient(form as CreateClientPayload);

      // Create first department if name provided
      if (dept.name.trim()) {
        await createDepartment({
          clientKey,
          name: dept.name.trim(),
          salesRepKey: dept.salesRepKey ?? null,
          pricingCategoryKey: dept.pricingCategoryKey ?? null,
          serviceLocationKey: dept.serviceLocationKey ?? null,
          carrierKey: dept.carrierKey ?? null,
          showConsumptionOnReq: false,
          enforceScopeTypeFiltering: false,
          showUAorNWT: false,
          showItemizedDesc: false,
          emailNewRepairs: false,
          trackingRequired: false,
          taxExempt: false,
          paysByCreditCard: false,
          onsiteService: false,
          serialNumber: newScope && scopeSerial.trim() ? scopeSerial.trim() : null,
          scopeTypeKey: newScope ? scopeTypeKey : null,
        });
      }

      message.success(`Client #${clientKey} created`);
      onCreated();
      handleClose();
    } catch {
      message.error('Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(CLIENT_DEFAULTS);
    setDept(DEPT_DEFAULTS);
    setNewScope(false);
    setScopeSerial('');
    setScopeTypeKey(null);
    onClose();
  };

  const chk = (key: keyof CreateClientPayload, label: string) => (
    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Client</span>}
      width={700}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Client Information ── */}
      <div style={secHead}>Client Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px 10px' }}>
        <F label="Client Name *">
          <Inp value={form.name} onChange={v => set('name', v)} placeholder="Required" />
        </F>
        <F label="Client Since">
          <Inp value={form.clientSince ?? ''} onChange={v => set('clientSince', v)} type="date" />
        </F>
      </div>
      <div style={{ ...g2, marginTop: 6 }}>
        <F label="Address">
          <Inp value={form.address1 ?? ''} onChange={v => set('address1', v)} />
        </F>
        <F label="Unit / Building">
          <Inp value={form.unitBuilding ?? ''} onChange={v => set('unitBuilding', v)} />
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
          <Inp value={form.zip ?? ''} onChange={v => { set('zip', v); lookupZip(v, 'city', 'state'); }} />
        </F>
      </div>
      <div style={{ ...g2, marginTop: 6 }}>
        <F label="Phone">
          <Inp value={form.phone ?? ''} onChange={v => set('phone', v)} />
        </F>
        <F label="Fax">
          <Inp value={form.fax ?? ''} onChange={v => set('fax', v)} />
        </F>
      </div>

      {/* ── Account Defaults ── */}
      <div style={secHead}>Account Defaults</div>
      <div style={g3}>
        <F label="Pricing Category">
          <Sel value={form.pricingCategoryKey ?? undefined} onChange={v => set('pricingCategoryKey', Number(v) || null)} options={pricingCats} />
        </F>
        <F label="Sales Rep">
          <Sel value={form.salesRepKey ?? undefined} onChange={v => set('salesRepKey', Number(v) || null)} options={salesReps} />
        </F>
        <F label="Payment Terms">
          <Sel value={form.paymentTermsKey ?? undefined} onChange={v => set('paymentTermsKey', Number(v) || null)} options={payTerms} />
        </F>
        <F label="Bill To">
          <select value={form.billTo ?? ''} onChange={e => set('billTo', e.target.value)} style={fld}>
            <option value="">— select —</option>
            {['Customer','Department','Government','Third Party'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </F>
        <F label="Discount %">
          <input type="number" value={form.discountPct ?? ''} onChange={e => set('discountPct', Number(e.target.value) || null)} style={fld} min={0} max={100} step={0.1} />
        </F>
      </div>

      {/* ── Billing Address ── */}
      <div style={secHead}>Billing Address</div>
      <div style={g2}>
        <F label="Bill Address">
          <Inp value={form.billAddr1 ?? ''} onChange={v => set('billAddr1', v)} />
        </F>
        <F label="Bill Email">
          <Inp value={form.billEmail ?? ''} onChange={v => set('billEmail', v)} />
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
          <Inp value={form.billZip ?? ''} onChange={v => { set('billZip', v); lookupZip(v, 'billCity', 'billState'); }} />
        </F>
      </div>

      {/* ── First Department ── */}
      <div style={secHead}>First Department</div>
      <div style={g2}>
        <F label="Department Name">
          <Inp value={dept.name} onChange={v => setD('name', v)} placeholder="e.g. Endoscopy, Surgery…" />
        </F>
        <F label="Sales Rep">
          <Sel value={dept.salesRepKey ?? undefined} onChange={v => setD('salesRepKey', Number(v) || null)} options={salesReps} />
        </F>
        <F label="Pricing Category">
          <Sel value={dept.pricingCategoryKey ?? undefined} onChange={v => setD('pricingCategoryKey', Number(v) || null)} options={pricingCats} />
        </F>
        <F label="Default Shipping Carrier">
          <Sel value={dept.carrierKey ?? undefined} onChange={v => setD('carrierKey', Number(v) || null)} options={carriers} />
        </F>
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={lbl}>Service Location</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          {[{ key: 1, label: 'Upper Chichester' }, { key: 2, label: 'Nashville' }].map(loc => (
            <label key={loc.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="radio"
                name="deptServiceLocation"
                checked={dept.serviceLocationKey === loc.key}
                onChange={() => setD('serviceLocationKey', loc.key)}
              />
              {loc.label}
            </label>
          ))}
        </div>
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
            <input type="text" value={scopeSerial} onChange={e => setScopeSerial(e.target.value)} placeholder="Enter serial number" style={fld} />
          </F>
          <F label="Scope Type">
            <select value={scopeTypeKey ?? ''} onChange={e => setScopeTypeKey(Number(e.target.value) || null)} style={fld}>
              <option value="">— select scope type —</option>
              {scopeTypes.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </F>
        </div>
      )}

      {/* ── Options ── */}
      <div style={secHead}>Options</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 0' }}>
        {chk('blindPS3',          'Blind PS3')}
        {chk('reqTotalsOnly',     'Req. Totals Only')}
        {chk('blindTotalsOnFinal','Blind Totals On Final')}
        {chk('pORequired',        'PO Required')}
        {chk('neverHold',         'Never Hold')}
        {chk('skipTracking',      'Skip Tracking')}
        {chk('emailNewRepairs',   'Email New Repairs')}
        {chk('nationalAccount',   'National Account')}
      </div>

      {/* ── Additional ── */}
      <div style={secHead}>Additional</div>
      <div style={g2}>
        <F label="Secondary Name / AP Contact">
          <Inp value={form.secondaryName ?? ''} onChange={v => set('secondaryName', v)} />
        </F>
        <F label="Great Plains ID">
          <Inp value={form.gpId ?? ''} onChange={v => set('gpId', v)} />
        </F>
        <F label="Reference #1">
          <Inp value={form.ref1 ?? ''} onChange={v => set('ref1', v)} />
        </F>
        <F label="Reference #2">
          <Inp value={form.ref2 ?? ''} onChange={v => set('ref2', v)} />
        </F>
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
          {submitting ? 'Creating…' : 'Create Client'}
        </button>
      </div>
    </Modal>
  );
};
