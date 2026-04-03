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
  value: string | undefined | null;
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
  value: boolean;
  field: string;
  onChange: (field: string, value: boolean) => void;
}) => (
  <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 8 }}>
    <input
      type="checkbox"
      checked={value}
      onChange={e => onChange(field, e.target.checked)}
      style={{ width: 16, height: 16, cursor: 'pointer' }}
    />
    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
  </div>
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
        <ToggleField label="GPO / National Account" value={client.isGPO} field="isGPO" onChange={onChange} />
      </SectionCard>

      {client.comments && (
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
