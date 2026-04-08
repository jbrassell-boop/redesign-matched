import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractDepartments } from '../../../api/contracts';
import type { ContractDepartment } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingStyle,
  tableContainerStyle, tableStyle, thStyle, tdStyle, fmtDate,
} from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    {children}
  </div>
);

export const DepartmentsTab = ({ contractKey }: { contractKey: number }) => {
  const [depts, setDepts] = useState<ContractDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractDepartments(contractKey)
      .then(d => { if (!cancelled) setDepts(d); })
      .catch(() => { if (!cancelled) message.error('Failed to load departments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Linked Departments ({depts.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {depts.length === 0 ? (
            <div style={emptyStateStyle}>No departments linked to this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Effective</th>
                  <th style={thStyle}>End Date</th>
                  <th style={thStyle}>PO #</th>
                  <th style={thStyle}>Non-Billable</th>
                </tr>
              </thead>
              <tbody>
                {depts.map(d => (
                  <tr key={d.contractDepartmentKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{d.departmentName || '—'}</td>
                    <td style={tdStyle}>{fmtDate(d.effectiveDate)}</td>
                    <td style={tdStyle}>{fmtDate(d.endDate)}</td>
                    <td style={tdStyle}>{d.poNumber || '—'}</td>
                    <td style={tdStyle}>
                      {d.nonBillable
                        ? <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 11 }}>Non-Billable</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>Billable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};
