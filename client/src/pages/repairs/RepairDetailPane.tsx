import { useState } from 'react';
import { Spin } from 'antd';
import type { RepairDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { WorkflowTab } from './tabs/WorkflowTab';
import { InspectionsTab } from './tabs/InspectionsTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { ScopeHistoryTab } from './tabs/ScopeHistoryTab';

interface RepairDetailPaneProps {
  detail: RepairDetail | null;
  loading: boolean;
}

const TABS: TabDef[] = [
  { key: 'details',      label: 'Details' },
  { key: 'workflow',     label: 'Workflow' },
  { key: 'inspections',  label: 'Inspections' },
  { key: 'financials',   label: 'Financials' },
  { key: 'scopehistory', label: 'Scope History' },
  { key: 'comments',     label: 'Comments' },
];

export const RepairDetailPane = ({ detail, loading }: RepairDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('details');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a repair to view details</div>;

  const tatColor = detail.daysIn > 14 ? 'var(--danger)' : detail.daysIn > 7 ? 'var(--amber)' : 'var(--muted)';

  const detailsContent = (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
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
      </FormGrid>

      {detail.complaint && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Complaint / Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 10px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{detail.complaint}</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.wo}
        badges={
          <>
            <StatusBadge status={detail.status} />
            {detail.isUrgent && <StatusBadge status="URGENT" variant="red" />}
          </>
        }
        meta={<span style={{ color: tatColor }}>TAT: {detail.daysIn}d</span>}
      />
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'details'      && detailsContent}
      {activeTab === 'workflow'     && <WorkflowTab repairKey={detail.repairKey} />}
      {activeTab === 'inspections'  && <InspectionsTab repairKey={detail.repairKey} />}
      {activeTab === 'financials'   && <FinancialsTab repairKey={detail.repairKey} />}
      {activeTab === 'scopehistory' && <ScopeHistoryTab repairKey={detail.repairKey} currentRepairKey={detail.repairKey} />}
      {activeTab === 'comments'     && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Comments coming soon</div>}
    </div>
  );
};
