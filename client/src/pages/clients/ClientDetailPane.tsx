import { useState } from 'react';
import { Spin } from 'antd';
import type { ClientDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { ContactsTab } from './tabs/ContactsTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { FlagsTab } from './tabs/FlagsTab';

interface ClientDetailPaneProps {
  detail: ClientDetail | null;
  loading: boolean;
}

const TABS: TabDef[] = [
  { key: 'info',        label: 'Info' },
  { key: 'contacts',    label: 'Contacts' },
  { key: 'departments', label: 'Departments' },
  { key: 'flags',       label: 'Flags' },
];

export const ClientDetailPane = ({ detail, loading }: ClientDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('info');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a client to view details</div>;

  const deptMeta = `${detail.deptCount} department${detail.deptCount !== 1 ? 's' : ''}`;
  const repairMeta = detail.openRepairs > 0
    ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{detail.openRepairs} open repairs</span>
    : null;

  const infoContent = (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
        <Field label="Address" value={[detail.address1, detail.address2].filter(Boolean).join(', ')} />
        <Field label="City / State / Zip" value={[detail.city, detail.state, detail.zip].filter(Boolean).join(', ')} />
        <Field label="Phone" value={detail.phone} />
        <Field label="Fax" value={detail.fax} />
        <Field label="Contact" value={detail.contactName} />
        <Field label="Email" value={detail.email} />
      </FormGrid>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.name}
        badges={
          <>
            <StatusBadge status={detail.isActive ? 'Active' : 'Inactive'} />
            {repairMeta}
          </>
        }
        meta={deptMeta}
      />
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'info'        && infoContent}
      {activeTab === 'contacts'    && <ContactsTab clientKey={detail.clientKey} />}
      {activeTab === 'departments' && <DepartmentsTab clientKey={detail.clientKey} />}
      {activeTab === 'flags'       && <FlagsTab clientKey={detail.clientKey} />}
    </div>
  );
};
