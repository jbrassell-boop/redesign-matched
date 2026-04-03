import type { ClientFull } from '../types';
import { SectionCard } from '../../../components/shared';

interface InfoTabProps {
  client: ClientFull;
  onChange: (field: string, value: string | boolean | number | null) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 13,
  border: '1px solid var(--neutral-200)',
  borderRadius: 4,
  outline: 'none',
  background: 'var(--card)',
  color: 'var(--text)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.04em',
  marginBottom: 4,
};

const fieldWrap: React.CSSProperties = {
  marginBottom: 12,
};

const EditField = ({ label, value, field, onChange, type = 'text' }: {
  label: string;
  value: string | number | undefined | null;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: string;
}) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <input
      style={inputStyle}
      type={type}
      value={value ?? ''}
      onChange={e => onChange(field, e.target.value)}
    />
  </div>
);

const ToggleField = ({ label, value, field, onChange }: {
  label: string;
  value: boolean | undefined;
  field: string;
  onChange: (field: string, value: boolean) => void;
}) => (
  <label style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 4,
    fontSize: 12, fontWeight: 500, color: 'var(--text)',
    background: value ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--card)',
    borderColor: value ? 'rgba(var(--primary-rgb), 0.3)' : 'var(--border)',
  }}>
    <input
      type="checkbox"
      checked={value ?? false}
      onChange={e => onChange(field, e.target.checked)}
      style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--primary)' }}
    />
    {label}
  </label>
);

const ReadonlyField = ({ label, value }: { label: string; value: string | undefined | null }) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 0' }}>
      {value || '\u2014'}
    </div>
  </div>
);

export const InfoTab = ({ client, onChange }: InfoTabProps) => (
  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
    <div>
      <SectionCard title="Company Information">
        <EditField label="Name" value={client.name} field="name" onChange={onChange} />
        <EditField label="Address 1" value={client.address1} field="address1" onChange={onChange} />
        <EditField label="Address 2" value={client.address2} field="address2" onChange={onChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <EditField label="City" value={client.city} field="city" onChange={onChange} />
          <EditField label="State" value={client.state} field="state" onChange={onChange} />
          <EditField label="Zip" value={client.zip} field="zip" onChange={onChange} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <EditField label="Phone" value={client.phone} field="phone" onChange={onChange} />
          <EditField label="Fax" value={client.fax} field="fax" onChange={onChange} />
        </div>
      </SectionCard>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="Billing Information">
          <EditField label="Billing Email" value={client.billingEmail} field="billingEmail" onChange={onChange} />
          <EditField label="Contract Number" value={client.contractNumber} field="contractNumber" onChange={onChange} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <EditField label="Discount %" value={client.discountPct} field="discountPct" onChange={onChange} type="number" />
          </div>
        </SectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="Additional Details">
          <EditField label="Secondary Name / AP Contact" value={client.secondaryName} field="secondaryName" onChange={onChange} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <EditField label="Reference #1" value={client.reference1} field="reference1" onChange={onChange} />
            <EditField label="Reference #2" value={client.reference2} field="reference2" onChange={onChange} />
          </div>
        </SectionCard>
      </div>
    </div>

    <div>
      <SectionCard title="Account Settings">
        <ReadonlyField label="Customer Since" value={client.customerSince ? new Date(client.customerSince).toLocaleDateString() : undefined} />
        <ReadonlyField label="Sales Rep" value={client.salesRep} />
        <ReadonlyField label="Pricing Category" value={client.pricingCategory} />
        <ReadonlyField label="Payment Terms" value={client.paymentTerms} />
        <ReadonlyField label="Distributor" value={client.distributor} />
      </SectionCard>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="Invoice &amp; Options">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <ToggleField label="Blind PS3" value={client.blindPS3} field="blindPS3" onChange={onChange} />
            <ToggleField label="Req. Totals Only" value={client.reqTotalsOnly} field="reqTotalsOnly" onChange={onChange} />
            <ToggleField label="Blind Totals On Final" value={client.blindTotalsOnFinal} field="blindTotalsOnFinal" onChange={onChange} />
            <ToggleField label="Skip Metrics" value={client.skipMetrics} field="skipMetrics" onChange={onChange} />
            <ToggleField label="PO Required" value={client.poRequired} field="poRequired" onChange={onChange} />
            <ToggleField label="Never Hold" value={client.neverHold} field="neverHold" onChange={onChange} />
            <ToggleField label="Skip Tracking" value={client.skipTracking} field="skipTracking" onChange={onChange} />
            <ToggleField label="Email New Repairs" value={client.emailNewRepairs} field="emailNewRepairs" onChange={onChange} />
            <ToggleField label="National Account" value={client.nationalAccount} field="nationalAccount" onChange={onChange} />
            <ToggleField label="GPO / Nat'l Account" value={client.isGPO} field="isGPO" onChange={onChange} />
          </div>
        </SectionCard>
      </div>

      {client.comments !== undefined && (
        <div style={{ marginTop: 16 }}>
          <SectionCard title="Comments">
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={client.comments ?? ''}
              onChange={e => onChange('comments', e.target.value)}
            />
          </SectionCard>
        </div>
      )}
    </div>
  </div>
);
