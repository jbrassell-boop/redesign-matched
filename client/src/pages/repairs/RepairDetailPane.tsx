import { Tabs, Spin } from 'antd';
import type { RepairDetail } from './types';

interface FieldProps { label: string; value: string | number | null | undefined; }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>
      {value ?? '—'}
    </div>
  </div>
);

interface RepairDetailPaneProps {
  detail: RepairDetail | null;
  loading: boolean;
}

export const RepairDetailPane = ({ detail, loading }: RepairDetailPaneProps) => {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a repair to view details</div>;

  const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    'Shipped':      { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A' },
    'Pending Ship': { bg: '#EFF6FF', border: '#BFDBFE', color: '#2E75B6' },
    'Pending QC':   { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
    'Cancelled':    { bg: '#F3F4F6', border: '#E5E7EB', color: '#6B7280' },
  };
  const sc = STATUS_COLORS[detail.status] ?? { bg: '#F9FAFB', border: '#E5E7EB', color: '#374151' };

  const detailsTab = (
    <div style={{ padding: '16px 20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-dark)' }}>{detail.wo}</span>
        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>{detail.status}</span>
        {detail.isUrgent && <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)' }}>URGENT</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: detail.daysIn > 14 ? 'var(--danger)' : detail.daysIn > 7 ? 'var(--amber)' : 'var(--muted)' }}>TAT: {detail.daysIn}d</span>
      </div>

      {/* Grid of fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="Client" value={detail.client} />
        <Field label="Department" value={detail.dept} />
        <Field label="Scope Type" value={detail.scopeType} />
        <Field label="Serial #" value={detail.serial} />
        <Field label="Date In" value={detail.dateIn} />
        <Field label="Technician" value={detail.tech} />
        <Field label="Date Approved" value={detail.dateApproved} />
        <Field label="Est. Delivery" value={detail.estDelivery} />
        <Field label="Approved Amount" value={detail.amountApproved != null ? `$${detail.amountApproved.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} />
        <Field label="Invoice #" value={detail.invoiceNumber} />
        <Field label="Ship Date" value={detail.shipDate} />
        <Field label="Tracking #" value={detail.trackingNumber} />
      </div>

      {detail.complaint && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Complaint / Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 10px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{detail.complaint}</div>
        </div>
      )}
    </div>
  );

  return (
    <Tabs
      size="small"
      style={{ height: '100%' }}
      tabBarStyle={{ margin: '0 0 0', padding: '0 16px', background: '#fff', borderBottom: '1px solid var(--neutral-200)' }}
      items={[
        { key: 'details', label: 'Details', children: detailsTab },
        { key: 'scope', label: 'Scope', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Scope details coming soon</div> },
        { key: 'parts', label: 'Parts', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Parts coming soon</div> },
        { key: 'comments', label: 'Comments', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Comments coming soon</div> },
        { key: 'history', label: 'History', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>History coming soon</div> },
        { key: 'qc', label: 'QC', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>QC coming soon</div> },
      ]}
    />
  );
};
