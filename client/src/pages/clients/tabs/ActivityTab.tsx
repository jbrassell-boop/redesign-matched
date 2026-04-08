import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getClientRepairs } from '../../../api/clients';
import { StatusBadge } from '../../../components/shared';
import type { ClientRepairItem } from '../types';

interface ActivityTabProps {
  clientKey: number;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

const pageBtnStyle: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--neutral-200)', borderRadius: 4,
  background: 'var(--card)', color: 'var(--primary)',
};

export const ActivityTab = ({ clientKey }: ActivityTabProps) => {
  const [repairs, setRepairs] = useState<ClientRepairItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    getClientRepairs(clientKey, { page: 1, pageSize })
      .then(data => {
        if (cancelled) return;
        setRepairs(data.items);
        setTotalCount(data.totalCount);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientKey]);

  useEffect(() => {
    if (page === 1) return;
    let cancelled = false;
    setLoading(true);
    getClientRepairs(clientKey, { page, pageSize })
      .then(data => {
        if (cancelled) return;
        setRepairs(data.items);
        setTotalCount(data.totalCount);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientKey, page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && page === 1) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
          {totalCount} total repairs
        </div>
      </div>

      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>WO#</th>
              <th style={thStyle}>Date In</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Scope Type</th>
              <th style={thStyle}>Serial</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>TAT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((r, i) => (
              <tr
                key={r.repairKey}
                style={{
                  borderBottom: i < repairs.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>
                  {r.workOrderNumber || '\u2014'}
                </td>
                <td style={tdStyle}>{r.dateIn ? new Date(r.dateIn).toLocaleDateString() : '\u2014'}</td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={tdStyle}>{r.department || '\u2014'}</td>
                <td style={tdStyle}>{r.scopeType || '\u2014'}</td>
                <td style={tdStyle}>{r.serial || '\u2014'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{r.tat != null ? `${r.tat}d` : '\u2014'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {r.amount != null
                    ? `$${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '\u2014'}
                </td>
              </tr>
            ))}
            {repairs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No repair activity on record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, fontSize: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
          <span style={{ padding: '4px 8px', color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}
    </div>
  );
};
