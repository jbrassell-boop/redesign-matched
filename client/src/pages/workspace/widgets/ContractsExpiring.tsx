import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { getWorkspaceData } from '../../../api/workspace';
import { StatusBadge } from '../../../components/shared';

interface ContractItem {
  client: string;
  expirationDate: string;
  daysUntil: number;
}

export const ContractsExpiring = () => {
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getWorkspaceData()
      .then(d => { if (!cancelled) setItems(d.contractsExpiring?.items ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', fontSize: 11, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Contracts Expiring
      </div>
      <div style={{ padding: '6px 10px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>
            No contracts expiring in the next 60 days.
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 4px', borderBottom: '1px solid var(--border)',
              fontSize: 12,
            }}>
              <span style={{ flex: 1, color: 'var(--text)' }}>{item.client}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 8 }}>{item.expirationDate}</span>
              <StatusBadge status={`${item.daysUntil}d`} variant={item.daysUntil < 30 ? 'red' : item.daysUntil < 60 ? 'amber' : undefined} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
