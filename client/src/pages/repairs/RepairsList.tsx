import { useRef, useState, useEffect } from 'react';
import { FixedSizeList } from 'react-window';
import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { RepairListItem } from './types';

const STATUS_COLORS: Record<string, string> = {
  'Shipped': 'var(--success)',
  'Pending Ship': 'var(--primary)',
  'Pending QC': 'var(--amber)',
  'Cancelled': 'var(--muted)',
};

interface RepairsListProps {
  repairs: RepairListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (r: RepairListItem) => void;
  onDoubleClick?: (r: RepairListItem) => void;
}

export const RepairsList = ({ repairs, loading, selectedKey, search, onSearchChange, onSelect, onDoubleClick }: RepairsListProps) => {
  const repairListRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);

  useEffect(() => {
    const el = repairListRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setListHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search repairs..."
          aria-label="Search repairs"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          style={{ height: 30, fontSize: 12 }}
          allowClear
        />
      </div>

      {/* List */}
      <div ref={repairListRef} style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin size="small" />
          </div>
        ) : repairs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            No repairs found
          </div>
        ) : listHeight > 0 ? (
          <FixedSizeList
            height={listHeight}
            itemCount={repairs.length}
            itemSize={64}
            width="100%"
            outerElementType="div"
            innerElementType={(props: React.HTMLAttributes<HTMLDivElement>) => <div role="listbox" aria-label="Repairs list" {...props} />}
          >
            {({ index, style }) => {
              const r = repairs[index];
              return (
                <div style={style} key={r.repairKey}>
                  <div
                    role="option"
                    aria-selected={selectedKey === r.repairKey}
                    tabIndex={0}
                    onClick={() => onSelect(r)}
                    onDoubleClick={() => onDoubleClick?.(r)}
                    onKeyDown={e => { if (e.key === 'Enter') onSelect(r); if (e.key === 'Enter' && e.ctrlKey) onDoubleClick?.(r); }}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--neutral-200)',
                      cursor: 'pointer',
                      background: selectedKey === r.repairKey ? 'var(--amber-light)' : 'var(--card)',
                      borderLeft: selectedKey === r.repairKey ? '2px solid var(--amber)' : '2px solid transparent',
                      transition: 'background 0.1s',
                      height: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: r.isUrgent ? 'var(--danger)' : 'var(--primary-dark)',
                      }}>
                        {r.wo}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: STATUS_COLORS[r.status] ?? 'var(--muted)',
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.client} — {r.dept}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{r.scopeType}</span>
                      <span style={{ fontSize: 10, color: r.daysIn > 14 ? 'var(--danger)' : r.daysIn > 7 ? 'var(--amber)' : 'var(--muted)' }}>
                        {r.daysIn}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          </FixedSizeList>
        ) : null}
      </div>
    </div>
  );
};
