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
      background: 'var(--navy)',
      padding: '6px 14px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 16px',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      {fields.map(({ label, value }, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{
            fontSize: 8,
            fontWeight: 700,
            color: 'rgba(255,255,255,.5)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}>
            {label}
          </div>
          <div style={{
            height: 24,
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 3,
            padding: '0 7px',
            fontSize: 11,
            color: value ? '#fff' : 'rgba(255,255,255,.3)',
            fontStyle: value ? 'normal' : 'italic',
            display: 'flex',
            alignItems: 'center',
            minWidth: 70,
            whiteSpace: 'nowrap',
          }}>
            {value || '—'}
          </div>
        </div>
      ))}
    </div>
  );
};
