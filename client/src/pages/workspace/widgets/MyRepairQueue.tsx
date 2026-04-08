import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDashboardRepairs } from '../../../api/dashboard';
import { StatusBadge } from '../../../components/shared';
import type { DashboardRepair } from '../../dashboard/types';

const NEXT_ACTION: Record<string, string> = {
  'Received': 'Print D&I',
  'D&I': 'Build estimate',
  'Pending QC': 'Build estimate',
  'Pending Approval': 'Follow up',
  'Approved': 'Assign tech',
  'In Repair': 'Awaiting completion',
  'QC Complete': 'Ship',
  'Pending Ship': 'Ship',
  'Shipped': 'Invoice',
};

export const MyRepairQueue = () => {
  const [repairs, setRepairs] = useState<DashboardRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getDashboardRepairs({ search: '', page: 1, pageSize: 10, statusFilter: 'all' })
      .then(r => { if (!cancelled) setRepairs(r.repairs.slice(0, 10)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

  const urgent = repairs.filter(r => r.isUrgent).length;
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: 11, borderBottom: '1px solid var(--border)', color: 'var(--text)',
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1 }}>
          My Repair Queue
        </span>
        {urgent > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--card)',
            background: 'var(--warning)', borderRadius: 'var(--radius-pill)',
            padding: '1px 7px',
          }}>{urgent} urgent</span>
        )}
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--card)',
          background: 'var(--primary)', borderRadius: 'var(--radius-pill)',
          padding: '1px 7px',
        }}>{repairs.length} assigned</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['WO#', 'Client', 'Scope', 'TAT', 'Status', 'Next Action'].map(h => (
                <th key={h} style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
                  letterSpacing: '0.04em', padding: '4px 8px', borderBottom: '1.5px solid var(--border-dk)',
                  textAlign: 'left', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {repairs.map(r => (
              <tr
                key={r.repairKey}
                style={{
                  cursor: 'pointer',
                  borderLeft: r.isUrgent ? '3px solid var(--danger)' : '3px solid transparent',
                }}
                onClick={() => navigate(`/repairs/${r.repairKey}`)}
              >
                <td style={tdStyle}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>{r.wo}</span>
                </td>
                <td style={tdStyle}>{r.client}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{r.scopeType}</td>
                <td style={tdStyle}>
                  <StatusBadge status={`${r.daysIn}d`} variant={r.daysIn > 14 ? 'red' : r.daysIn > 10 ? 'amber' : 'blue'} />
                </td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={{ ...tdStyle, fontSize: 11, color: 'var(--muted)' }}>{NEXT_ACTION[r.status] ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
