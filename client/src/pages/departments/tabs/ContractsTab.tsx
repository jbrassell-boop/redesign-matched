import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDeptContracts } from '../../../api/departments';

interface ContractsTabProps {
  deptKey: number;
}

interface DeptContract {
  contractKey: number;
  contractName: string;
  contractNumber: string;
  contractType: string | null;
  dateEffective: string | null;
  dateTermination: string | null;
  status: string;
  annualValue: number | null;
}

export const ContractsTab = ({ deptKey }: ContractsTabProps) => {
  const [contracts, setContracts] = useState<DeptContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeptContracts(deptKey)
      .then(data => { if (!cancelled) setContracts(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  const statusColor = (s: string) => {
    if (s === 'Active') return 'var(--success)';
    if (s === 'Expiring') return 'var(--warning)';
    return 'var(--danger)';
  };

  const statusBg = (s: string) => {
    if (s === 'Active') return 'rgba(var(--success-rgb), 0.1)';
    if (s === 'Expiring') return 'rgba(var(--amber-rgb), 0.1)';
    return 'rgba(var(--danger-rgb), 0.1)';
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Contract #</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Start Date</th>
              <th style={thStyle}>End Date</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Annual Value</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c, i) => (
              <tr key={c.contractKey} style={{
                borderBottom: i < contracts.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
              }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>
                  {c.contractNumber || c.contractKey}
                </td>
                <td style={tdStyle}>{c.contractName || '\u2014'}</td>
                <td style={tdStyle}>{c.contractType || '\u2014'}</td>
                <td style={tdStyle}>{c.dateEffective ? new Date(c.dateEffective).toLocaleDateString() : '\u2014'}</td>
                <td style={tdStyle}>{c.dateTermination ? new Date(c.dateTermination).toLocaleDateString() : '\u2014'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {c.annualValue != null ? `$${c.annualValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '\u2014'}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', borderRadius: 9999,
                    fontSize: 11, fontWeight: 600,
                    color: statusColor(c.status),
                    background: statusBg(c.status),
                  }}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No contracts found for this department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };
