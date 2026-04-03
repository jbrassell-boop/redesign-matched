import { useState, useEffect } from 'react';
import type { DepartmentFull } from '../types';

interface AddressesTabProps {
  dept: DepartmentFull;
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
  marginBottom: 3,
};

const fieldWrap: React.CSSProperties = { marginBottom: 8 };

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

const colHeadStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 8,
  paddingBottom: 4,
  borderBottom: '1px solid var(--border)',
};

const colStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: 12,
};

export const AddressesTab = ({ dept, onChange }: AddressesTabProps) => {
  const [shipSameBill, setShipSameBill] = useState(false);

  useEffect(() => {
    if (!shipSameBill) return;
    onChange('shipName1', dept.billName1 ?? '');
    onChange('shipAddr1', dept.billAddr1 ?? '');
    onChange('shipAddr2', dept.billAddr2 ?? '');
    onChange('shipCity', dept.billCity ?? '');
    onChange('shipState', dept.billState ?? '');
    onChange('shipZip', dept.billZip ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipSameBill, dept.billName1, dept.billAddr1, dept.billAddr2, dept.billCity, dept.billState, dept.billZip]);

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
      };
      if (shipMap[field]) onChange(shipMap[field], value);
    }
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 }}>
        <label style={{
          fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center',
          gap: 5, cursor: 'pointer', color: 'var(--navy)',
        }}>
          <input
            type="checkbox"
            checked={shipSameBill}
            onChange={e => setShipSameBill(e.target.checked)}
            style={{ width: 'auto', height: 'auto', cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
          Same as Bill To (Ship)
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {/* Mailing */}
        <div style={colStyle}>
          <div style={colHeadStyle}>Mailing</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Field label="Address" value={dept.mailAddr1} field="mailAddr1" onChange={onChange} span2 />
            <Field label="Address 2" value={dept.mailAddr2} field="mailAddr2" onChange={onChange} span2 />
            <Field label="City" value={dept.mailCity} field="mailCity" onChange={onChange} span2 />
            <Field label="State" value={dept.mailState} field="mailState" onChange={onChange} />
            <Field label="Zip" value={dept.mailZip} field="mailZip" onChange={onChange} />
            <Field label="Country" value={dept.mailCountry} field="mailCountry" onChange={onChange} span2 />
          </div>
        </div>

        {/* Bill To */}
        <div style={colStyle}>
          <div style={colHeadStyle}>Bill To</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Field label="Name" value={dept.billName1} field="billName1" onChange={handleBillChange} span2 />
            <Field label="Address" value={dept.billAddr1} field="billAddr1" onChange={handleBillChange} span2 />
            <Field label="Address 2" value={dept.billAddr2} field="billAddr2" onChange={handleBillChange} span2 />
            <Field label="City" value={dept.billCity} field="billCity" onChange={handleBillChange} span2 />
            <Field label="State" value={dept.billState} field="billState" onChange={handleBillChange} />
            <Field label="Zip" value={dept.billZip} field="billZip" onChange={handleBillChange} />
            <Field label="Email" value={dept.billEmail} field="billEmail" onChange={onChange} type="email" span2 />
          </div>
        </div>

        {/* Ship To */}
        <div style={colStyle}>
          <div style={colHeadStyle}>Ship To</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Field label="Name" value={dept.shipName1} field="shipName1" onChange={onChange} span2 />
            <Field label="Address" value={dept.address1} field="address1" onChange={onChange} span2 />
            <Field label="Address 2" value={dept.shipAddr2} field="shipAddr2" onChange={onChange} span2 />
            <Field label="City" value={dept.city} field="city" onChange={onChange} span2 />
            <Field label="State" value={dept.state} field="state" onChange={onChange} />
            <Field label="Zip" value={dept.zip} field="zip" onChange={onChange} />
            <Field label="Country" value={dept.shipCountry} field="shipCountry" onChange={onChange} span2 />
          </div>
        </div>
      </div>
    </div>
  );
};
