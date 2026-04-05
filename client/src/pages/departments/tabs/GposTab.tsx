// GPO affiliations for a department.
// No dedicated GPO endpoint exists at the department level — shows clean empty state.

interface GposTabProps {
  deptKey: number;
}

export const GposTab = ({ deptKey }: GposTabProps) => {
  void deptKey; // reserved for future endpoint wiring

  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ marginBottom: 12 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ width: 40, height: 40, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' }}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      </div>
      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14, marginBottom: 6 }}>
        No GPO affiliations
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        Group Purchasing Organization affiliations for this department will appear here
        once the GPO endpoint is available.
      </div>
    </div>
  );
};
