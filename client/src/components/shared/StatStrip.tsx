import { memo } from 'react';
import { Skeleton } from 'antd';
import './StatStrip.css';

export type ChipColor = 'navy' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'muted';
export type ChipState = 'normal' | 'warn' | 'alert';

export interface StatChipDef {
  id: string;
  label: string;
  value: string | number | null;
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

const skeletonStyle = { width: 40, height: 16 } as const;

export const StatStrip = memo(({ chips, loading, activeChip, onChipClick }: StatStripProps) => (
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
          role={onChipClick ? 'button' : undefined}
          tabIndex={onChipClick ? 0 : undefined}
          onClick={() => onChipClick?.(isActive ? 'all' : chip.id)}
          onKeyDown={onChipClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChipClick(isActive ? 'all' : chip.id); } } : undefined}
          aria-pressed={onChipClick ? isActive : undefined}
        >
          <div className={`stat-chip__icon stat-chip__icon--${chip.color}`}>
            <div className={`stat-chip__icon-dot stat-chip__dot--${chip.color}`} />
          </div>
          <div>
            {loading ? (
              <Skeleton.Input size="small" active style={skeletonStyle} />
            ) : (
              <div className={`stat-chip__value stat-chip__val--${chip.color}`}>
                {chip.value != null
                  ? (typeof chip.value === 'number' ? chip.value.toLocaleString() : chip.value)
                  : '\u2014'}
              </div>
            )}
            <div className="stat-chip__label">{chip.label}</div>
          </div>
        </div>
      );
    })}
  </div>
));
