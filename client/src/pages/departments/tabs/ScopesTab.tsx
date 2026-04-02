import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDepartmentScopes } from '../../../api/departments';
import type { DepartmentScope } from '../types';

interface ScopesTabProps {
  deptKey: number;
}

export const ScopesTab = ({ deptKey }: ScopesTabProps) => {
  const [scopes, setScopes] = useState<DepartmentScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentScopes(deptKey)
      .then(data => { if (!cancelled) setScopes(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (scopes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No scopes on record for this department.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Serial Number</th>
              <th style={thStyle}>Model</th>
              <th style={{ ...thStyle, width: 120 }}>Manufacturer</th>
              <th style={{ ...thStyle, width: 90 }}>Type</th>
              <th style={thStyle}>Category</th>
            </tr>
          </thead>
          <tbody>
            {scopes.map((s, i) => (
              <tr
                key={s.scopeKey}
                style={{
                  borderBottom: i < scopes.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{s.serialNumber || '\u2014'}</td>
                <td style={tdStyle}>{s.model || '\u2014'}</td>
                <td style={tdStyle}>{s.manufacturer || '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: s.type === 'Flexible' ? 'rgba(var(--success-rgb), 0.1)' :
                                s.type === 'Rigid' ? 'rgba(var(--primary-rgb), 0.1)' :
                                'var(--neutral-100)',
                    color: s.type === 'Flexible' ? 'var(--success)' :
                           s.type === 'Rigid' ? 'var(--primary)' :
                           'var(--muted)',
                  }}>
                    {s.type || '\u2014'}
                  </span>
                </td>
                <td style={tdStyle}>{s.category || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--text)',
};
