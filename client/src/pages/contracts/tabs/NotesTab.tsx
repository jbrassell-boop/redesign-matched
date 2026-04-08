import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getContractNotes } from '../../../api/contracts';
import type { ContractNote } from '../types';
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

export const NotesTab = ({ contractKey }: { contractKey: number }) => {
  const [notes, setNotes] = useState<ContractNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractNotes(contractKey)
      .then(n => { if (!cancelled) setNotes(n); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract notes'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Contract Notes ({notes.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {notes.length === 0 ? (
            <div style={emptyStateStyle}>No notes for this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Author</th>
                  <th style={thStyle}>Note</th>
                </tr>
              </thead>
              <tbody>
                {notes.map(n => (
                  <tr key={n.noteKey}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(n.noteDate)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: 600 }}>{n.author}</td>
                    <td style={tdStyle}>{n.note}</td>
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
