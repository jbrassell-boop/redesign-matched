import { memo, type JSX } from 'react';
import type { Alert, AlertType } from '../../hooks/useAlerts';

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<AlertType, { bg: string; border: string; color: string }> = {
  warning:     { bg: 'rgba(var(--amber-rgb), 0.08)', border: 'var(--amber)', color: 'var(--amber)' },
  info:        { bg: 'rgba(var(--primary-rgb), 0.06)', border: 'var(--primary)', color: 'var(--primary)' },
  opportunity: { bg: 'rgba(var(--success-rgb), 0.06)', border: 'var(--success)', color: 'var(--success)' },
};

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5L1 14h14L8 1.5z"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5"/><line x1="8" y1="7" x2="8" y2="11.5"/><circle cx="8" cy="4.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const OpportunityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.7 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1z"/>
  </svg>
);

const ICONS: Record<AlertType, () => JSX.Element> = {
  warning: WarningIcon,
  info: InfoIcon,
  opportunity: OpportunityIcon,
};

export const AlertBanner = memo(function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (!alerts.length) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      borderBottom: '1px solid var(--neutral-200)',
      flexShrink: 0,
    }}>
      {alerts.map(alert => {
        const style = TYPE_STYLES[alert.type];
        const Icon = ICONS[alert.type];
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px',
              background: style.bg,
              borderLeft: `3px solid ${style.border}`,
              color: style.color,
              fontSize: 12, fontWeight: 500,
            }}
          >
            <Icon />
            <span style={{ flex: 1 }}>{alert.msg}</span>
            <button
              onClick={() => onDismiss(alert.id)}
              title="Dismiss"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: style.color, fontSize: 16, lineHeight: 1,
                padding: '0 2px', opacity: 0.6,
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
});
