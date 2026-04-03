interface Props {
  currentStatus: string;
}

const STAGES = [
  { label: 'Received', matches: ['received', 'waiting on inspection'] },
  { label: 'D&I', matches: ['d&i', 'damage', 'inspection', 'drying room', 'additional evaluation'] },
  { label: 'Quoted', matches: ['quoted', 'waiting for approved'] },
  { label: 'Approved', matches: ['approved'] },
  { label: 'In Repair', matches: ['in repair', 'in progress', 'semi rigid', 'special rigid'] },
  { label: 'QC', matches: ['qc', 'quality'] },
  { label: 'Shipping', matches: ['ship', 'shipping', 'scheduled to ship'] },
  { label: 'Invoiced', matches: ['invoiced', 'closed', 'complete'] },
];

const getStageIndex = (status: string): number => {
  const s = status.toLowerCase();
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].matches.some(m => s.includes(m))) return i;
  }
  return -1;
};

export const WorkflowPipeline = ({ currentStatus }: Props) => {
  const activeIdx = getStageIndex(currentStatus);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '6px 14px', borderBottom: '1px solid var(--neutral-200)',
      background: '#fff', overflow: 'hidden',
    }}>
      {STAGES.map((stage, idx) => {
        const isPast = idx < activeIdx;
        const isActive = idx === activeIdx;

        return (
          <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 26, padding: '0 10px', borderRadius: 13,
              fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
              background: isActive ? 'var(--primary)' : isPast ? 'var(--primary-light, #dbeafe)' : 'var(--neutral-100, #f3f4f6)',
              color: isActive ? '#fff' : isPast ? 'var(--primary)' : 'var(--muted, #9ca3af)',
              border: isActive ? '2px solid var(--primary)' : isPast ? '1px solid var(--primary)' : '1px solid var(--neutral-200, #e5e7eb)',
              transition: 'all .15s',
            }}>
              {isPast && <span style={{ marginRight: 3, fontSize: 11 }}>✓</span>}
              {stage.label}
            </div>
            {idx < STAGES.length - 1 && (
              <div style={{
                flex: 1, height: 2, minWidth: 8,
                background: isPast ? 'var(--primary)' : 'var(--neutral-200, #e5e7eb)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
