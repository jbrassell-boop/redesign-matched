import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDepartmentScopes } from '../../../api/departments';
import type { DepartmentScope } from '../types';

interface InstrumentsTabProps {
  deptKey: number;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

export const InstrumentsTab = ({ deptKey }: InstrumentsTabProps) => {
  const [instruments, setInstruments] = useState<DepartmentScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentScopes(deptKey)
      .then(data => {
        if (cancelled) return;
        // Instruments have type 'I' or category containing 'Instrument'
        const filtered = data.filter(s =>
          s.type === 'I' ||
          s.category?.toLowerCase().includes('instrument') ||
          s.type?.toLowerCase().includes('instrument')
        );
        setInstruments(filtered);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  }

  if (instruments.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No instruments on record for this department.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
        {instruments.length} instrument{instruments.length !== 1 ? 's' : ''}
      </div>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Serial Number</th>
              <th style={thStyle}>Model</th>
              <th style={thStyle}>Manufacturer</th>
              <th style={thStyle}>Category</th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((s, i) => (
              <tr
                key={s.scopeKey}
                style={{
                  borderBottom: i < instruments.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{s.serialNumber || '\u2014'}</td>
                <td style={tdStyle}>{s.model || '\u2014'}</td>
                <td style={tdStyle}>{s.manufacturer || '\u2014'}</td>
                <td style={tdStyle}>{s.category || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
