interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export const EmptyState = ({ message = 'No data', icon }: EmptyStateProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 20px', color: 'var(--muted)', gap: 8,
  }}>
    {icon || (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.25 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    )}
    <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
  </div>
);
