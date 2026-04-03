import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDepartmentRepairs, getDepartmentKpis } from '../../../api/departments';
import type { DepartmentRepairItem, DeptKpis } from '../types';

interface RepairsTabProps {
  deptKey: number;
}

const colorMap = {
  navy:  { bg: 'rgba(var(--navy-rgb), 0.08)',   dot: 'var(--navy)',    text: 'var(--navy)' },
  blue:  { bg: 'rgba(var(--primary-rgb), 0.08)', dot: 'var(--primary)', text: 'var(--primary)' },
  green: { bg: 'rgba(var(--success-rgb), 0.08)', dot: 'var(--success)', text: 'var(--success)' },
  amber: { bg: 'rgba(var(--amber-rgb), 0.08)',   dot: 'var(--amber)',   text: 'var(--amber)' },
};

export const RepairsTab = ({ deptKey }: RepairsTabProps) => {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState<DepartmentRepairItem[]>([]);
  const [kpis, setKpis] = useState<DeptKpis | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    setLoading(true);
    getDepartmentRepairs(deptKey, { page, pageSize })
      .then(res => { setRepairs(res.items); setTotalCount(res.totalCount); })
      .finally(() => setLoading(false));
  }, [deptKey, page]);

  useEffect(() => {
    getDepartmentKpis(deptKey).then(setKpis);
  }, [deptKey]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const kpiChips = kpis ? [
    { label: 'TOTAL REPAIRS', value: kpis.totalRepairs.toString(), color: 'navy' as const },
    { label: 'OPEN', value: kpis.openRepairs.toString(), color: 'amber' as const },
    { label: 'AVG TAT', value: `${kpis.avgTat.toFixed(1)} days`, color: 'blue' as const },
    { label: 'REVENUE', value: `$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: 'green' as const },
  ] : null;

  return (
    <div style={{ padding: 16 }}>
      {kpiChips && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 14,
          flexWrap: 'wrap',
        }}>
          {kpiChips.map(chip => {
            const c = colorMap[chip.color];
            return (
              <div key={chip.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--neutral-200)',
                background: 'var(--card)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: c.bg, flexShrink: 0,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.dot }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1, color: c.text }}>
                    {chip.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {chip.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : repairs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No repair history for this department.
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
                  <th style={thStyle}>WO#</th>
                  <th style={thStyle}>Date In</th>
                  <th style={thStyle}>Status</th>
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
                    <td style={tdStyle}>
                      <span
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => navigate(`/repairs?id=${r.repairKey}`)}
                      >
                        {r.workOrderNumber || '\u2014'}
                      </span>
                    </td>
                    <td style={tdStyle}>{r.dateIn ? new Date(r.dateIn).toLocaleDateString() : '\u2014'}</td>
                    <td style={tdStyle}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={tdStyle}>{r.scopeType || '\u2014'}</td>
                    <td style={tdStyle}>{r.serialNumber || '\u2014'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{r.tat}d</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {r.amount != null ? `$${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={pageBtnStyle}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: '28px' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={pageBtnStyle}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status?: string }) => {
  const isShipped = status === 'Shipped';
  const isCancelled = status === 'Cancelled';
  return (
    <span style={{
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      background: isShipped ? 'rgba(var(--success-rgb), 0.1)' :
                  isCancelled ? 'var(--neutral-100)' :
                  'rgba(var(--primary-rgb), 0.1)',
      color: isShipped ? 'var(--success)' :
             isCancelled ? 'var(--muted)' :
             'var(--primary)',
    }}>
      {status || '\u2014'}
    </span>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

const pageBtnStyle: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--neutral-200)', borderRadius: 4,
  background: 'var(--card)', color: 'var(--primary)',
};
