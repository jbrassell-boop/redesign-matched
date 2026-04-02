import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ContractListItem } from './types';

interface ContractsListProps {
  contracts: ContractListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (c: ContractListItem) => void;
}

const statusStyle = (status: ContractListItem['status']): React.CSSProperties => {
  if (status === 'Active') return {
    background: 'rgba(var(--success-rgb), 0.1)', border: '1px solid rgba(var(--success-rgb), 0.3)', color: 'var(--success)',
  };
  if (status === 'Expiring') return {
    background: 'rgba(var(--amber-rgb), 0.1)', border: '1px solid rgba(var(--amber-rgb), 0.3)', color: 'var(--warning)',
  };
  return {
    background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)', color: 'var(--danger)',
  };
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

export const ContractsList = ({ contracts, loading, selectedKey, search, onSearchChange, onSelect }: ContractsListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search contracts, client, ID..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 30, fontSize: 12 }}
        allowClear
      />
    </div>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
      ) : contracts.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No contracts found</div>
      ) : (
        contracts.map(c => (
          <div
            key={c.contractKey}
            onClick={() => onSelect(c)}
            style={{
              padding: '9px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === c.contractKey ? 'var(--primary-light)' : 'var(--card)',
              borderLeft: selectedKey === c.contractKey ? '2px solid var(--navy)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {c.name || '(Unnamed)'}
              </span>
              <span style={{
                display: 'inline-flex', padding: '1px 7px', borderRadius: 9999,
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                ...statusStyle(c.status),
              }}>
                {c.status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 1 }}>
              {c.contractNumber || c.contractId || '—'}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              {c.terminationDate && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  Exp: <b style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtDate(c.terminationDate)}</b>
                </span>
              )}
              {c.scopeCount > 0 && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {c.scopeCount} scope{c.scopeCount !== 1 ? 's' : ''}
                </span>
              )}
              {c.totalAmount > 0 && (
                <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>
                  {fmtMoney(c.totalAmount)}
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
      fontSize: 10,
      color: 'var(--muted)',
      flexShrink: 0,
    }}>
      {contracts.length} record{contracts.length !== 1 ? 's' : ''}
    </div>
  </div>
);
