import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getScopeModelMaxCharges } from '../../../api/scopeModels';
import type { ScopeTypeDeptMaxCharge } from '../types';

interface Props {
  scopeTypeKey: number;
}

export const MaxChargesTab = ({ scopeTypeKey }: Props) => {
  const [items, setItems] = useState<ScopeTypeDeptMaxCharge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getScopeModelMaxCharges(scopeTypeKey)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) { message.error('Failed to load data'); setItems([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scopeTypeKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="small" /></div>;

  if (items.length === 0) {
    return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No department max charges configured for this model</div>;
  }

  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
          color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em',
          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Department Max Charges</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{items.length} entries</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={thStyle}>Client</th>
              <th style={thStyle}>Department</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'right' }}>Max Charge</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.departmentKey} style={{ cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
              >
                <td style={tdStyle}>{item.clientName || '\u2014'}</td>
                <td style={tdStyle}>{item.departmentName || '\u2014'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--navy)' }}>
                  {item.maxCharge != null ? `$${item.maxCharge.toFixed(2)}` : '\u2014'}
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
  background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600,
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left',
  borderBottom: '1px solid var(--neutral-200)',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11,
};
