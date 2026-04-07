import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { RepairItemListItem } from './types';

interface RepairItemsListProps {
  items: RepairItemListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  typeFilter: string;
  statusFilter: string;
  onSearchChange: (s: string) => void;
  onTypeFilterChange: (f: string) => void;
  onStatusFilterChange: (f: string) => void;
  onSelect: (item: RepairItemListItem) => void;
}

const SEG_BTNS: React.CSSProperties = {
  display: 'inline-flex',
  borderRadius: 4,
  overflow: 'hidden',
  border: '1px solid var(--border-dk)',
  flexShrink: 0,
};

function segBtn(active: boolean): React.CSSProperties {
  return {
    padding: '2px 9px',
    fontSize: 10.5,
    fontWeight: active ? 700 : 500,
    background: active ? 'var(--navy)' : 'var(--card)',
    color: active ? 'var(--card)' : 'var(--muted)',
    border: 'none',
    cursor: 'pointer',
    borderRight: '1px solid var(--border-dk)',
    outline: 'none',
    whiteSpace: 'nowrap',
  };
}

const typeBadge = (type: string | null) => ({
  display: 'inline-block' as const,
  padding: '1px 6px',
  borderRadius: 3,
  fontSize: 9.5,
  fontWeight: 700,
  background: type === 'F' ? 'var(--primary-light)' : 'rgba(var(--success-rgb), 0.15)',
  color: type === 'F' ? 'var(--primary)' : 'var(--success)',
  border: `1px solid ${type === 'F' ? 'var(--border-dk)' : 'rgba(var(--success-rgb), 0.3)'}`,
});

export const RepairItemsList = ({
  items,
  loading,
  selectedKey,
  search,
  typeFilter,
  statusFilter,
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onSelect,
}: RepairItemsListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Search */}
    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search description or code..."
        aria-label="Search repair items"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 28, fontSize: 12 }}
        allowClear
      />
    </div>

    {/* Filters */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 10px',
      background: 'var(--neutral-50)',
      borderBottom: '1px solid var(--neutral-200)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Type</span>
      <div style={SEG_BTNS}>
        {['all', 'F', 'R'].map(v => (
          <button key={v} style={{ ...segBtn(typeFilter === v), borderRight: v === 'R' ? 'none' : undefined }} onClick={() => onTypeFilterChange(v)}>
            {v === 'all' ? 'All' : v === 'F' ? 'Flex' : 'Rigid'}
          </button>
        ))}
      </div>
      <span style={{ width: 1, height: 18, background: 'var(--border-dk)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Status</span>
      <div style={SEG_BTNS}>
        {['all', 'active', 'inactive'].map(v => (
          <button key={v} style={{ ...segBtn(statusFilter === v), borderRight: v === 'inactive' ? 'none' : undefined }} onClick={() => onStatusFilterChange(v)}>
            {v === 'all' ? 'All' : v === 'active' ? 'Active' : 'Inactive'}
          </button>
        ))}
      </div>
    </div>

    {/* List header */}
    <div style={{
      background: 'var(--neutral-50)',
      padding: '4px 10px',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--navy)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <span>Repair Items</span>
      <span style={{
        background: 'var(--navy)',
        color: 'var(--card)',
        fontSize: 8,
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 8,
      }}>
        {items.length}
      </span>
    </div>

    {/* Items */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          No repair items found
        </div>
      ) : (
        items.map(item => (
          <div
            key={item.repairItemKey}
            onClick={() => onSelect(item)}
            style={{
              padding: '7px 10px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === item.repairItemKey ? 'var(--amber-light)' : 'var(--card)',
              borderLeft: selectedKey === item.repairItemKey ? '2px solid var(--amber)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <span style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--primary-dark)',
                lineHeight: 1.3,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.itemDescription}
              </span>
              {item.rigidOrFlexible && (
                <span style={typeBadge(item.rigidOrFlexible)}>
                  {item.rigidOrFlexible === 'F' ? 'Flex' : 'Rigid'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {(item.tsiCode || item.problemId) && (
                <span style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border-dk)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  fontFamily: 'monospace',
                }}>
                  {item.tsiCode || item.problemId}
                </span>
              )}
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: item.isActive ? 'var(--success)' : 'var(--muted)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: item.isActive ? 'var(--success)' : 'var(--muted)' }}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
              {item.partOrLabor && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  background: 'var(--neutral-100)',
                  padding: '0 4px',
                  borderRadius: 3,
                  border: '1px solid var(--neutral-200)',
                }}>
                  {item.partOrLabor === 'P' ? 'Part' : 'Labor'}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
