import { memo } from 'react';
import type { ReactNode } from 'react';

interface BulkActionBarAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  actions: BulkActionBarAction[];
  children?: ReactNode;
}

const VARIANT_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  default: { bg: 'var(--card)', border: 'var(--border-dk)', color: 'var(--navy)' },
  success: { bg: 'rgba(var(--success-rgb), 0.1)', border: 'rgba(var(--success-rgb), 0.4)', color: 'var(--success)' },
  danger:  { bg: 'rgba(var(--danger-rgb), 0.1)', border: 'rgba(var(--danger-rgb), 0.4)', color: 'var(--danger)' },
};

export const BulkActionBar = memo(({ count, onClear, actions, children }: BulkActionBarProps) => {
  if (count === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 18px',
      background: 'var(--navy)',
      borderRadius: 8,
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
      color: 'var(--card)',
      fontSize: 13,
      fontWeight: 600,
    }}>
      <span>
        <span style={{ fontSize: 16, fontWeight: 800, marginRight: 4 }}>{count}</span>
        selected
      </span>
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.3)' }} />
      {actions.map((action, i) => {
        const v = VARIANT_STYLES[action.variant ?? 'default'];
        return (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              height: 30,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              border: `1px solid ${v.border}`,
              borderRadius: 6,
              cursor: action.disabled ? 'default' : 'pointer',
              background: v.bg,
              color: v.color,
              opacity: action.disabled ? 0.5 : 1,
              transition: 'opacity 0.1s',
            }}
          >
            {action.label}
          </button>
        );
      })}
      {children}
      <button
        onClick={onClear}
        title="Clear selection"
        style={{
          width: 28,
          height: 28,
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          background: 'transparent',
          color: 'var(--card)',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        &times;
      </button>
    </div>
  );
});
