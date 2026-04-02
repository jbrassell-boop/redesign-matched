import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { SupplierListItem } from './types';

interface SuppliersListProps {
  suppliers: SupplierListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (s: SupplierListItem) => void;
}

export const SuppliersList = ({ suppliers, loading, selectedKey, search, onSearchChange, onSelect }: SuppliersListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Search */}
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search suppliers..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 30, fontSize: 12 }}
        allowClear
      />
    </div>

    {/* List */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          No suppliers found
        </div>
      ) : (
        suppliers.map(s => (
          <div
            key={s.supplierKey}
            onClick={() => onSelect(s)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === s.supplierKey ? '#FEF3C7' : '#fff',
              borderLeft: selectedKey === s.supplierKey ? '2px solid #F59E0B' : '2px solid transparent',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--primary-dark)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                marginRight: 8,
              }}>
                {s.name}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: s.isActive ? 'var(--success)' : 'var(--muted)',
                flexShrink: 0,
              }}>
                {s.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[s.city, s.state].filter(Boolean).join(', ') || 'No location'}
            </div>
            {s.roles.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                {s.roles.map(r => (
                  <span key={r} style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    color: 'var(--primary)',
                  }}>
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);
