import { useState, useCallback, useEffect } from 'react';
import { Spin, Switch } from 'antd';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { InventorySuppliedTab } from './tabs/InventorySuppliedTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import type { SupplierDetail } from './types';
import { updateSupplier } from '../../api/suppliers';
import type { PatchSupplierPayload } from '../../api/suppliers';
import { useAutosave } from '../../hooks/useAutosave';
import { AutosaveIndicator } from '../../components/common/AutosaveIndicator';

/* ── Editable field input ──────────────────────────────────────── */
interface EditFieldProps {
  label: string;
  value: string | null | undefined;
  field: keyof PatchSupplierPayload;
  onChange: (field: keyof PatchSupplierPayload, value: string) => void;
}

const EditField = ({ label, value, field, onChange }: EditFieldProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 0' }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
      {label}
    </span>
    <input
      value={value ?? ''}
      onChange={e => onChange(field, e.target.value)}
      style={{
        fontSize: 12,
        color: 'var(--text)',
        background: 'var(--card)',
        border: '1px solid var(--neutral-200)',
        borderRadius: 4,
        padding: '4px 8px',
        fontFamily: 'inherit',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
      onBlur={e => (e.target.style.borderColor = 'var(--neutral-200)')}
    />
  </div>
);

const ToggleField = ({ label, value }: { label: string; value: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
    <Switch size="small" checked={value} disabled aria-label={label} />
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

  // Local editable copy of main-tab fields
  const [localDetail, setLocalDetail] = useState<SupplierDetail | null>(null);

  // Sync local state when a new supplier is selected
  useEffect(() => {
    setLocalDetail(detail);
  }, [detail]);

  const saveFn = useCallback(
    async (data: Partial<PatchSupplierPayload>) => {
      if (!localDetail) return;
      await updateSupplier(localDetail.supplierKey, data as PatchSupplierPayload);
    },
    [localDetail],
  );

  const { handleChange: autosaveHandleChange, status: autosaveStatus, reset: resetAutosave } = useAutosave<PatchSupplierPayload>(saveFn);

  // Reset autosave when supplier changes
  useEffect(() => {
    resetAutosave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.supplierKey]);

  const handleFieldChange = useCallback((field: keyof PatchSupplierPayload, value: string) => {
    setLocalDetail(prev => prev ? { ...prev, [field]: value } : null);
    autosaveHandleChange(field, value);
  }, [autosaveHandleChange]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!localDetail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a supplier to view details</div>;

  const tabs: TabDef[] = TABS.map(t =>
    t.key === 'pos' ? { ...t, label: `Recent PO's (${localDetail.recentPos.length})` } : t
  );

  const contactTab = (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left column — Contact Info (editable) */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', padding: '12px 14px', borderRight: '1px solid var(--neutral-200)' }}>
        <SectionLabel title="Contact Information" />
        <EditField label="Supplier Name" value={localDetail.name} field="name" onChange={handleFieldChange} />
        <EditField label="Address Line 1" value={localDetail.shipAddr1} field="shipAddr1" onChange={handleFieldChange} />
        <EditField label="Address Line 2" value={localDetail.shipAddr2} field="shipAddr2" onChange={handleFieldChange} />
        <EditField label="City" value={localDetail.shipCity} field="shipCity" onChange={handleFieldChange} />
        <EditField label="State" value={localDetail.shipState} field="shipState" onChange={handleFieldChange} />
        <EditField label="Zip" value={localDetail.shipZip} field="shipZip" onChange={handleFieldChange} />
        <Field label="Country" value={localDetail.shipCountry} />
        <EditField label="Phone" value={localDetail.phone} field="phone" onChange={handleFieldChange} />
        <EditField label="Fax" value={localDetail.fax} field="fax" onChange={handleFieldChange} />
        <EditField label="Contact First" value={localDetail.contactFirst} field="contactFirst" onChange={handleFieldChange} />
        <EditField label="Contact Last" value={localDetail.contactLast} field="contactLast" onChange={handleFieldChange} />
        <EditField label="Email" value={localDetail.email} field="email" onChange={handleFieldChange} />

        <div style={{ marginTop: 16 }}>
          <SectionLabel title="Billing" />
        </div>
        <Field label="Bill Email Name" value={localDetail.billEmailName} />
        <Field label="Bill Email" value={localDetail.billEmail} />
        <Field label="Bill Email 2" value={localDetail.billEmail2} />
        <Field label="Bill Address" value={[localDetail.billAddr1, localDetail.billAddr2].filter(Boolean).join(', ') || null} />
        <Field label="Bill City/State/Zip" value={[localDetail.billCity, localDetail.billState, localDetail.billZip].filter(Boolean).join(', ') || null} />
      </div>

      {/* Right column — Roles & Settings */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <SectionLabel title="Supplier Roles" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <RoleChip label="Parts" active={localDetail.roles.includes('Parts')} />
          <RoleChip label="Repair" active={localDetail.roles.includes('Repair')} />
          <RoleChip label="Acquisition" active={localDetail.roles.includes('Acquisition')} />
          <RoleChip label="Carts" active={localDetail.roles.includes('Carts')} />
        </div>

        <SectionLabel title="Settings" />
        <FormGrid cols={2}>
          <Field label="Min Order $" value={localDetail.orderMinimum != null ? `$${localDetail.orderMinimum.toFixed(2)}` : null} />
          <Field label="GP Vendor ID" value={localDetail.gpId} />
          <Field label="Default PO Type" value={localDetail.supplierPoType} />
          <Field label="Part # Prefix" value={localDetail.partNumberPrefix} />
          <Field label="Additional PO Cost" value={localDetail.additionalPoDescriptionCostPerUnit != null ? `$${localDetail.additionalPoDescriptionCostPerUnit.toFixed(2)}` : null} />
          <Field label="Supplier Link" value={localDetail.supplierKeyLink?.toString()} />
        </FormGrid>

        <SectionLabel title="Options" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', marginBottom: 16 }}>
          <ToggleField label="Active" value={localDetail.isActive} />
          <ToggleField label="Dashboard - Open Inv." value={localDetail.showOnDashboard} />
          <ToggleField label="Create Part #" value={localDetail.createPartNumbers} />
          <ToggleField label="Use Vendor SKU" value={localDetail.useVendorSku} />
          <ToggleField label="Show Vendor SKU on PO" value={localDetail.showVendorSkuOnPo} />
          <ToggleField label="Blind PO for GP" value={localDetail.blindPoForGp} />
          <ToggleField label="Acquisition Supplier" value={localDetail.isAcquisitionSupplier} />
          <ToggleField label="Allow Duplicate Part #s" value={localDetail.allowDuplicatePartNumbers} />
          <ToggleField label="Include Part # in PO Desc" value={localDetail.includePartNumberInPoDescription} />
        </div>

        {(localDetail.additionalPoDescription || localDetail.comments) && (
          <>
            <SectionLabel title="Notes" />
            {localDetail.additionalPoDescription && <Field label="Additional PO Description" value={localDetail.additionalPoDescription} />}
            {localDetail.comments && <Field label="Notes" value={localDetail.comments} />}
          </>
        )}

        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted)' }}>
          Last Updated: {localDetail.lastUpdate ?? 'N/A'}
        </div>
      </div>
    </div>
  );

  const posTab = (
    <div style={{ padding: '12px 16px' }}>
      {localDetail.recentPos.length === 0 ? (
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
            {localDetail.recentPos.map(po => (
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
        headingLevel="h2"
        title={localDetail.name}
        subtitle={localDetail.shipCity ? `${localDetail.shipCity}, ${localDetail.shipState}` : undefined}
        badges={
          <>
            {localDetail.gpId && (
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
                {localDetail.gpId}
              </span>
            )}
            <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
              {localDetail.roles.map(r => (
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
            <StatusBadge status={localDetail.isActive ? 'Active' : 'Inactive'} />
            <AutosaveIndicator status={autosaveStatus} />
          </>
        }
      />
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'main' && contactTab}
      {activeTab === 'pos'  && posTab}
      {activeTab === 'inv'  && <InventorySuppliedTab supplierKey={localDetail.supplierKey} />}
      {activeTab === 'docs' && <DocumentsTab supplierKey={localDetail.supplierKey} />}
    </div>
  );
};
