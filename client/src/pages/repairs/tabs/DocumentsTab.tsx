// Documents tab for repair cockpit and legacy pane.
// No document endpoint exists at the repair level yet — shows a clean empty state.

interface DocumentsTabProps {
  repairKey: number;
}

export const DocumentsTab = ({ repairKey }: DocumentsTabProps) => {
  void repairKey; // reserved for future endpoint wiring

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--neutral-50)',
          padding: '8px 14px',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--navy)',
          borderBottom: '1px solid var(--neutral-200)',
        }}>
          Attached Documents
        </div>

        {/* Empty state */}
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ marginBottom: 12 }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 40, height: 40, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>
            No documents attached
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
            PDFs, worksheets, and other attachments for this repair will appear here
            once document management is enabled.
          </div>
        </div>
      </div>
    </div>
  );
};
