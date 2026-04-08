import { StatusBadge } from '../../../components/shared';

interface RecentPo {
  supplierPoKey: number;
  poNumber: string;
  date: string | null;
  amount: number;
  status: string;
  poType: string | null;
}

interface RecentPosTabProps {
  pos: RecentPo[];
}

export const RecentPosTab = ({ pos }: RecentPosTabProps) => {
  if (pos.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 10,
        color: 'var(--muted)',
      }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32} style={{ opacity: 0.35 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 500 }}>No recent purchase orders</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--neutral-200)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>PO #</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Date</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Amount</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {pos.map(po => (
            <tr key={po.supplierPoKey} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--primary)' }}>{po.poNumber}</td>
              <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{po.date ?? '\u2014'}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                ${po.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '6px 8px' }}>
                <StatusBadge status={po.status} />
              </td>
              <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{po.poType ?? '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
