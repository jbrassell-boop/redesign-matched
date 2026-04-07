import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { createRepair, type CreateRepairPayload } from '../../../api/repairs';
import { getRepairStatuses } from '../../../api/repairs';
import {
  lookupScopeBySerial, getScopeTypes, getClientsSimple,
  getDepartmentsByClient, getSalesReps, getPricingCategories,
  getPaymentTerms, getCarriers, getRepairLevels, getRepairReasonOptions,
  type LookupOption, type ScopeLookupResult,
} from '../../../api/lookups';

// ── Shared form field styles ──
const label: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const field: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none',
};
const sectionHead: React.CSSProperties = {
  background: 'var(--navy)', color: '#fff', padding: '4px 10px',
  fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 12,
};
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' };

const F = ({ label: lbl, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div style={label}>{lbl}</div>
    {children}
  </div>
);

const Sel = ({ value, onChange, options, placeholder }: {
  value: number | string | undefined;
  onChange: (v: string) => void;
  options: LookupOption[];
  placeholder?: string;
}) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={field}>
    <option value="">{placeholder ?? '— select —'}</option>
    {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
  </select>
);

const Inp = ({ value, onChange, placeholder, type }: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <input
    type={type ?? 'text'}
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={field}
  />
);

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const NewRepairModal = ({ open, onClose, onCreated }: Props) => {
  // ── Scope lookup state ──
  const [snInput, setSnInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [scopeResult, setScopeResult] = useState<ScopeLookupResult | null | 'not-found'>(undefined as unknown as null);
  const scopeFound = scopeResult !== null && scopeResult !== 'not-found' && scopeResult !== undefined;

  // ── Lookups ──
  const [statuses, setStatuses]       = useState<LookupOption[]>([]);
  const [scopeTypes, setScopeTypes]   = useState<LookupOption[]>([]);
  const [clients, setClients]         = useState<LookupOption[]>([]);
  const [depts, setDepts]             = useState<LookupOption[]>([]);
  const [salesReps, setSalesReps]     = useState<LookupOption[]>([]);
  const [pricingCats, setPricingCats] = useState<LookupOption[]>([]);
  const [payTerms, setPayTerms]       = useState<LookupOption[]>([]);
  const [carriers, setCarriers]       = useState<LookupOption[]>([]);
  const [levels, setLevels]           = useState<LookupOption[]>([]);
  const [reasons, setReasons]         = useState<LookupOption[]>([]);

  // ── Form state ──
  const [form, setForm] = useState<Partial<CreateRepairPayload>>({
    dateIn: new Date().toISOString().split('T')[0],
  });
  const [newClientKey, setNewClientKey] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof CreateRepairPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v || null }));

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getRepairStatuses(),
      getScopeTypes(),
      getClientsSimple(),
      getSalesReps(),
      getPricingCategories(),
      getPaymentTerms(),
      getCarriers(),
      getRepairLevels(),
      getRepairReasonOptions(),
    ]).then(([s, st, c, sr, pc, pt, car, lv, rr]) => {
      setStatuses(s.map(x => ({ key: x.statusId, name: x.statusName })));
      setScopeTypes(st);
      setClients(c);
      setSalesReps(sr);
      setPricingCats(pc);
      setPayTerms(pt);
      setCarriers(car);
      setLevels(lv);
      setReasons(rr);
    }).catch(() => message.error('Failed to load form data'));
  }, [open]);

  // Load depts when new-scope client changes
  useEffect(() => {
    if (!newClientKey) { setDepts([]); return; }
    getDepartmentsByClient(newClientKey).then(setDepts).catch(() => { message.error('Failed to load departments'); });
  }, [newClientKey]);

  const handleLookup = async () => {
    if (!snInput.trim()) return;
    setLookingUp(true);
    try {
      const result = await lookupScopeBySerial(snInput.trim());
      if (result) {
        setScopeResult(result);
        setForm(prev => ({
          ...prev,
          scopeKey: result.scopeKey,
          deptKey: result.deptKey ?? prev.deptKey,
        }));
      } else {
        setScopeResult('not-found');
        setForm(prev => ({ ...prev, scopeKey: null, serialNumber: snInput.trim() }));
      }
    } catch {
      message.error('Scope lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.deptKey) { message.error('Department is required'); return; }
    if (!form.dateIn)  { message.error('Date In is required'); return; }
    setSubmitting(true);
    try {
      const payload: CreateRepairPayload = {
        ...form as CreateRepairPayload,
        deptKey: Number(form.deptKey),
        dateIn: form.dateIn,
        serialNumber: scopeResult === 'not-found' ? snInput.trim() : (form.serialNumber ?? null),
      };
      const { repairKey } = await createRepair(payload);
      message.success(`Repair #${repairKey} created`);
      onCreated();
      handleClose();
    } catch (e) {
      console.error('[NewRepair] create failed:', e);
      message.error('Failed to create repair');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSnInput('');
    setScopeResult(undefined as unknown as null);
    setForm({ dateIn: new Date().toISOString().split('T')[0] });
    setNewClientKey(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Repair</span>}
      width={680}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Instrument Lookup ── */}
      <div style={sectionHead}>Instrument Lookup</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div style={label}>Serial Number</div>
          <input
            value={snInput}
            onChange={e => setSnInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Enter serial number and press Search"
            style={field}
          />
        </div>
        <button
          onClick={handleLookup}
          disabled={lookingUp}
          style={{
            height: 28, padding: '0 14px', fontSize: 11, fontWeight: 700,
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {lookingUp ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Found */}
      {scopeFound && (
        <div style={{
          marginTop: 8, padding: '8px 10px', background: 'var(--primary-light)',
          border: '1px solid var(--primary)', borderRadius: 4, fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Scope Found</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
            <span><b>Client:</b> {(scopeResult as ScopeLookupResult).clientName}</span>
            <span><b>Dept:</b> {(scopeResult as ScopeLookupResult).deptName}</span>
            <span><b>Type:</b> {(scopeResult as ScopeLookupResult).scopeTypeDesc}</span>
            <span><b>Mfr:</b> {(scopeResult as ScopeLookupResult).manufacturer}</span>
          </div>
        </div>
      )}

      {/* Not found — new scope fields */}
      {scopeResult === 'not-found' && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4 }}>
          <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8, fontSize: 11 }}>
            Serial not found — fill in scope details below
          </div>
          <div style={grid2}>
            <F label="Client *">
              <Sel
                value={newClientKey ?? undefined}
                onChange={v => { setNewClientKey(Number(v) || null); }}
                options={clients}
              />
            </F>
            <F label="Department *">
              <Sel
                value={form.deptKey ?? undefined}
                onChange={v => set('deptKey', Number(v) || undefined)}
                options={depts}
              />
            </F>
          </div>
          <div style={{ ...grid2, marginTop: 6 }}>
            <F label="Scope Type">
              <Sel
                value={form.scopeTypeKey ?? undefined}
                onChange={v => set('scopeTypeKey', Number(v) || undefined)}
                options={scopeTypes}
              />
            </F>
          </div>
        </div>
      )}

      {/* ── Repair Info ── */}
      <div style={sectionHead}>Repair Info</div>
      <div style={grid3}>
        <F label="Date In *">
          <Inp value={form.dateIn ?? ''} onChange={v => set('dateIn', v)} type="date" />
        </F>
        <F label="Status">
          <Sel value={form.statusId ?? undefined} onChange={v => set('statusId', Number(v) || undefined)} options={statuses} />
        </F>
        <F label="PO #">
          <Inp value={form.purchaseOrder ?? ''} onChange={v => set('purchaseOrder', v)} />
        </F>
        <F label="Customer Ref / CMMS WO#">
          <Inp value={form.rackPosition ?? ''} onChange={v => set('rackPosition', v)} />
        </F>
        <F label="Source">
          <select value={form.displayCustomerComplaint ?? ''} onChange={e => set('displayCustomerComplaint', e.target.value)} style={field}>
            <option value="">— select —</option>
            {['Email','Phone','Portal','Van Service','Walk-in'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Level">
          <Sel value={undefined} onChange={v => set('billType', Number(v) || undefined)} options={levels} />
        </F>
        <F label="Reason">
          <Sel value={form.reasonKey ?? undefined} onChange={v => set('reasonKey', Number(v) || undefined)} options={reasons} />
        </F>
        <F label="Rack">
          <Inp value={form.rackPosition ?? ''} onChange={v => set('rackPosition', v)} />
        </F>
      </div>

      {/* ── Customer Complaint ── */}
      <div style={{ marginTop: 6 }}>
        <div style={label}>Customer Complaint</div>
        <textarea
          value={form.complaint ?? ''}
          onChange={e => set('complaint', e.target.value)}
          rows={2}
          style={{ ...field, height: 'auto', padding: '4px 7px', resize: 'vertical' }}
        />
      </div>

      {/* ── Inbound Shipping ── */}
      <div style={sectionHead}>Inbound Shipping</div>
      <div style={grid3}>
        <F label="Carrier">
          <Sel value={form.carrierKey ?? undefined} onChange={v => set('carrierKey', Number(v) || undefined)} options={carriers} />
        </F>
        <F label="Inbound Tracking #">
          <Inp value={form.inboundTracking ?? ''} onChange={v => set('inboundTracking', v)} />
        </F>
        <F label="Pickup Required">
          <select value={form.pickupRequired ?? ''} onChange={e => set('pickupRequired', e.target.value)} style={field}>
            <option value="">— select —</option>
            <option value="Y">Yes</option>
            <option value="N">No</option>
          </select>
        </F>
      </div>

      {/* ── Billing ── */}
      <div style={sectionHead}>Billing</div>
      <div style={grid3}>
        <F label="Pricing Category">
          <Sel value={form.pricingCategoryKey ?? undefined} onChange={v => set('pricingCategoryKey', Number(v) || undefined)} options={pricingCats} />
        </F>
        <F label="Sales Rep">
          <Sel value={form.salesRepKey ?? undefined} onChange={v => set('salesRepKey', Number(v) || undefined)} options={salesReps} />
        </F>
        <F label="Payment Terms">
          <Sel value={form.paymentTermsKey ?? undefined} onChange={v => set('paymentTermsKey', Number(v) || undefined)} options={payTerms} />
        </F>
        <F label="Bill To">
          <select value={form.billTo ?? ''} onChange={e => set('billTo', e.target.value)} style={field}>
            <option value="">— select —</option>
            {['Customer','Department','Government','Third Party'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </F>
        <F label="Bill Email">
          <Inp value={form.billEmail ?? ''} onChange={v => set('billEmail', v)} />
        </F>
        <F label="Billing Type">
          <select value={form.billType ?? ''} onChange={e => set('billType', Number(e.target.value) || undefined)} style={field}>
            <option value="">— select —</option>
            <option value="1">Email Only</option>
            <option value="2">Mail</option>
            <option value="3">Fax</option>
          </select>
        </F>
      </div>

      {/* ── Display Options ── */}
      <div style={sectionHead}>Display Options</div>
      <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
        {([
          ['Itemized Amounts',      'displayItemAmt',           'Y'],
          ['Itemized Descriptions', 'displayItemDesc',          'Y'],
          ['Customer Complaint',    'displayCustomerComplaint', 'Y'],
        ] as const).map(([lbl, key, val]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="checkbox"
              checked={form[key] === val}
              onChange={e => set(key, e.target.checked ? val : null)}
            />
            {lbl}
          </label>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {submitting ? 'Creating…' : 'Create Repair'}
        </button>
      </div>
    </Modal>
  );
};
