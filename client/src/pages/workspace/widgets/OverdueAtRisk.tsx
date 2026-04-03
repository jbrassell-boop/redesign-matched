import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDashboardRepairs } from '../../../api/dashboard';
import { StatusBadge } from '../../../components/shared';
import type { DashboardRepair } from '../../dashboard/types';

export const OverdueAtRisk = () => {
  const [items, setItems] = useState<DashboardRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardRepairs({ search: '', page: 1, pageSize: 50, statusFilter: 'all' })
      .then(r => {
        const overdue = r.repairs
          .filter(rep => rep.daysIn > 10)
          .sort((a, b) => b.daysIn - a.daysIn)
          .slice(0, 5);
        setItems(overdue);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'rgba(var(--danger-rgb), 0.08)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 13 }}>&#9888;</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Overdue / At Risk
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--card)',
          background: 'var(--danger)', borderRadius: 'var(--radius-pill)',
          padding: '1px 7px', marginLeft: 'auto',
        }}>{items.length}</span>
      </div>
      <div style={{ padding: '6px 10px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>
            No overdue or at-risk repairs.
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.repairKey}
              onClick={() => navigate(`/repairs/${item.repairKey}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 4px', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.wo}</span>
              <StatusBadge status={`${item.daysIn}d`} variant={item.daysIn > 14 ? 'red' : 'amber'} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
