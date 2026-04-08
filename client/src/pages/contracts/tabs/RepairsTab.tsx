import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractRepairs } from '../../../api/contracts';
import type { ContractRepair } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingStyle,
  tableContainerStyle, tableStyle, thStyle, tdStyle,
  fmtDate, fmtMoneyDecimal, repairStatusColor,
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

export const RepairsTab = ({ contractKey }: { contractKey: number }) => {
  const [repairs, setRepairs] = useState<ContractRepair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractRepairs(contractKey)
      .then(r => { if (!cancelled) setRepairs(r); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract repairs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Repair History ({repairs.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {repairs.length === 0 ? (
            <div style={emptyStateStyle}>No repairs found for this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>W.O. #</th>
                  <th style={thStyle}>Serial #</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Date In</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                  <th style={thStyle}>Tech</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map(r => (
                  <tr key={r.repairKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{r.wo || '—'}</td>
                    <td style={tdStyle}>{r.serialNumber || '—'}</td>
                    <td style={tdStyle}>{r.model || '—'}</td>
                    <td style={tdStyle}>{r.repairType || '—'}</td>
                    <td style={tdStyle}>{fmtDate(r.dateIn)}</td>
                    <td style={tdStyle}><span style={{ color: repairStatusColor(r.status), fontWeight: 600 }}>{r.status || '—'}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(r.cost)}</td>
                    <td style={tdStyle}>{r.tech || '—'}</td>
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
