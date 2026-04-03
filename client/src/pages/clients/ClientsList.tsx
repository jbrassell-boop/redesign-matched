import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ClientListItem } from './types';

interface ClientsListProps {
  clients: ClientListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (c: ClientListItem) => void;
}

export const ClientsList = ({ clients, loading, selectedKey, search, onSearchChange, onSelect }: ClientsListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search clients..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 30, fontSize: 12 }}
        allowClear
      />
    </div>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
      ) : clients.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No clients found</div>
      ) : (
        clients.map(c => (
          <div
            key={c.clientKey}
            onClick={() => onSelect(c)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === c.clientKey ? 'var(--amber-light)' : 'var(--card)',
              borderLeft: selectedKey === c.clientKey ? '2px solid var(--amber)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)' }}>{c.name}</span>
              <span style={{
                display: 'inline-flex', padding: '1px 6px', borderRadius: 9999,
                fontSize: 10, fontWeight: 700,
                background: c.isActive ? 'var(--success-light)' : 'var(--neutral-100)',
                border: `1px solid ${c.isActive ? 'var(--success-border)' : 'var(--neutral-200)'}`,
                color: c.isActive ? 'var(--success)' : 'var(--muted)',
              }}>
                {c.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{[c.city, c.state].filter(Boolean).join(', ')}</div>
          </div>
        ))
      )}
    </div>
  </div>
);
