import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractScopes } from '../../../api/contracts';
import type { ContractScope } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingStyle,
  tableContainerShortStyle, tableStyle, miniStatStripStyle,
  miniStatCardStyle, miniStatLabelStyle, thStyle, tdStyle,
  fmtDate, fmtMoneyDecimal,
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

export const ScopesTab = ({ contractKey }: { contractKey: number }) => {
  const [scopes, setScopes] = useState<ContractScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractScopes(contractKey)
      .then(s => { if (!cancelled) setScopes(s); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract scopes'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const countFlex = scopes.filter(s => s.rigidOrFlexible === 'F').length;
  const countRigid = scopes.filter(s => s.rigidOrFlexible === 'R').length;

  return (
    <div style={tabPaddingStyle}>
      <div style={miniStatStripStyle}>
        {[
          { label: 'Total', value: scopes.length, color: 'var(--navy)' },
          { label: 'Flexible', value: countFlex, color: 'var(--primary)' },
          { label: 'Rigid', value: countRigid, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={miniStatCardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={miniStatLabelStyle}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Covered Scopes ({scopes.length})</span></PanelHead>
        <div style={tableContainerShortStyle}>
          {scopes.length === 0 ? (
            <div style={emptyStateStyle}>No scopes assigned to this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Serial #</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Manufacturer</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Effective</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {scopes.map(s => (
                  <tr key={s.contractScopeKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{s.serialNumber || '—'}</td>
                    <td style={tdStyle}>{s.model || '—'}</td>
                    <td style={tdStyle}>{s.manufacturer || '—'}</td>
                    <td style={tdStyle}>{s.rigidOrFlexible === 'F' ? 'Flexible' : s.rigidOrFlexible === 'R' ? 'Rigid' : s.rigidOrFlexible || '—'}</td>
                    <td style={tdStyle}>{fmtDate(s.scopeAdded)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.cost > 0 ? fmtMoneyDecimal(s.cost) : '—'}</td>
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
