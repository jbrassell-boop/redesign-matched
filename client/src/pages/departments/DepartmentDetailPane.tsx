import { Tabs, Spin } from 'antd';
import type { DepartmentDetail } from './types';

interface FieldProps { label: string; value: string | number | null | undefined; }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>{value ?? '—'}</div>
  </div>
);

interface DepartmentDetailPaneProps {
  detail: DepartmentDetail | null;
  loading: boolean;
}

export const DepartmentDetailPane = ({ detail, loading }: DepartmentDetailPaneProps) => {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a department to view details</div>;

  const infoTab = (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-dark)' }}>{detail.name}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{detail.clientName}</span>
        <span style={{
          display: 'inline-flex', padding: '2px 8px', borderRadius: 9999,
          fontSize: 11, fontWeight: 700,
          background: detail.isActive ? '#F0FDF4' : 'var(--neutral-100)',
          border: `1px solid ${detail.isActive ? '#BBF7D0' : 'var(--neutral-200)'}`,
          color: detail.isActive ? 'var(--success)' : 'var(--muted)',
        }}>
          {detail.isActive ? 'Active' : 'Inactive'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{detail.scopeCount} scope{detail.scopeCount !== 1 ? 's' : ''}</span>
        {detail.openRepairs > 0 && <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{detail.openRepairs} open repairs</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="Address" value={detail.address1} />
        <Field label="City / State / Zip" value={[detail.city, detail.state, detail.zip].filter(Boolean).join(', ')} />
        <Field label="Phone" value={detail.phone} />
        <Field label="Contact" value={detail.contactName} />
        <Field label="Email" value={detail.email} />
      </div>
    </div>
  );

  return (
    <Tabs
      size="small"
      tabBarStyle={{ margin: 0, padding: '0 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}
      items={[
        { key: 'info', label: 'Info', children: infoTab },
        { key: 'scopes', label: 'Scopes', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Scopes coming soon</div> },
        { key: 'repairs', label: 'Repairs', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Repairs coming soon</div> },
        { key: 'contacts', label: 'Contacts', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Contacts coming soon</div> },
      ]}
    />
  );
};
