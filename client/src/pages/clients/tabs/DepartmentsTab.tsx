import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getClientDepartments } from '../../../api/clients';
import type { ClientDepartment } from '../types';

interface DepartmentsTabProps {
  clientKey: number;
}

export const DepartmentsTab = ({ clientKey }: DepartmentsTabProps) => {
  const [departments, setDepartments] = useState<ClientDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientDepartments(clientKey)
      .then(data => { if (!cancelled) setDepartments(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (departments.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No departments on record for this client.
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
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Service Location</th>
              <th style={{ ...thStyle, width: 80 }}>Is Active</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d, i) => (
              <tr
                key={d.departmentKey}
                style={{
                  borderBottom: i < departments.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name || '\u2014'}</td>
                <td style={tdStyle}>{d.serviceLocation || '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: d.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                    border: `1px solid ${d.isActive ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
                    color: d.isActive ? 'var(--success)' : 'var(--muted)',
                  }}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
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
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--text)',
};
