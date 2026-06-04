import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { createRepair, type CreateRepairPayload } from '../../../api/repairs';
import { getRepairStatuses } from '../../../api/repairs';
import {
  lookupScopeBySerial, getScopeTypes, getClientsSimple,
  getDepartmentsByClient, getSalesReps, getPricingCategories,
  getPaymentTerms, getCarriers, getRepairReasonOptions,
  type LookupOption, type ScopeLookupResult,
} from '../../../api/lookups';

// ── Shared form field styles ──
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const field: React.CSSProperties = {
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

const F = ({ label: lbl, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}>
    <span style={label}>{lbl}</span>
    {children}
  </label>
);

const Sel = ({ value, onChange, options, placeholder, 'aria-label': ariaLabel }: {
  value: number | string | undefined;
  onChange: (v: string) => void;
  options: LookupOption[];
  placeholder?: string;
  'aria-label'?: string;
}) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)} aria-label={ariaLabel} style={field}>
    <option value="">{placeholder ?? '— select —'}</option>
    {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
  </select>
);

const Inp = ({ value, onChange, placeholder, type, 'aria-label': ariaLabel }: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  'aria-label'?: string;
}) => (
  <input
    type={type ?? 'text'}
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={ariaLabel}
    style={field}
  />
);

const pickRow = (active: boolean): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8, width: '100%',
  textAlign: 'left', padding: '7px 10px', fontSize: 11, cursor: 'pointer',
  border: 'none', borderTop: '1px solid var(--neutral-100)', alignItems: 'center',
  background: active ? 'var(--primary-light)' : 'var(--card)',
  fontFamily: 'inherit', color: 'var(--label)',
});

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type LookupMsg = { tone: 'ok' | 'warn' | 'info'; text: string } | null;

export const NewRepairModal = ({ open, onClose, onCreated }: Props) => {
  // ── Scope lookup state ──
  const [snInput, setSnInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [matches, setMatches] = useState<ScopeLookupResult[]>([]); // shown as a picker when >1
  const [lookupMsg, setLookupMsg] = useState<LookupMsg>(null);

  // ── Lookups ──
  const [statuses, setStatuses]       = useState<LookupOption[]>([]);
  const [scopeTypes, setScopeTypes]   = useState<LookupOption[]>([]);
  const [clients, setClients]         = useState<LookupOption[]>([]);
  const [depts, setDepts]             = useState<LookupOption[]>([]);
  const [salesReps, setSalesReps]     = useState<LookupOption[]>([]);
  const [pricingCats, setPricingCats] = useState<LookupOption[]>([]);
  const [payTerms, setPayTerms]       = useState<LookupOption[]>([]);
  const [carriers, setCarriers]       = useState<LookupOption[]>([]);
  const [reasons, setReasons]         = useState<LookupOption[]>([]);

  // ── Form state ──
  const [form, setForm] = useState<Partial<CreateRepairPayload>>({
    dateIn: new Date().toISOString().split('T')[0],
  });
  const [clientKey, setClientKey] = useState<number | null>(null);
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
      getRepairReasonOptions(),
    ]).then(([s, st, c, sr, pc, pt, car, rr]) => {
      setStatuses(s.map(x => ({ key: x.statusId, name: x.statusName })));
      setScopeTypes(st);
      setClients(c);
      setSalesReps(sr);
      setPricingCats(pc);
      setPayTerms(pt);
      setCarriers(car);
      setReasons(rr);
    }).catch(() => message.error('Failed to load form data'));
  }, [open]);

  // Load departments whenever the selected client changes.
  useEffect(() => {
    if (!clientKey) { setDepts([]); return; }
    getDepartmentsByClient(clientKey).then(setDepts).catch(() => { message.error('Failed to load departments'); });
  }, [clientKey]);

  // Apply a matched scope to the form (auto-fills client/dept/type and links the scope).
  const chooseScope = (m: ScopeLookupResult) => {
    setClientKey(m.clientKey ?? null);
    setMatches([]);
    setForm(prev => ({
      ...prev,
      scopeKey: m.scopeKey,
      deptKey: m.deptKey ?? prev.deptKey,
      scopeTypeKey: m.scopeTypeKey ?? prev.scopeTypeKey,
      serialNumber: m.serialNumber || prev.serialNumber,
    }));
    setLookupMsg({ tone: 'ok', text: `Matched ${m.clientName || '—'} · ${m.deptName || '—'}` });
  };

  // Changing client manually invalidates the prior department and any linked scope.
  const handleClientChange = (v: string) => {
    setClientKey(Number(v) || null);
    setForm(prev => ({ ...prev, deptKey: undefined, scopeKey: null }));
  };

  // Changing department manually means we're no longer using the matched scope.
  const handleDeptChange = (v: string) => {
    setForm(prev => ({ ...prev, deptKey: Number(v) || undefined, scopeKey: null }));
  };

  const handleLookup = async () => {
    const sn = snInput.trim();
    if (!sn) return;
    setLookingUp(true);
    setMatches([]);
    try {
      const results = await lookupScopeBySerial(sn);
      if (results.length === 0) {
        // Not found — keep what they typed; a new scope is created on submit.
        setForm(prev => ({ ...prev, scopeKey: null, serialNumber: sn }));
        setLookupMsg({ tone: 'warn', text: 'No scope found for that serial — pick a client & department and a new one will be created.' });
      } else if (results.length === 1) {
        chooseScope(results[0]);
      } else {
        setMatches(results);
        setForm(prev => ({ ...prev, serialNumber: sn }));
        setLookupMsg({ tone: 'info', text: `${results.length} scopes share this serial — choose the owner below.` });
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
        ...(form as CreateRepairPayload),
        deptKey: Number(form.deptKey),
        dateIn: form.dateIn,
        scopeKey: form.scopeKey ?? null,
        // Linked to an existing scope → serial follows it; otherwise the typed
        // serial seeds the new scope the backend creates.
        serialNumber: form.scopeKey ? (form.serialNumber ?? null) : (snInput.trim() || null),
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
    setMatches([]);
    setLookupMsg(null);
    setForm({ dateIn: new Date().toISOString().split('T')[0] });
    setClientKey(null);
    onClose();
  };

  const searchDisabled = lookingUp || !snInput.trim();

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Repair</span>}
      width={680}
      footer={null}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {/* ── Instrument Lookup (optional accelerator) ── */}
      <div style={sectionHead}>Instrument Lookup</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div style={label}>
            Serial Number{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>
              — optional, auto-fills client &amp; department
            </span>
          </div>
          <input
            value={snInput}
            onChange={e => setSnInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Enter a serial to auto-fill, or skip and pick a department below"
            aria-label="Instrument serial number lookup"
            style={field}
          />
        </div>
        <button
          onClick={handleLookup}
          disabled={searchDisabled}
          style={{
            height: 28, padding: '0 14px', fontSize: 11, fontWeight: 700,
            background: 'var(--primary)', color: 'var(--card)', border: 'none',
            borderRadius: 3, cursor: searchDisabled ? 'default' : 'pointer',
            opacity: searchDisabled ? 0.5 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {lookingUp ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Lookup status */}
      {lookupMsg && (
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 600,
          color: lookupMsg.tone === 'ok' ? 'var(--primary)'
               : lookupMsg.tone === 'warn' ? 'var(--danger)' : 'var(--navy)',
        }}>
          {lookupMsg.text}
        </div>
      )}

      {/* Multi-match disambiguation */}
      {matches.length > 1 && (
        <div style={{ marginTop: 8, border: '1px solid var(--neutral-200)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ background: 'var(--neutral-50)', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
            Choose the owner of serial “{snInput.trim()}”:
          </div>
          {matches.map(m => (
            <button key={m.scopeKey} type="button" onClick={() => chooseScope(m)} style={pickRow(form.scopeKey === m.scopeKey)}>
              <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.clientName || '—'}</span>
              <span style={{ color: 'var(--muted)' }}>{m.deptName || '—'}</span>
              <span style={{ color: 'var(--muted)' }}>{m.scopeTypeDesc || m.manufacturer || ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Scope Details (always visible — never gated behind a serial search) ── */}
      <div style={sectionHead}>Scope Details</div>
      <div style={grid3}>
        <F label="Client *">
          <Sel value={clientKey ?? undefined} onChange={handleClientChange} options={clients} aria-label="Client" />
        </F>
        <F label="Department *">
          <Sel
            value={form.deptKey ?? undefined}
            onChange={handleDeptChange}
            options={depts}
            placeholder={clientKey ? '— select —' : 'select a client first'}
            aria-label="Department"
          />
        </F>
        <F label="Scope Type">
          <Sel value={form.scopeTypeKey ?? undefined} onChange={v => set('scopeTypeKey', Number(v) || undefined)} options={scopeTypes} aria-label="Scope type" />
        </F>
      </div>
      {form.scopeKey ? (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--primary)' }}>
          Linked to existing scope #{form.scopeKey}. Changing client or department creates a new scope.
        </div>
      ) : snInput.trim() && lookupMsg?.tone === 'warn' ? (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
          A new scope will be created for serial “{snInput.trim()}”.
        </div>
      ) : null}

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
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {submitting ? 'Creating…' : 'Create Repair'}
        </button>
      </div>
    </Modal>
  );
};
