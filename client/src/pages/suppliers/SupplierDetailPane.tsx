import { Tabs, Spin, Switch } from 'antd';
import type { SupplierDetail } from './types';

interface FieldProps { label: string; value: string | number | null | undefined; }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: 12, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 26 }}>
      {value ?? '\u2014'}
    </div>
  </div>
);

const ToggleField = ({ label, value }: { label: string; value: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
    <Switch size="small" checked={value} disabled />
    <span style={{ fontSize: 11, color: 'var(--text)' }}>{label}</span>
  </div>
);

const RoleChip = ({ label, active }: { label: string; active: boolean }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid',
    borderColor: active ? 'rgba(var(--primary-rgb), 0.3)' : 'var(--border)',
    background: active ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--neutral-50)',
    color: active ? 'var(--primary)' : 'var(--muted)',
  }}>
    {label}
  </span>
);

interface SupplierDetailPaneProps {
  detail: SupplierDetail | null;
  loading: boolean;
}

export const SupplierDetailPane = ({ detail, loading }: SupplierDetailPaneProps) => {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a supplier to view details</div>;

  const contactTab = (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left column — Contact Info */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', padding: '12px 14px', borderRight: '1px solid var(--neutral-200)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
          Contact Information
        </div>
        <Field label="Supplier Name" value={detail.name} />
        <Field label="Address Line 1" value={detail.shipAddr1} />
        <Field label="Address Line 2" value={detail.shipAddr2} />
        <Field label="City" value={detail.shipCity} />
        <Field label="State" value={detail.shipState} />
        <Field label="Zip" value={detail.shipZip} />
        <Field label="Country" value={detail.shipCountry} />
        <Field label="Phone" value={detail.phone} />
        <Field label="Fax" value={detail.fax} />
        <Field label="Contact" value={[detail.contactFirst, detail.contactLast].filter(Boolean).join(' ') || null} />
        <Field label="Email" value={detail.email} />

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8, marginTop: 16 }}>
          Billing
        </div>
        <Field label="Bill Email Name" value={detail.billEmailName} />
        <Field label="Bill Email" value={detail.billEmail} />
        <Field label="Bill Email 2" value={detail.billEmail2} />
        <Field label="Bill Address" value={[detail.billAddr1, detail.billAddr2].filter(Boolean).join(', ') || null} />
        <Field label="Bill City/State/Zip" value={[detail.billCity, detail.billState, detail.billZip].filter(Boolean).join(', ') || null} />
      </div>

      {/* Right column — Roles & Settings */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
          Supplier Roles
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <RoleChip label="Parts" active={detail.roles.includes('Parts')} />
          <RoleChip label="Repair" active={detail.roles.includes('Repair')} />
          <RoleChip label="Acquisition" active={detail.roles.includes('Acquisition')} />
          <RoleChip label="Carts" active={detail.roles.includes('Carts')} />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
          Settings
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: 16 }}>
          <Field label="Min Order $" value={detail.orderMinimum != null ? `$${detail.orderMinimum.toFixed(2)}` : null} />
          <Field label="GP Vendor ID" value={detail.gpId} />
          <Field label="Default PO Type" value={detail.supplierPoType} />
          <Field label="Part # Prefix" value={detail.partNumberPrefix} />
          <Field label="Additional PO Cost" value={detail.additionalPoDescriptionCostPerUnit != null ? `$${detail.additionalPoDescriptionCostPerUnit.toFixed(2)}` : null} />
          <Field label="Supplier Link" value={detail.supplierKeyLink?.toString()} />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
          Options
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', marginBottom: 16 }}>
          <ToggleField label="Active" value={detail.isActive} />
          <ToggleField label="Dashboard - Open Inv." value={detail.showOnDashboard} />
          <ToggleField label="Create Part #" value={detail.createPartNumbers} />
          <ToggleField label="Use Vendor SKU" value={detail.useVendorSku} />
          <ToggleField label="Show Vendor SKU on PO" value={detail.showVendorSkuOnPo} />
          <ToggleField label="Blind PO for GP" value={detail.blindPoForGp} />
          <ToggleField label="Acquisition Supplier" value={detail.isAcquisitionSupplier} />
          <ToggleField label="Allow Duplicate Part #s" value={detail.allowDuplicatePartNumbers} />
          <ToggleField label="Include Part # in PO Desc" value={detail.includePartNumberInPoDescription} />
        </div>

        {(detail.additionalPoDescription || detail.comments) && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
              Notes
            </div>
            {detail.additionalPoDescription && <Field label="Additional PO Description" value={detail.additionalPoDescription} />}
            {detail.comments && <Field label="Notes" value={detail.comments} />}
          </>
        )}

        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted)' }}>
          Last Updated: {detail.lastUpdate ?? 'N/A'}
        </div>
      </div>
    </div>
  );

  const posTab = (
    <div style={{ padding: '12px 16px' }}>
      {detail.recentPos.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No purchase orders found</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--neutral-200)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>PO #</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Date</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {detail.recentPos.map(po => (
              <tr key={po.supplierPoKey} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--primary)' }}>{po.poNumber}</td>
                <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{po.date ?? '\u2014'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>${po.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: po.status === 'Open' ? 'rgba(var(--success-rgb), 0.1)' : po.status === 'Cancelled' ? 'rgba(var(--danger-rgb), 0.1)' : 'rgba(var(--muted-rgb), 0.1)',
                    color: po.status === 'Open' ? 'var(--success)' : po.status === 'Cancelled' ? 'var(--danger)' : 'var(--muted)',
                  }}>
                    {po.status}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{po.poType ?? '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--neutral-200)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>{detail.name}</span>
        {detail.shipCity && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{detail.shipCity}, {detail.shipState}</span>}
        {detail.gpId && (
          <span style={{
            background: 'var(--neutral-50)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--muted)',
            fontFamily: 'monospace',
          }}>
            {detail.gpId}
          </span>
        )}
        <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
          {detail.roles.map(r => (
            <span key={r} style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 3,
              background: 'rgba(var(--primary-rgb), 0.1)',
              color: 'var(--primary)',
            }}>
              {r}
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 9999,
          background: detail.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--danger-rgb), 0.1)',
          color: detail.isActive ? 'var(--success)' : 'var(--danger)',
        }}>
          {detail.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <Tabs
        size="small"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ margin: 0, padding: '0 16px', background: '#fff', borderBottom: '1px solid var(--neutral-200)' }}
        items={[
          { key: 'main', label: 'Main', children: contactTab },
          { key: 'pos', label: `Recent PO's (${detail.recentPos.length})`, children: posTab },
          { key: 'inv', label: 'Inventory Supplied', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Inventory supplied coming soon</div> },
          { key: 'docs', label: 'Documents', children: <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Documents coming soon</div> },
        ]}
      />
    </div>
  );
};
