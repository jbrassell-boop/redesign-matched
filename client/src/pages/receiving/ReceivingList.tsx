import { Spin } from 'antd';
import type { PendingArrival } from './types';

interface Props {
  arrivals: PendingArrival[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (a: PendingArrival) => void;
}

const ageBadge = (days: number) => {
  if (days >= 14)
    return { bg: 'rgba(var(--danger-rgb), 0.08)', color: 'var(--danger)', label: `OVERDUE ${days}d` };
  if (days >= 7)
    return { bg: 'rgba(var(--amber-rgb), 0.08)', color: 'var(--warning)', label: `${days}d ago` };
  return { bg: 'rgba(var(--success-rgb), 0.08)', color: 'var(--success)', label: `${days}d ago` };
};

export const ReceivingList = ({ arrivals, loading, selectedKey, search, onSearchChange, onSelect }: Props) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    {/* Search */}
    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--neutral-200)' }}>
      <input
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search by customer, WO#, serial..."
        aria-label="Search receiving by customer, work order, or serial number"
        style={{
          width: '100%', height: 30, border: '1px solid var(--neutral-200)',
          borderRadius: 5, padding: '0 10px', fontSize: 12,
          fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>

    {/* List */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spin size="small" /></div>
      ) : arrivals.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          No pending arrivals
        </div>
      ) : arrivals.map(a => {
        const selected = a.repairKey === selectedKey;
        const badge = ageBadge(a.daysIn);
        return (
          <div
            key={a.repairKey}
            onClick={() => onSelect(a)}
            style={{
              padding: '8px 12px', cursor: 'pointer',
              borderBottom: '1px solid var(--neutral-100)',
              borderLeft: selected ? '2px solid var(--amber)' : '2px solid transparent',
              background: selected ? 'rgba(var(--amber-rgb), 0.08)' : undefined,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{a.clientName || 'Unknown'}</div>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                background: badge.bg, color: badge.color, fontWeight: 700,
              }}>{badge.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 11, color: 'var(--muted)' }}>
              <span>WO: <strong style={{ color: 'var(--primary)' }}>{a.workOrderNumber}</strong></span>
              {a.serialNumber && <span>SN: <span style={{ fontFamily: 'monospace' }}>{a.serialNumber}</span></span>}
            </div>
            {a.scopeTypeDesc && (
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{a.scopeTypeDesc}</div>
            )}
            {a.complaintDesc && (
              <div style={{
                fontSize: 10, color: 'var(--danger)', marginTop: 2,
                fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{a.complaintDesc}</div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
