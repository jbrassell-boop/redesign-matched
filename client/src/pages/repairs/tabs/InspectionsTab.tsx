export const InspectionsTab = ({ repairKey }: { repairKey: number }) => (
  <div style={{ padding: '10px 14px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)' }}>
          Incoming Inspection (D&I)
        </div>
        <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          Inspection checklist will be loaded from scope type configuration.
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)' }}>
          Post-Repair Verification
        </div>
        <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          Post-repair verification checklist will be loaded from scope type configuration.
        </div>
      </div>
    </div>
  </div>
);
