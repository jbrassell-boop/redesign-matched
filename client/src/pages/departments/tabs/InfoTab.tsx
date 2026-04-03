import type { DepartmentFull } from '../types';
import { SectionCard } from '../../../components/shared';

interface InfoTabProps {
  dept: DepartmentFull;
  onChange: (field: string, value: string) => void;
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

const EditField = ({ label, value, field, onChange }: {
  label: string;
  value: string | undefined | null;
  field: string;
  onChange: (field: string, value: string) => void;
}) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <input
      style={inputStyle}
      value={value ?? ''}
      onChange={e => onChange(field, e.target.value)}
    />
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

export const InfoTab = ({ dept, onChange }: InfoTabProps) => (
  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
    <div>
      <SectionCard title="Billing Address">
        <EditField label="Address" value={dept.address1} field="address1" onChange={onChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <EditField label="City" value={dept.city} field="city" onChange={onChange} />
          <EditField label="State" value={dept.state} field="state" onChange={onChange} />
          <EditField label="Zip" value={dept.zip} field="zip" onChange={onChange} />
        </div>
        <EditField label="Phone" value={dept.phone} field="phone" onChange={onChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <EditField label="Contact First" value={dept.contactFirst} field="contactFirst" onChange={onChange} />
          <EditField label="Contact Last" value={dept.contactLast} field="contactLast" onChange={onChange} />
        </div>
        <EditField label="Contact Email" value={dept.contactEmail} field="contactEmail" onChange={onChange} />
      </SectionCard>
    </div>

    <div>
      <SectionCard title="Service Location">
        <ReadonlyField label="Location" value={dept.serviceLocation} />
      </SectionCard>
    </div>
  </div>
);
