import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InventoryListItem } from './types';

interface InventoryListProps {
  items: InventoryListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (item: InventoryListItem) => void;
  totalCount: number;
}

function getCategoryLabel(category: string): string {
  const c = (category || '').toUpperCase();
  if (c === 'R') return 'Rigid';
  if (c === 'F') return 'Flexible';
  if (c === 'C') return 'Camera';
  if (category) return category;
  return 'Instrument';
}

function getCategoryColor(category: string): { bg: string; border: string; color: string } {
  const c = (category || '').toUpperCase();
  if (c === 'R') return { bg: 'var(--primary-light)', border: 'rgba(var(--primary-rgb),0.3)', color: 'var(--primary)' };
  if (c === 'F') return { bg: 'var(--success-light)', border: 'var(--success-border)', color: 'var(--success)' };
  if (c === 'C') return { bg: 'var(--purple-light)', border: 'rgba(var(--purple-rgb), 0.3)', color: 'var(--purple)' };
  return { bg: 'var(--neutral-100)', border: 'var(--neutral-200)', color: 'var(--muted)' };
}

function StockLevelBadge({ current, min }: { current: number; min: number }) {
  const isLow = current < min;
  const isAtMin = current === min && min > 0;
  const color = isLow ? 'var(--danger)' : isAtMin ? 'var(--amber)' : 'var(--success)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color }}>
      {current}/{min}
    </span>
  );
}

export const InventoryList = ({
  items,
  loading,
  selectedKey,
  search,
  onSearchChange,
  onSelect,
  totalCount,
}: InventoryListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Header */}
    <div style={{
      padding: '4px 8px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--neutral-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)' }}>
        Inventory Items
      </span>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{totalCount} items</span>
    </div>

    {/* Search */}
    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 11 }} />}
        placeholder="Search inventory..."
        aria-label="Search inventory"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 36, fontSize: 11 }}
        allowClear
      />
    </div>

    {/* List */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          No inventory items found
        </div>
      ) : (
        items.map(item => {
          const isSelected = selectedKey === item.inventoryKey;
          const catStyle = getCategoryColor(item.category);
          return (
            <div
              key={item.inventoryKey}
              onClick={() => onSelect(item)}
              style={{
                padding: '5px 8px',
                borderBottom: '1px solid var(--border)',
                borderLeft: isSelected
                  ? '2px solid var(--amber)'
                  : item.isLowStock
                  ? '2px solid var(--amber)'
                  : '2px solid transparent',
                cursor: 'pointer',
                background: isSelected
                  ? 'var(--amber-light)'
                  : item.isLowStock
                  ? 'var(--amber-subtle)'
                  : 'var(--card)',
                transition: 'background 0.1s',
              }}
              className={isSelected ? 'selected' : 'hover-row-light'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                {/* Stock dot */}
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: item.currentLevel < item.minLevel
                    ? 'var(--danger)'
                    : item.currentLevel === item.minLevel && item.minLevel > 0
                    ? 'var(--amber)'
                    : 'var(--success)',
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}>
                  {item.description}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12 }}>
                <span style={{
                  display: 'inline-flex',
                  padding: '0px 5px',
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 700,
                  background: catStyle.bg,
                  border: `1px solid ${catStyle.border}`,
                  color: catStyle.color,
                }}>
                  {getCategoryLabel(item.category)}
                </span>
                <StockLevelBadge current={item.currentLevel} min={item.minLevel} />
                {item.sizeCount > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 'auto' }}>
                    {item.sizeCount} size{item.sizeCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Footer */}
    <div style={{
      padding: '3px 8px',
      borderTop: '1px solid var(--border)',
      background: 'var(--neutral-50)',
      fontSize: 10,
      color: 'var(--muted)',
    }}>
      {items.length} of {totalCount} shown
    </div>
  </div>
);
