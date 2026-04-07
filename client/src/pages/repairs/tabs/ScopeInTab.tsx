import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairFull } from '../types';
import type { LookupOption } from '../../../api/lookups';
import { getSalesReps, getPricingCategories, getPaymentTerms } from '../../../api/lookups';
import { patchRepairHeader, type RepairHeaderPatch } from '../../../api/repairs';
import { useAutosave } from '../../../hooks/useAutosave';
import { AutosaveIndicator } from '../../../components/common/AutosaveIndicator';

interface ScopeInTabProps {
  repair: RepairFull;
}

/* ── Shared styles ────────────────────────────────────── */
const lblStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2,
};
const inputStyle: React.CSSProperties = {
  height: 26, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};
/* ── Readonly field (same look as before) ─────────────── */
const F = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <div style={lblStyle}>{label}</div>
    <div style={{
      height: 26, border: '1px solid var(--neutral-200)', borderRadius: 3,
      background: 'var(--bg)', padding: '0 7px', fontSize: 11,
      color: value != null && value !== '' ? 'var(--muted)' : 'var(--muted)',
      fontStyle: value != null && value !== '' ? 'normal' : 'italic',
      display: 'flex', alignItems: 'center',
    }}>
      {value != null && value !== '' ? String(value) : '—'}
    </div>
  </div>
);

/* ── Editable text input field ────────────────────────── */
const TF = ({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) => (
  <div>
    <div style={lblStyle}>{label}</div>
    <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

/* ── Editable number input field ──────────────────────── */
const NF = ({ label, value, onChange, prefix }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string;
}) => (
  <div>
    <div style={lblStyle}>{label}</div>
    <div style={{ position: 'relative' }}>
      {prefix && <span style={{ position: 'absolute', left: 7, top: 5, fontSize: 11, color: 'var(--muted)', pointerEvents: 'none' }}>{prefix}</span>}
      <input
        type="number" step="any"
        style={{ ...inputStyle, paddingLeft: prefix ? 16 : 7 }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  </div>
);

/* ── Dropdown field ───────────────────────────────────── */
const DF = ({ label, value, options, onChange }: {
  label: string; value: number | string; options: LookupOption[]; onChange: (v: number) => void;
}) => (
  <div>
    <div style={lblStyle}>{label}</div>
    <select
      style={{ ...inputStyle, appearance: 'auto' }}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    >
      <option value={0}>—</option>
      {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
    </select>
  </div>
);

const Section = ({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
    <div style={{
      background: 'var(--neutral-50, var(--bg))', padding: '6px 10px',
      fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '.05em',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{title}</span>
      {extra}
    </div>
    <div style={{ padding: 10 }}>{children}</div>
  </div>
);

export const ScopeInTab = ({ repair }: ScopeInTabProps) => {
  /* ── Lookup data ──────────────────────────────────────── */
  const [salesReps, setSalesReps] = useState<LookupOption[]>([]);
  const [pricingCats, setPricingCats] = useState<LookupOption[]>([]);
  const [payTerms, setPayTerms] = useState<LookupOption[]>([]);

  useEffect(() => {
    getSalesReps().then(setSalesReps).catch(() => { message.error('Failed to load sales reps'); });
    getPricingCategories().then(setPricingCats).catch(() => { message.error('Failed to load pricing categories'); });
    getPaymentTerms().then(setPayTerms).catch(() => { message.error('Failed to load payment terms'); });
  }, []);

  /* ── Local form state (mirrors repair, editable) ──────── */
  const [salesRepKey, setSalesRepKey] = useState(repair.salesRepKey ?? 0);
  const [pricingCategoryKey, setPricingCategoryKey] = useState(repair.pricingCategoryKey ?? 0);
  const [paymentTermsKey, setPaymentTermsKey] = useState(repair.paymentTermsKey ?? 0);
  const [discountPct, setDiscountPct] = useState(repair.discountPct != null ? String(repair.discountPct) : '');
  const [shippingCostIn, setShippingCostIn] = useState(repair.shippingCostIn != null ? String(repair.shippingCostIn) : '');
  const [inboundTracking, setInboundTracking] = useState(repair.trackingNumberIn ?? '');
  const [requisition, setRequisition] = useState(repair.requisition ?? '');
  // Ship To
  const [shipName, setShipName] = useState(repair.shipName ?? '');
  const [shipAddr1, setShipAddr1] = useState(repair.shipAddr1 ?? '');
  const [shipAddr2, setShipAddr2] = useState(repair.shipAddr2 ?? '');
  const [shipCity, setShipCity] = useState(repair.shipCity ?? '');
  const [shipState, setShipState] = useState(repair.shipState ?? '');
  const [shipZip, setShipZip] = useState(repair.shipZip ?? '');
  // Bill To
  const [billName, setBillName] = useState(repair.billName ?? '');
  const [billAddr1, setBillAddr1] = useState(repair.billAddr1 ?? '');
  const [billAddr2, setBillAddr2] = useState(repair.billAddr2 ?? '');
  const [billCity, setBillCity] = useState(repair.billCity ?? '');
  const [billState, setBillState] = useState(repair.billState ?? '');
  const [billZip, setBillZip] = useState(repair.billZip ?? '');

  /* ── Autosave wiring ──────────────────────────────────── */
  const saveFn = useCallback(
    (data: Partial<RepairHeaderPatch>) => patchRepairHeader(repair.repairKey, data),
    [repair.repairKey],
  );
  const { handleChange, status } = useAutosave<RepairHeaderPatch>(saveFn, 800);

  /* ── Helpers that update local state + queue autosave ── */
  const onDropdown = (field: keyof RepairHeaderPatch, setter: (v: number) => void) => (v: number) => {
    setter(v);
    handleChange(field, v || undefined);
  };
  const onText = (field: keyof RepairHeaderPatch, setter: (v: string) => void) => (v: string) => {
    setter(v);
    handleChange(field, v || undefined);
  };
  const onNumber = (field: keyof RepairHeaderPatch, setter: (v: string) => void) => (v: string) => {
    setter(v);
    handleChange(field, v !== '' ? Number(v) : undefined);
  };

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* LEFT */}
      <div>
        <Section title="Inbound Shipping" extra={<AutosaveIndicator status={status} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="Inbound Service Level" value={repair.inboundServiceLevel} />
            <TF label="Inbound Tracking" value={inboundTracking} onChange={onText('inboundTracking', setInboundTracking)} />
            <NF label="Shipping Cost In" value={shippingCostIn} onChange={onNumber('shippingCostIn', setShippingCostIn)} prefix="$" />
            <F label="Distributor" value={repair.distributor} />
          </div>
        </Section>

        <Section title="Approval & Requisition">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 8 }}>
            <F label="Sent Date" value={repair.approvalSentDate} />
            <F label="Received Approval" value={repair.dateApproved} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <F label="Name on Approval via Portal" value={repair.approvalName} />
          </div>
          <TF label="Requisition #" value={requisition} onChange={onText('requisition', setRequisition)} />
        </Section>

        <Section title="Sales & Reporting">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <DF label="Sales Rep" value={salesRepKey} options={salesReps} onChange={onDropdown('salesRepKey', setSalesRepKey)} />
            <F label="Reporting Group" value={repair.reportingGroup} />
            <DF label="Pricing Category" value={pricingCategoryKey} options={pricingCats} onChange={onDropdown('pricingCategoryKey', setPricingCategoryKey)} />
            <NF label="Discount %" value={discountPct} onChange={onNumber('discountPct', setDiscountPct)} />
          </div>
        </Section>
      </div>

      {/* RIGHT */}
      <div>
        <Section title="Shipping Address">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <TF label="Ship to Name" value={shipName} onChange={onText('shipName', setShipName)} />
            <TF label="Address" value={shipAddr1} onChange={onText('shipAddr1', setShipAddr1)} />
            <TF label="Address 2" value={shipAddr2} onChange={onText('shipAddr2', setShipAddr2)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
              <TF label="City" value={shipCity} onChange={onText('shipCity', setShipCity)} />
              <TF label="ST" value={shipState} onChange={onText('shipState', setShipState)} />
              <TF label="ZIP" value={shipZip} onChange={onText('shipZip', setShipZip)} />
            </div>
          </div>
        </Section>

        <Section title="Billing Address">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <TF label="Bill to Name" value={billName} onChange={onText('billName', setBillName)} />
            <TF label="Address" value={billAddr1} onChange={onText('billAddr1', setBillAddr1)} />
            <TF label="Address 2" value={billAddr2} onChange={onText('billAddr2', setBillAddr2)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
              <TF label="City" value={billCity} onChange={onText('billCity', setBillCity)} />
              <TF label="ST" value={billState} onChange={onText('billState', setBillState)} />
              <TF label="ZIP" value={billZip} onChange={onText('billZip', setBillZip)} />
            </div>
          </div>
        </Section>

        <Section title="Invoice Options">
          {[
            { key: 'displayComplaintOnInvoice', label: 'Display customer complaint on invoice' },
            { key: 'displayItemizedDesc',       label: 'Display itemized description' },
            { key: 'displayItemizedAmounts',    label: 'Display itemized amounts' },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--label)', padding: '3px 0' }}>
              <input type="checkbox" readOnly
                checked={!!(repair as unknown as Record<string, unknown>)[key]}
              />
              {label}
            </div>
          ))}
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="Bill to Customer / Distro" value={repair.billToCustomer} />
            <DF label="Payment Terms" value={paymentTermsKey} options={payTerms} onChange={onDropdown('paymentTermsKey', setPaymentTermsKey)} />
          </div>
        </Section>
      </div>
    </div>
  );
};
