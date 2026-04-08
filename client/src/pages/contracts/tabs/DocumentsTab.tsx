import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractDocuments } from '../../../api/contracts';
import type { ContractDocument } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingStyle,
  tableContainerStyle, tableStyle, thStyle, tdStyle, inlineFlexIconStyle, fmtDate,
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

export const DocumentsTab = ({ contractKey }: { contractKey: number }) => {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractDocuments(contractKey)
      .then(d => { if (!cancelled) setDocs(d); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract documents'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const fileIcon = (name: string) => {
    const lower = name.toLowerCase();
    const color = lower.endsWith('.pdf') ? 'var(--danger)'
      : lower.endsWith('.xlsx') || lower.endsWith('.xls') ? 'var(--success)'
      : 'var(--primary)';
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4, flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Documents ({docs.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {docs.length === 0 ? (
            <div style={emptyStateStyle}>No documents attached</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.documentKey}>
                    <td style={tdStyle}>
                      <span style={inlineFlexIconStyle}>
                        {fileIcon(d.fileName || d.documentName)}
                        {d.documentName}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(d.documentDate)}</td>
                    <td style={tdStyle}>{d.categoryType || '—'}</td>
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
