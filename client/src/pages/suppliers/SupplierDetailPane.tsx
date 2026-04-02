import { useState } from 'react';
import { Spin, Switch } from 'antd';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { InventorySuppliedTab } from './tabs/InventorySuppliedTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import type { SupplierDetail } from './types';

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

const TABS: TabDef[] = [
  { key: 'main', label: 'Main' },
  { key: 'pos',  label: "Recent PO's" },
  { key: 'inv',  label: 'Inventory Supplied' },
  { key: 'docs', label: 'Documents' },
];

const SectionLabel = ({ title }: { title: string }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--neutral-200)', marginBottom: 8 }}>
    {title}
  </div>
);

export const SupplierDetailPane = ({ detail, loading }: SupplierDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('main');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a supplier to view details</div>;

  const tabs: TabDef[] = TABS.map(t =>
    t.key === 'pos' ? { ...t, label: `Recent PO's (${detail.recentPos.length})` } : t
  );

  const contactTab = (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left column — Contact Info */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', padding: '12px 14px', borderRight: '1px solid var(--neutral-200)' }}>
        <SectionLabel title="Contact Information" />
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

        <div style={{ marginTop: 16 }}>
          <SectionLabel title="Billing" />
        </div>
        <Field label="Bill Email Name" value={detail.billEmailName} />
        <Field label="Bill Email" value={detail.billEmail} />
        <Field label="Bill Email 2" value={detail.billEmail2} />
        <Field label="Bill Address" value={[detail.billAddr1, detail.billAddr2].filter(Boolean).join(', ') || null} />
        <Field label="Bill City/State/Zip" value={[detail.billCity, detail.billState, detail.billZip].filter(Boolean).join(', ') || null} />
      </div>

      {/* Right column — Roles & Settings */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <SectionLabel title="Supplier Roles" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <RoleChip label="Parts" active={detail.roles.includes('Parts')} />
          <RoleChip label="Repair" active={detail.roles.includes('Repair')} />
          <RoleChip label="Acquisition" active={detail.roles.includes('Acquisition')} />
          <RoleChip label="Carts" active={detail.roles.includes('Carts')} />
        </div>

        <SectionLabel title="Settings" />
        <FormGrid cols={2}>
          <Field label="Min Order $" value={detail.orderMinimum != null ? `$${detail.orderMinimum.toFixed(2)}` : null} />
          <Field label="GP Vendor ID" value={detail.gpId} />
          <Field label="Default PO Type" value={detail.supplierPoType} />
          <Field label="Part # Prefix" value={detail.partNumberPrefix} />
          <Field label="Additional PO Cost" value={detail.additionalPoDescriptionCostPerUnit != null ? `$${detail.additionalPoDescriptionCostPerUnit.toFixed(2)}` : null} />
          <Field label="Supplier Link" value={detail.supplierKeyLink?.toString()} />
        </FormGrid>

        <SectionLabel title="Options" />
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
            <SectionLabel title="Notes" />
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
                  <StatusBadge status={po.status} />
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
      <DetailHeader
        title={detail.name}
        subtitle={detail.shipCity ? `${detail.shipCity}, ${detail.shipState}` : undefined}
        badges={
          <>
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
            <StatusBadge status={detail.isActive ? 'Active' : 'Inactive'} />
          </>
        }
      />
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'main' && contactTab}
      {activeTab === 'pos'  && posTab}
      {activeTab === 'inv'  && <InventorySuppliedTab supplierKey={detail.supplierKey} />}
      {activeTab === 'docs' && <DocumentsTab supplierKey={detail.supplierKey} />}
    </div>
  );
};
