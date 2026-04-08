import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractAffiliates } from '../../../api/contracts';
import type { ContractAffiliate } from '../types';
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

export const AffiliatesTab = ({ contractKey }: { contractKey: number }) => {
  const [affiliates, setAffiliates] = useState<ContractAffiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractAffiliates(contractKey)
      .then(a => { if (!cancelled) setAffiliates(a); })
      .catch(() => { if (!cancelled) message.error('Failed to load affiliates'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Affiliated Facilities ({affiliates.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {affiliates.length === 0 ? (
            <div style={emptyStateStyle}>No affiliates linked to this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Start Date</th>
                  <th style={thStyle}>End Date</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map(a => (
                  <tr key={a.affiliateKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{a.departmentName || '—'}</td>
                    <td style={tdStyle}>{a.clientName || '—'}</td>
                    <td style={tdStyle}>{fmtDate(a.startDate)}</td>
                    <td style={tdStyle}>{fmtDate(a.endDate)}</td>
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
