// Images tab for repair cockpit and legacy pane.
// No image upload endpoint exists yet — shows a clean empty/placeholder state.

interface ImagesTabProps {
  repairKey: number;
}

export const ImagesTab = ({ repairKey }: ImagesTabProps) => {
  void repairKey; // reserved for future endpoint wiring

  return (
    <div style={{ padding: 24 }}>
      {/* Upload area placeholder */}
      <div style={{
        border: '2px dashed var(--neutral-300)',
        borderRadius: 10,
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--neutral-50)',
        color: 'var(--muted)',
      }}>
        <div style={{ marginBottom: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ width: 44, height: 44, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' }}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 6 }}>
          No images uploaded
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Repair photos and inspection images will appear here once image upload is enabled.
        </div>
      </div>
    </div>
  );
};
