import { useState, useEffect, useCallback } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { getClients } from '../../api/clients';
import { ClientDetailPane } from './ClientDetailPane';
import { NewClientModal } from './NewClientModal';
import { ExportButton } from '../../components/common/ExportButton';
import type { ClientListItem } from './types';

const CLIENT_EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'Zip' },
  { key: 'isActive', label: 'Active' },
];

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const loadClients = useCallback(async (s: string, sf: string) => {
    setLoading(true);
    try {
      const result = await getClients({ search: s, pageSize: 500, statusFilter: sf === 'all' ? undefined : sf });
      setClients(result.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadClients(search, statusFilter), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter, loadClients]);

  const handleClientDeleted = useCallback(() => {
    setSelectedKey(null);
    loadClients(search, statusFilter);
  }, [search, statusFilter, loadClients]);

  const filtered = clients.filter(c => {
    if (statusFilter === 'active') return c.isActive;
    if (statusFilter === 'inactive') return !c.isActive;
    return true;
  });

  const activeCount = clients.filter(c => c.isActive).length;
  const inactiveCount = clients.filter(c => !c.isActive).length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Panel — Client List */}
      <div style={{
        width: selectedKey ? 320 : '100%',
        minWidth: selectedKey ? 320 : undefined,
        borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
        transition: 'width 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Clients</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: 'var(--primary-light, #dbeafe)', color: 'var(--primary)',
              }}>
                {filtered.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <ExportButton data={clients as unknown as Record<string, unknown>[]} columns={CLIENT_EXPORT_COLS} filename="clients-export" sheetName="Clients" />
              <Button
                icon={<PlusOutlined />} type="primary" size="small"
                onClick={() => setNewModalOpen(true)}
                style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 11, height: 28 }}
              >
                New Client
              </Button>
            </div>
          </div>

          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder="Search name, city, zip..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ height: 30, fontSize: 12 }}
          />

          {/* Status filter + counts */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'all' as const, label: 'All', count: clients.length },
              { key: 'active' as const, label: 'Active', count: activeCount },
              { key: 'inactive' as const, label: 'Inactive', count: inactiveCount },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                style={{
                  padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', border: 'none', display: 'flex', gap: 4, alignItems: 'center',
                  background: statusFilter === s.key ? 'var(--navy)' : 'var(--neutral-100)',
                  color: statusFilter === s.key ? '#fff' : 'var(--muted)',
                }}
              >
                {s.label}
                <span style={{
                  fontSize: 9, opacity: .7,
                  background: statusFilter === s.key ? 'rgba(255,255,255,.2)' : 'var(--neutral-200)',
                  padding: '0 5px', borderRadius: 8,
                }}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Client rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No clients found</div>
          )}
          {filtered.map(c => (
            <div
              key={c.clientKey}
              onClick={() => setSelectedKey(c.clientKey)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--neutral-100)',
                cursor: 'pointer',
                background: c.clientKey === selectedKey ? 'var(--primary-light, #dbeafe)' : 'var(--card)',
                borderLeft: c.clientKey === selectedKey ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (c.clientKey !== selectedKey) e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={e => { if (c.clientKey !== selectedKey) e.currentTarget.style.background = 'var(--card)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    {(c as any).zip ? ` ${(c as any).zip}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                  background: c.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                  color: c.isActive ? 'var(--success)' : 'var(--muted)',
                }}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Detail */}
      {selectedKey && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ClientDetailPane clientKey={selectedKey} onClientDeleted={handleClientDeleted} />
        </div>
      )}

      {/* Empty state when nothing selected */}
      {!selectedKey && !loading && filtered.length > 0 && (
        <div style={{
          display: 'none', /* hidden when list is full-width */
        }} />
      )}

      <NewClientModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={() => loadClients(search, statusFilter)}
      />
    </div>
  );
};
