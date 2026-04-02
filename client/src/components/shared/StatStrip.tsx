import { Skeleton } from 'antd';
import './StatStrip.css';

export type ChipColor = 'navy' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'muted';
export type ChipState = 'normal' | 'warn' | 'alert';

export interface StatChipDef {
  id: string;
  label: string;
  value: number | null;
  color: ChipColor;
  state?: ChipState;
  tooltip?: string;
}

interface StatStripProps {
  chips: StatChipDef[];
  loading?: boolean;
  activeChip?: string;
  onChipClick?: (id: string) => void;
}

export const StatStrip = ({ chips, loading, activeChip, onChipClick }: StatStripProps) => (
  <div className="stat-strip">
    {chips.map(chip => {
      const isActive = chip.id === activeChip;
      const state = chip.state ?? 'normal';
      const cls = [
        'stat-chip',
        isActive && 'stat-chip--active',
        state === 'warn' && 'stat-chip--warn',
        state === 'alert' && 'stat-chip--alert',
      ].filter(Boolean).join(' ');

      return (
        <div
          key={chip.id}
          className={cls}
          title={chip.tooltip}
          onClick={() => onChipClick?.(isActive ? 'all' : chip.id)}
        >
          <div className={`stat-chip__icon stat-chip__icon--${chip.color}`}>
            <div className={`stat-chip__icon-dot stat-chip__dot--${chip.color}`} />
          </div>
          <div>
            {loading ? (
              <Skeleton.Input size="small" active style={{ width: 40, height: 16 }} />
            ) : (
              <div className={`stat-chip__value stat-chip__val--${chip.color}`}>
                {chip.value != null ? chip.value.toLocaleString() : '\u2014'}
              </div>
            )}
            <div className="stat-chip__label">{chip.label}</div>
          </div>
        </div>
      );
    })}
  </div>
);
