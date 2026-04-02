import { Skeleton } from 'antd';
import type { DashboardStats } from './types';

interface Chip {
  id: string;
  label: string;
  getValue: (s: DashboardStats) => number;
  iconColor: string;
  valueColor: string;
}

const CHIPS: Chip[] = [
  { id: 'open', label: 'OPEN REPAIRS', getValue: s => s.openRepairs, iconColor: '#2E75B6', valueColor: 'var(--navy)' },
  { id: 'urgent', label: 'URGENT', getValue: s => s.urgentRepairs, iconColor: '#B71234', valueColor: 'var(--danger)' },
  { id: 'pendingQC', label: 'PENDING QC', getValue: s => s.pendingQC, iconColor: '#F59E0B', valueColor: 'var(--amber)' },
  { id: 'pendingShip', label: 'PENDING SHIP', getValue: s => s.pendingShip, iconColor: '#1B3A5C', valueColor: 'var(--navy)' },
  { id: 'completedToday', label: 'SHIPPED TODAY', getValue: s => s.completedToday, iconColor: '#16A34A', valueColor: 'var(--success)' },
  { id: 'receivedToday', label: 'RECEIVED TODAY', getValue: s => s.receivedToday, iconColor: '#6B7280', valueColor: 'var(--muted)' },
];

interface StatStripProps {
  stats: DashboardStats | null;
  loading: boolean;
  activeChip: string;
  onChipClick: (id: string) => void;
}

export const StatStrip = ({ stats, loading, activeChip, onChipClick }: StatStripProps) => (
  <div style={{
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid var(--neutral-200)',
    borderTop: '1px solid var(--neutral-200)',
  }}>
    {CHIPS.map((chip, i) => (
      <div
        key={chip.id}
        onClick={() => onChipClick(chip.id === activeChip ? 'all' : chip.id)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRight: i < CHIPS.length - 1 ? '1px solid var(--neutral-200)' : 'none',
          cursor: 'pointer',
          background: chip.id === activeChip ? 'var(--primary-light)' : '#fff',
          outline: chip.id === activeChip ? '2.5px solid var(--navy)' : 'none',
          outlineOffset: '-2.5px',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: chip.iconColor + '22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: chip.iconColor }} />
        </div>
        <div>
          {loading ? (
            <Skeleton.Input size="small" active style={{ width: 40, height: 16 }} />
          ) : (
            <div style={{ fontSize: 16, fontWeight: 800, color: chip.valueColor, lineHeight: 1.1 }}>
              {stats ? chip.getValue(stats).toLocaleString() : '—'}
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {chip.label}
          </div>
        </div>
      </div>
    ))}
  </div>
);
