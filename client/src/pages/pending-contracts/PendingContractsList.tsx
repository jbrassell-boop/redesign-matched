import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { PendingContractListItem } from './types';

interface PendingContractsListProps {
  items: PendingContractListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (c: PendingContractListItem) => void;
}

// Dead deals get a red badge; live ones an amber "Pending" badge.
const statusStyle = (isDead: boolean): React.CSSProperties =>
  isDead
    ? { background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)', color: 'var(--danger)' }
    : { background: 'rgba(var(--amber-rgb), 0.1)', border: '1px solid rgba(var(--amber-rgb), 0.3)', color: 'var(--warning)' };

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const PendingContractsList = ({ items, loading, selectedKey, search, onSearchChange, onSelect }: PendingContractsListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search deals, client..."
        aria-label="Search pending contracts"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 30, fontSize: 12 }}
        allowClear
      />
    </div>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No pending contracts found</div>
      ) : (
        items.map(c => (
          <div
            key={c.pendingContractKey}
            onClick={() => onSelect(c)}
            style={{
              padding: '9px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === c.pendingContractKey ? 'var(--primary-light)' : 'var(--card)',
              borderLeft: selectedKey === c.pendingContractKey ? '2px solid var(--navy)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {c.clientName || '(No client)'}
              </span>
              <span style={{
                display: 'inline-flex', padding: '1px 7px', borderRadius: 9999,
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                ...statusStyle(c.isDead),
              }}>
                {(c.isDead ? 'Dead' : 'Pending').toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name || '—'}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
              {c.contractType && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.contractType}</span>
              )}
              {c.scopeCount > 0 && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {c.scopeCount} scope{c.scopeCount !== 1 ? 's' : ''}
                </span>
              )}
              {c.creationDate && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Created {fmtDate(c.creationDate)}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
    <div style={{
      padding: '4px 12px',
      borderTop: '1px solid var(--neutral-200)',
      background: 'var(--neutral-50)',
      fontSize: 11,
      color: 'var(--muted)',
      flexShrink: 0,
    }}>
      {items.length} record{items.length !== 1 ? 's' : ''}
    </div>
  </div>
);
