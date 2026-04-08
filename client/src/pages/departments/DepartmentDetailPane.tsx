import { useState, useEffect, useCallback, useMemo } from 'react';
import { Spin, Modal } from 'antd';
import type { DepartmentFull, DeptKpis } from './types';
import type { TabDef } from '../../components/shared';
import { TabBar } from '../../components/shared';
import { DeptToolbar } from './DeptToolbar';
import { DeptKpiStrip } from './DeptKpiStrip';
import { ScopeDrawer } from './ScopeDrawer';
import { InfoTab } from './tabs/InfoTab';
import { AddressesTab } from './tabs/AddressesTab';
import { ContactsTab } from './tabs/ContactsTab';
import { ScopesTab } from './tabs/ScopesTab';
import { SubGroupsTab } from './tabs/SubGroupsTab';
import { RepairsTab } from './tabs/RepairsTab';
import { FlagsTab } from './tabs/FlagsTab';
import { ContractsTab } from './tabs/ContractsTab';
import { InstrumentsTab } from './tabs/InstrumentsTab';
import { TechniciansTab } from './tabs/TechniciansTab';
import { GposTab } from './tabs/GposTab';
import { ScopeTypesTab } from './tabs/ScopeTypesTab';
import {
  getDepartmentFull, getDepartmentKpis, updateDepartment,
  getDepartmentScopes, getDepartmentSubGroups, getDepartmentContacts,
  getDeptFlags,
} from '../../api/departments';
import { useTabBadges } from '../../hooks/useTabBadges';
import { useAutosave } from '../../hooks/useAutosave';

interface DepartmentDetailPaneProps {
  deptKey: number | null;
}

const BASE_TABS: TabDef[] = [
  { key: 'info',       label: 'Info' },
  { key: 'addresses',  label: 'Addresses' },
  { key: 'contacts',   label: 'Contacts' },
  { key: 'scopes',     label: 'Scopes' },
  { key: 'sub-groups', label: 'Sub-Groups' },
  { key: 'repairs',    label: 'Repairs' },
  { key: 'flags',      label: 'Flags' },
  { key: 'contracts',   label: 'Contracts' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'technicians', label: 'Technicians' },
  { key: 'gpos',        label: "GPO's" },
  { key: 'scopetypes',  label: 'Scope Types' },
];

export const DepartmentDetailPane = ({ deptKey }: DepartmentDetailPaneProps) => {
  const [dept, setDept] = useState<DepartmentFull | null>(null);
  const [kpis, setKpis] = useState<DeptKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [scopeDrawerKey, setScopeDrawerKey] = useState<number | null>(null);

  const dk = deptKey ?? 0;

  // Autosave hook
  const saveFn = useCallback(
    async (data: Partial<DepartmentFull>) => {
      if (!dk) return;
      await updateDepartment(dk, data);
      // Refresh data after save
      const [fullData, kpiData] = await Promise.all([getDepartmentFull(dk), getDepartmentKpis(dk)]);
      setDept(fullData);
      setKpis(kpiData);
    },
    [dk],
  );

  const { handleChange: autosaveHandleChange, status: autosaveStatus, reset: resetAutosave } = useAutosave<DepartmentFull>(saveFn);

  // Load full department + KPIs
  useEffect(() => {
    if (!dk) { setDept(null); setKpis(null); return; }
    let cancelled = false;
    setLoading(true);
    resetAutosave();
    setActiveTab('info');
    setScopeDrawerKey(null);

    Promise.all([getDepartmentFull(dk), getDepartmentKpis(dk)])
      .then(([fullData, kpiData]) => {
        if (cancelled) return;
        setDept(fullData);
        setKpis(kpiData);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [dk]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab badges
  const badgeCounts = useTabBadges(
    dk ? {
      contacts: () => getDepartmentContacts(dk),
      scopes: () => getDepartmentScopes(dk),
      'sub-groups': () => getDepartmentSubGroups(dk),
      flags: () => getDeptFlags(dk),
    } : {},
    [dk],
  );

  const tabs = useMemo<TabDef[]>(
    () => BASE_TABS.map(t => ({ ...t, badge: badgeCounts[t.key] ?? null })),
    [badgeCounts],
  );

  // Handle field change — update local state immediately, autosave debounces
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setDept(prev => prev ? { ...prev, [field]: value } as DepartmentFull : null);
    autosaveHandleChange(field as keyof DepartmentFull, value);
  }, [autosaveHandleChange]);

  // Toggle active
  const handleToggleActive = useCallback(async () => {
    if (!dk || !dept) return;
    const action = dept.isActive ? 'Deactivate' : 'Activate';
    Modal.confirm({
      title: `${action} Department`,
      content: `${action} ${dept.name}?`,
      okText: action,
      okButtonProps: action === 'Deactivate' ? { danger: true } : undefined,
      onOk: async () => {
        await updateDepartment(dk, { isActive: !dept.isActive } as Partial<DepartmentFull>);
        const fullData = await getDepartmentFull(dk);
        setDept(fullData);
      },
    });
  }, [dk, dept]);

  // Scope drawer
  const handleScopeClick = useCallback((scopeKey: number) => {
    setScopeDrawerKey(scopeKey);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setScopeDrawerKey(null);
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!dept) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a department to view details</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DeptToolbar
        dept={dept}
        autosaveStatus={autosaveStatus}
        onToggleActive={handleToggleActive}
      />
      <DeptKpiStrip dept={dept} kpis={kpis} loading={loading} />
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'info'       && <InfoTab dept={dept} onChange={handleFieldChange} />}
        {activeTab === 'addresses'  && <AddressesTab dept={dept} onChange={handleFieldChange} />}
        {activeTab === 'contacts'   && <ContactsTab deptKey={dept.deptKey} />}
        {activeTab === 'scopes'     && <ScopesTab deptKey={dept.deptKey} onScopeClick={handleScopeClick} />}
        {activeTab === 'sub-groups' && <SubGroupsTab deptKey={dept.deptKey} />}
        {activeTab === 'repairs'    && <RepairsTab deptKey={dept.deptKey} />}
        {activeTab === 'flags'      && <FlagsTab deptKey={dept.deptKey} />}
        {activeTab === 'contracts'   && <ContractsTab deptKey={dept.deptKey} />}
        {activeTab === 'instruments' && <InstrumentsTab deptKey={dept.deptKey} />}
        {activeTab === 'technicians' && <TechniciansTab deptKey={dept.deptKey} />}
        {activeTab === 'gpos'        && <GposTab deptKey={dept.deptKey} />}
        {activeTab === 'scopetypes'  && <ScopeTypesTab deptKey={dept.deptKey} />}
      </div>

      <ScopeDrawer
        scopeKey={scopeDrawerKey}
        deptKey={dept.deptKey}
        open={scopeDrawerKey !== null}
        onClose={handleDrawerClose}
      />
    </div>
  );
};
