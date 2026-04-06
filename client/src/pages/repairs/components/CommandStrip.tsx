import type { RepairFull } from '../types';

interface CommandStripProps {
  repair: RepairFull;
}

export const CommandStrip = ({ repair }: CommandStripProps) => {
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Client',         value: repair.client },
    { label: 'Department',     value: repair.dept },
    { label: 'Work Order',     value: repair.wo },
    { label: 'Purchase Order', value: repair.purchaseOrder },
    { label: 'Rack',           value: repair.rackLocation },
    { label: 'Repair Level',   value: repair.repairLevel },
    { label: 'Lead Time',      value: repair.leadTime },
    { label: 'Turn Around',    value: repair.turnAroundTime },
    { label: 'Date In',        value: repair.dateIn },
  ];

  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      padding: '8px 12px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px 12px',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      {fields.map(({ label, value }, i) => (
        <div key={i} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}>
            {label}
          </div>
          <div style={{
            background: 'var(--neutral-50)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: value ? 'var(--navy)' : 'var(--muted)',
            fontStyle: value ? 'normal' : 'italic',
            whiteSpace: 'nowrap',
          }}>
            {value || '—'}
          </div>
        </div>
      ))}
    </div>
  );
};
