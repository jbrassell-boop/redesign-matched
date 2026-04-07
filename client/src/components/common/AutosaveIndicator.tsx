import type { AutosaveStatus } from '../../hooks/useAutosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
}

/**
 * Subtle inline status indicator for autosave.
 * Shows nothing when idle, "Saving..." with spinner while saving,
 * "Saved" in green that fades after 2 seconds, "Save failed" in red that persists.
 */
export const AutosaveIndicator = ({ status }: AutosaveIndicatorProps) => {
  if (status === 'idle') return null;

  const styles: Record<AutosaveStatus, React.CSSProperties> = {
    idle: {},
    saving: { color: 'var(--muted)' },
    saved: { color: 'var(--success)' },
    error: { color: 'var(--danger)' },
  };

  return (
    <span
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        ...styles[status],
      }}
    >
      {status === 'saving' && (
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            border: '1.5px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'autosave-spin 0.6s linear infinite',
          }}
        />
      )}
      {status === 'saving' && 'Saving...'}
      {status === 'saved' && 'Saved \u2713'}
      {status === 'error' && 'Save failed'}
      <style>{`
        @keyframes autosave-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
};
