import { useState, useEffect } from 'react';
import type { ClientFull } from '../types';
import { SectionCard } from '../../../components/shared';

interface AddressesTabProps {
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

const fieldWrap: React.CSSProperties = { marginBottom: 10 };

const Field = ({ label, value, field, onChange, type = 'text', span2 = false }: {
  label: string;
  value: string | undefined | null;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: string;
  span2?: boolean;
}) => (
  <div style={{ ...fieldWrap, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <div style={labelStyle}>{label}</div>
    <input
      style={inputStyle}
      type={type}
      value={value ?? ''}
      onChange={e => onChange(field, e.target.value)}
    />
  </div>
);

export const AddressesTab = ({ client, onChange }: AddressesTabProps) => {
  const [shipSameBill, setShipSameBill] = useState(false);

  // When "Same as Bill To" is checked, copy Bill To → Ship To
  useEffect(() => {
    if (!shipSameBill) return;
    onChange('shipName1', client.billName1 ?? '');
    onChange('shipAddr1', client.billAddr1 ?? '');
    onChange('shipAddr2', client.billAddr2 ?? '');
    onChange('shipCity', client.billCity ?? '');
    onChange('shipState', client.billState ?? '');
    onChange('shipZip', client.billZip ?? '');
    onChange('shipCountry', client.billCountry ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipSameBill, client.billName1, client.billAddr1, client.billAddr2, client.billCity, client.billState, client.billZip, client.billCountry]);

  const handleBillChange = (field: string, value: string) => {
    onChange(field, value);
    if (shipSameBill) {
      const shipMap: Record<string, string> = {
        billName1: 'shipName1',
        billAddr1: 'shipAddr1',
        billAddr2: 'shipAddr2',
        billCity: 'shipCity',
        billState: 'shipState',
        billZip: 'shipZip',
        billCountry: 'shipCountry',
      };
      if (shipMap[field]) onChange(shipMap[field], value);
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', gap: 16 }}>
      {/* Bill To */}
      <div style={{ flex: 1 }}>
        <SectionCard title="Bill To">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Name" value={client.billName1} field="billName1" onChange={handleBillChange} span2 />
            <Field label="Address" value={client.billAddr1} field="billAddr1" onChange={handleBillChange} span2 />
            <Field label="Address 2" value={client.billAddr2} field="billAddr2" onChange={handleBillChange} span2 />
            <Field label="City" value={client.billCity} field="billCity" onChange={handleBillChange} span2 />
            <Field label="State" value={client.billState} field="billState" onChange={handleBillChange} />
            <Field label="Zip" value={client.billZip} field="billZip" onChange={handleBillChange} />
            <Field label="Country" value={client.billCountry} field="billCountry" onChange={handleBillChange} span2 />
            <Field label="Billing Contact" value={client.billContact} field="billContact" onChange={onChange} span2 />
            <Field label="Billing Email" value={client.billEmail} field="billEmail" onChange={onChange} type="email" span2 />
          </div>
        </SectionCard>
      </div>

      {/* Ship To */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 0 }}>
          <div style={{
            background: 'var(--primary)',
            color: '#fff',
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>Ship To</span>
            <label style={{
              fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center',
              gap: 4, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', color: '#fff',
            }}>
              <input
                type="checkbox"
                checked={shipSameBill}
                onChange={e => setShipSameBill(e.target.checked)}
                style={{ width: 'auto', height: 'auto', cursor: 'pointer' }}
              />
              Same as Bill To
            </label>
          </div>
          <div style={{
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            padding: 12,
            background: 'var(--card)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Name" value={client.shipName1} field="shipName1" onChange={onChange} span2 />
              <Field label="Address" value={client.shipAddr1} field="shipAddr1" onChange={onChange} span2 />
              <Field label="Address 2" value={client.shipAddr2} field="shipAddr2" onChange={onChange} span2 />
              <Field label="City" value={client.shipCity} field="shipCity" onChange={onChange} span2 />
              <Field label="State" value={client.shipState} field="shipState" onChange={onChange} />
              <Field label="Zip" value={client.shipZip} field="shipZip" onChange={onChange} />
              <Field label="Country" value={client.shipCountry} field="shipCountry" onChange={onChange} span2 />
              <Field label="Shipping Email" value={client.shipEmail} field="shipEmail" onChange={onChange} type="email" span2 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
