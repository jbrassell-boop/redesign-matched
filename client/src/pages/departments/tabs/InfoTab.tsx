import { useState, useEffect } from 'react';
import type { DepartmentFull } from '../types';
import { SectionCard } from '../../../components/shared';
import { getSalesReps, getPricingCategories } from '../../../api/lookups';
import type { LookupOption } from '../../../api/lookups';

const lookupZip = async (
  zip: string,
  cityField: string,
  stateField: string,
  onChange: (field: string, value: string) => void,
) => {
  if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return;
    const data = await res.json();
    const place = data.places?.[0];
    if (place) {
      onChange(cityField, place['place name']);
      onChange(stateField, place['state abbreviation']);
    }
  } catch { /* silent */ }
};

interface InfoTabProps {
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
  marginBottom: 4,
};

const fieldWrap: React.CSSProperties = { marginBottom: 12 };

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

export const InfoTab = ({ dept, onChange }: InfoTabProps) => {
  const [salesReps, setSalesReps] = useState<LookupOption[]>([]);
  const [pricingCats, setPricingCats] = useState<LookupOption[]>([]);

  useEffect(() => {
    getSalesReps().then(setSalesReps).catch(() => {});
    getPricingCategories().then(setPricingCats).catch(() => {});
  }, []);

  return (
  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
    <div>
      <SectionCard title="Department Information">
        <EditField label="Name" value={dept.name} field="name" onChange={onChange} />
        <EditField label="Address" value={dept.address1} field="address1" onChange={onChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <EditField label="City" value={dept.city} field="city" onChange={onChange} />
          <EditField label="State" value={dept.state} field="state" onChange={onChange} />
          <div style={fieldWrap}>
            <div style={labelStyle}>Zip</div>
            <input
              style={inputStyle}
              type="text"
              value={dept.zip ?? ''}
              onChange={e => { onChange('zip', e.target.value); lookupZip(e.target.value, 'city', 'state', onChange as (f: string, v: string) => void); }}
            />
          </div>
        </div>
        <EditField label="Phone" value={dept.phone} field="phone" onChange={onChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <EditField label="Contact First" value={dept.contactFirst} field="contactFirst" onChange={onChange} />
          <EditField label="Contact Last" value={dept.contactLast} field="contactLast" onChange={onChange} />
        </div>
        <EditField label="Contact Email" value={dept.contactEmail} field="contactEmail" onChange={onChange} />
      </SectionCard>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="Billing &amp; Defaults">
          <div style={fieldWrap}>
            <div style={labelStyle}>Sales Rep</div>
            <select style={{ ...inputStyle, height: 30, cursor: 'pointer' }}
              value={(dept as any).salesRepKey ?? ''}
              onChange={e => (onChange as any)('salesRepKey', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Select —</option>
              {salesReps.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>Pricing Category</div>
            <select style={{ ...inputStyle, height: 30, cursor: 'pointer' }}
              value={(dept as any).pricingCategoryKey ?? ''}
              onChange={e => (onChange as any)('pricingCategoryKey', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Select —</option>
              {pricingCats.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <EditField label="Discount %" value={dept.discountPct} field="discountPct" onChange={onChange} type="number" />
            <EditField label="Default Shipping" value={dept.defaultShipping} field="defaultShipping" onChange={onChange} type="number" />
          </div>
        </SectionCard>
      </div>
    </div>

    <div>
      <SectionCard title="Service Location">
        <ReadonlyField label="Location" value={dept.serviceLocation} />
      </SectionCard>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="Options &amp; Toggles">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <ToggleField label="Show Consumption On Req" value={dept.showConsumptionOnReq} field="showConsumptionOnReq" onChange={onChange} />
            <ToggleField label="Enforce Scope Type Filtering" value={dept.enforceScopeTypeFiltering} field="enforceScopeTypeFiltering" onChange={onChange} />
            <ToggleField label="Show Product ID" value={dept.showProductId} field="showProductId" onChange={onChange} />
            <ToggleField label="Show UA Or NWT" value={dept.showUaOrNwt} field="showUaOrNwt" onChange={onChange} />
            <ToggleField label="Show Itemized Descriptions" value={dept.showItemizedDescriptions} field="showItemizedDescriptions" onChange={onChange} />
            <ToggleField label="Email New Repairs" value={dept.emailNewRepairs} field="emailNewRepairs" onChange={onChange} />
            <ToggleField label="Member Board Of Advisors" value={dept.memberBoa} field="memberBoa" onChange={onChange} />
            <ToggleField label="Tracking # Required" value={dept.trackingRequired} field="trackingRequired" onChange={onChange} />
            <ToggleField label="Tax Exempt" value={dept.taxExempt} field="taxExempt" onChange={onChange} />
            <ToggleField label="Pays By Credit Card" value={dept.paysByCreditCard} field="paysByCreditCard" onChange={onChange} />
            <ToggleField label="On-Site Service" value={dept.onsiteService} field="onsiteService" onChange={onChange} />
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
); };
