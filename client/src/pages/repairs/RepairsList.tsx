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

export const RepairsList = ({ repairs, loading, selectedKey, search, onSearchChange, onSelect, onDoubleClick }: RepairsListProps) => (
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
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : repairs.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          No repairs found
        </div>
      ) : (
        repairs.map(r => (
          <div
            key={r.repairKey}
            onClick={() => onSelect(r)}
            onDoubleClick={() => onDoubleClick?.(r)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === r.repairKey ? 'var(--amber-light)' : 'var(--card)',
              borderLeft: selectedKey === r.repairKey ? '2px solid var(--amber)' : '2px solid transparent',
              transition: 'background 0.1s',
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
        ))
      )}
    </div>
  </div>
);
