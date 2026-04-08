import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getClientRepairs, getClientKpis } from '../../../api/clients';
import { StatusBadge } from '../../../components/shared';
import { StatStrip } from '../../../components/shared/StatStrip';
import type { ClientRepairItem, ClientKpis } from '../types';

interface RepairHistoryTabProps {
  clientKey: number;
}

export const RepairHistoryTab = ({ clientKey }: RepairHistoryTabProps) => {
  const [repairs, setRepairs] = useState<ClientRepairItem[]>([]);
  const [kpis, setKpis] = useState<ClientKpis | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getClientRepairs(clientKey, { page, pageSize }),
      page === 1 ? getClientKpis(clientKey) : Promise.resolve(null),
    ]).then(([repairData, kpiData]) => {
      if (cancelled) return;
      setRepairs(repairData.items);
      setTotalCount(repairData.totalCount);
      if (kpiData) setKpis(kpiData);
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [clientKey, page]);

  if (loading && page === 1) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {kpis && (
        <StatStrip chips={[
          { id: 'total',   label: 'Total Repairs', value: kpis.totalRepairs,                                                                                          color: 'navy'  },
          { id: 'open',    label: 'Open',           value: kpis.openRepairs,                                                                                          color: 'amber', state: kpis.openRepairs > 0 ? 'warn' : 'normal' },
          { id: 'avgTat',  label: 'Avg TAT',        value: `${kpis.avgTat.toFixed(1)} days`,                                                                         color: 'blue'  },
          { id: 'revenue', label: 'Revenue',         value: `$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: 'green' },
        ]} />
      )}
      <div style={{ padding: 16 }}>
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
                <tr key={r.repairKey} style={{
                  borderBottom: i < repairs.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>
                    {r.workOrderNumber || '—'}
                  </td>
                  <td style={tdStyle}>{r.dateIn ? new Date(r.dateIn).toLocaleDateString() : '—'}</td>
                  <td style={tdStyle}><StatusBadge status={r.status} /></td>
                  <td style={tdStyle}>{r.department || '—'}</td>
                  <td style={tdStyle}>{r.scopeType || '—'}</td>
                  <td style={tdStyle}>{r.serial || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.tat != null ? `${r.tat}d` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.amount != null ? `$${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                </tr>
              ))}
              {repairs.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No repair history.</td></tr>
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
    </div>
  );
};

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
