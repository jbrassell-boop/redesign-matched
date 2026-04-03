import { useState, useEffect, useCallback, useMemo } from 'react';
import { getClients } from '../../api/clients';
import { ClientsList } from './ClientsList';
import { ClientDetailPane } from './ClientDetailPane';
import type { ClientListItem } from './types';
import { ExportButton } from '../../components/common/ExportButton';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';

const CLIENT_EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'isActive', label: 'Active' },
];

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const loadClients = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getClients({ search: s, pageSize: 200 });
      setClients(result.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadClients(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadClients]);

  const handleSelect = useCallback((c: ClientListItem) => {
    setSelectedKey(c.clientKey);
  }, []);

  const handleClientDeleted = useCallback(() => {
    setSelectedKey(null);
    loadClients(search);
  }, [search, loadClients]);

  const selectedIndex = useMemo(
    () => clients.findIndex(c => c.clientKey === selectedKey),
    [clients, selectedKey],
  );

  useKeyboardNav(clients, selectedIndex, handleSelect);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--neutral-200)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Clients</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{clients.length} records</span>
          <ExportButton data={clients as unknown as Record<string, unknown>[]} columns={CLIENT_EXPORT_COLS} filename="clients-export" sheetName="Clients" />
        </div>
        <ClientsList clients={clients} loading={loading} selectedKey={selectedKey} search={search} onSearchChange={setSearch} onSelect={handleSelect} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
        <ClientDetailPane clientKey={selectedKey} onClientDeleted={handleClientDeleted} />
      </div>
    </div>
  );
};
