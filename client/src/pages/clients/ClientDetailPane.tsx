import { useState, useEffect, useCallback, useMemo } from 'react';
import { Spin } from 'antd';
import type { ClientFull, ClientKpis, SaveState } from './types';
import type { TabDef } from '../../components/shared';
import { TabBar } from '../../components/shared';
import { ClientToolbar } from './ClientToolbar';
import { ClientKpiStrip } from './ClientKpiStrip';
import { InfoTab } from './tabs/InfoTab';
import { ContactsTab } from './tabs/ContactsTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { FlagsTab } from './tabs/FlagsTab';
import { RepairHistoryTab } from './tabs/RepairHistoryTab';
import {
  getClientFull, getClientKpis, updateClient, deactivateClient, deleteClient,
  getClientContacts, getClientDepartments, getClientFlags,
} from '../../api/clients';
import { useTabBadges } from '../../hooks/useTabBadges';

interface ClientDetailPaneProps {
  clientKey: number | null;
  onClientDeleted?: () => void;
}

const BASE_TABS: TabDef[] = [
  { key: 'info', label: 'Info' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'departments', label: 'Departments' },
  { key: 'flags', label: 'Flags' },
  { key: 'repairs', label: 'Repair History' },
];

export const ClientDetailPane = ({ clientKey, onClientDeleted }: ClientDetailPaneProps) => {
  const [client, setClient] = useState<ClientFull | null>(null);
  const [kpis, setKpis] = useState<ClientKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [saveState, setSaveState] = useState<SaveState>('ready');
  const [dirtyFields, setDirtyFields] = useState<Record<string, unknown>>({});

  const ck = clientKey ?? 0;

  // Load full client + KPIs
  useEffect(() => {
    if (!ck) { setClient(null); setKpis(null); return; }
    let cancelled = false;
    setLoading(true);
    setSaveState('ready');
    setDirtyFields({});
    setActiveTab('info');

    Promise.all([getClientFull(ck), getClientKpis(ck)])
      .then(([fullData, kpiData]) => {
        if (cancelled) return;
        setClient(fullData);
        setKpis(kpiData);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ck]);

  // Tab badges
  const badgeCounts = useTabBadges(
    ck ? {
      contacts: () => getClientContacts(ck),
      departments: () => getClientDepartments(ck),
      flags: () => getClientFlags(ck),
    } : {},
    [ck],
  );

  const tabs = useMemo<TabDef[]>(
    () => BASE_TABS.map(t => ({ ...t, badge: badgeCounts[t.key] ?? null })),
    [badgeCounts],
  );

  // Handle field change from InfoTab
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setDirtyFields(prev => ({ ...prev, [field]: value }));
    setSaveState('unsaved');
    // Also update the local client for immediate UI feedback
    setClient(prev => prev ? { ...prev, [field]: value } as ClientFull : null);
  }, []);

  // Save flow
  const handleSave = useCallback(async () => {
    if (!ck || Object.keys(dirtyFields).length === 0) return;
    setSaveState('saving');
    try {
      await updateClient(ck, dirtyFields as Partial<ClientFull>);
      setDirtyFields({});
      setSaveState('saved');
      // Refresh data
      const [fullData, kpiData] = await Promise.all([getClientFull(ck), getClientKpis(ck)]);
      setClient(fullData);
      setKpis(kpiData);
      setTimeout(() => setSaveState('ready'), 2000);
    } catch {
      setSaveState('unsaved');
    }
  }, [ck, dirtyFields]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveState === 'unsaved') handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveState, handleSave]);

  // Deactivate / Delete
  const handleToggleActive = useCallback(async () => {
    if (!ck || !client) return;
    if (!confirm(`Deactivate ${client.name}?`)) return;
    await deactivateClient(ck);
    const fullData = await getClientFull(ck);
    setClient(fullData);
  }, [ck, client]);

  const handleDelete = useCallback(async () => {
    if (!ck || !client) return;
    if (!confirm(`Permanently delete ${client.name}? This cannot be undone.`)) return;
    try {
      await deleteClient(ck);
      onClientDeleted?.();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Delete failed';
      alert(msg);
    }
  }, [ck, client, onClientDeleted]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!client) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a client to view details</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ClientToolbar
        client={client}
        saveState={saveState}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
      <ClientKpiStrip client={client} kpis={kpis} loading={loading} />
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'info' && <InfoTab client={client} onChange={handleFieldChange} />}
        {activeTab === 'contacts' && <ContactsTab clientKey={client.clientKey} />}
        {activeTab === 'departments' && <DepartmentsTab clientKey={client.clientKey} />}
        {activeTab === 'flags' && <FlagsTab clientKey={client.clientKey} />}
        {activeTab === 'repairs' && <RepairHistoryTab clientKey={client.clientKey} />}
      </div>
    </div>
  );
};
