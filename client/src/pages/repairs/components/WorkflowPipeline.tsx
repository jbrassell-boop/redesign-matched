interface Props {
  currentStatus: string;
}

const STAGES = [
  { label: 'Received', matches: ['received', 'waiting on inspection'], title: 'Scope received and logged into system' },
  { label: 'D&I', matches: ['d&i', 'damage', 'inspection', 'drying room', 'additional evaluation'], title: 'Disassembly & Inspection in progress' },
  { label: 'Quoted', matches: ['quoted', 'waiting for approved'], title: 'Quote sent to customer, awaiting approval' },
  { label: 'Approved', matches: ['approved'], title: 'Customer approved the repair quote' },
  { label: 'In Repair', matches: ['in repair', 'in progress', 'semi rigid', 'special rigid'], title: 'Active repair work in progress' },
  { label: 'QC', matches: ['qc', 'quality'], title: 'Quality Control inspection' },
  { label: 'Shipping', matches: ['ship', 'shipping', 'scheduled to ship'], title: 'Scheduled for shipment' },
  { label: 'Invoiced', matches: ['invoiced', 'closed', 'complete'], title: 'Invoice generated and sent' },
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
      background: 'var(--card)', overflow: 'hidden',
    }}>
      {STAGES.map((stage, idx) => {
        const isPast = idx < activeIdx;
        const isActive = idx === activeIdx;

        return (
          <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div title={stage.title} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 26, padding: '0 10px', borderRadius: 13,
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              background: isActive ? 'var(--primary)' : isPast ? 'var(--primary-light)' : 'var(--neutral-100, var(--neutral-100))',
              color: isActive ? 'var(--card)' : isPast ? 'var(--primary)' : 'var(--muted, var(--muted))',
              border: isActive ? '2px solid var(--primary)' : isPast ? '1px solid var(--primary)' : '1px solid var(--neutral-200, var(--border))',
              transition: 'all .15s',
            }}>
              {isPast && <span style={{ marginRight: 3, fontSize: 11 }}>✓</span>}
              {stage.label}
            </div>
            {idx < STAGES.length - 1 && (
              <div style={{
                flex: 1, height: 2, minWidth: 8,
                background: isPast ? 'var(--primary)' : 'var(--neutral-200, var(--border))',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
