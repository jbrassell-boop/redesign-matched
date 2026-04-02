import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getClientFlags } from '../../../api/clients';
import type { ClientFlag } from '../types';

interface FlagsTabProps {
  clientKey: number;
}

export const FlagsTab = ({ clientKey }: FlagsTabProps) => {
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientFlags(clientKey)
      .then(data => { if (!cancelled) setFlags(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (flags.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No flags on record for this client.
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
              <th style={thStyle}>Flag Type</th>
              <th style={thStyle}>Flag</th>
              <th style={{ ...thStyle, width: 100 }}>Visible on DI</th>
              <th style={{ ...thStyle, width: 100 }}>Visible on Blank</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f, i) => (
              <tr
                key={f.flagKey}
                style={{
                  borderBottom: i < flags.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{f.flagType || '\u2014'}</td>
                <td style={tdStyle}>{f.flag || '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: f.visibleOnDI ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--neutral-100)',
                    color: f.visibleOnDI ? 'var(--primary)' : 'var(--muted)',
                  }}>
                    {f.visibleOnDI ? 'Yes' : 'No'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: f.visibleOnBlank ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--neutral-100)',
                    color: f.visibleOnBlank ? 'var(--primary)' : 'var(--muted)',
                  }}>
                    {f.visibleOnBlank ? 'Yes' : 'No'}
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
