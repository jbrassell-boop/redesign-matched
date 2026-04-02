import { useState, useEffect, useCallback } from 'react';
import { getClients, getClientDetail } from '../../api/clients';
import { ClientsList } from './ClientsList';
import { ClientDetailPane } from './ClientDetailPane';
import type { ClientListItem, ClientDetail } from './types';

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const handleSelect = useCallback(async (c: ClientListItem) => {
    setSelectedKey(c.clientKey);
    setDetailLoading(true);
    try {
      const d = await getClientDetail(c.clientKey);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--neutral-200)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Clients</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{clients.length} records</span>
        </div>
        <ClientsList clients={clients} loading={loading} selectedKey={selectedKey} search={search} onSearchChange={setSearch} onSelect={handleSelect} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
        <ClientDetailPane detail={detail} loading={detailLoading} />
      </div>
    </div>
  );
};
