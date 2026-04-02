import { useState, useMemo } from 'react';
import { Spin } from 'antd';
import type { DepartmentDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { SubGroupsTab } from './tabs/SubGroupsTab';
import { ScopesTab } from './tabs/ScopesTab';
import { getDepartmentSubGroups, getDepartmentScopes } from '../../api/departments';
import { useTabBadges } from '../../hooks/useTabBadges';

interface DepartmentDetailPaneProps {
  detail: DepartmentDetail | null;
  loading: boolean;
}

const BASE_TABS: TabDef[] = [
  { key: 'info',       label: 'Info' },
  { key: 'scopes',     label: 'Scopes' },
  { key: 'sub-groups', label: 'Sub-Groups' },
  { key: 'repairs',    label: 'Repairs' },
  { key: 'contacts',   label: 'Contacts' },
];

export const DepartmentDetailPane = ({ detail, loading }: DepartmentDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('info');

  const dk = detail?.deptKey ?? 0;
  const badgeCounts = useTabBadges(
    dk ? {
      scopes: () => getDepartmentScopes(dk),
      'sub-groups': () => getDepartmentSubGroups(dk),
    } : {},
    [dk],
  );

  const tabs = useMemo<TabDef[]>(
    () => BASE_TABS.map(t => ({ ...t, badge: badgeCounts[t.key] ?? null })),
    [badgeCounts],
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a department to view details</div>;

  const scopeMeta = `${detail.scopeCount} scope${detail.scopeCount !== 1 ? 's' : ''}`;
  const repairMeta = detail.openRepairs > 0
    ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{detail.openRepairs} open repairs</span>
    : null;

  const infoContent = (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
        <Field label="Address" value={detail.address1} />
        <Field label="City / State / Zip" value={[detail.city, detail.state, detail.zip].filter(Boolean).join(', ')} />
        <Field label="Phone" value={detail.phone} />
        <Field label="Contact" value={detail.contactName} />
        <Field label="Email" value={detail.email} />
      </FormGrid>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.name}
        subtitle={detail.clientName}
        badges={
          <>
            <StatusBadge status={detail.isActive ? 'Active' : 'Inactive'} />
            {repairMeta}
          </>
        }
        meta={scopeMeta}
      />
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'info'       && infoContent}
      {activeTab === 'scopes'     && <ScopesTab deptKey={detail.deptKey} />}
      {activeTab === 'sub-groups' && <SubGroupsTab deptKey={detail.deptKey} />}
      {activeTab === 'repairs'    && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Repairs coming soon</div>}
      {activeTab === 'contacts'   && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Contacts coming soon</div>}
    </div>
  );
};
