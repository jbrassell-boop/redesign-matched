import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import apiClient from '../../../api/client';

interface MaxChargeItem {
  scopeTypeKey: number;
  model: string;
  type: string;
  manufacturer: string;
  category: string;
  maxCharge: number;
}

interface Props {
  deptKey: number;
}

const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MaxChargesTab = ({ deptKey }: Props) => {
  const [items, setItems] = useState<MaxChargeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/departments/${deptKey}/max-charges`)
      .then(r => setItems(r.data))
      .catch(() => message.error('Failed to load max charges'))
      .finally(() => setLoading(false));
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
          Model Max Charges
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
            {items.length} {items.length === 1 ? 'model' : 'models'}
          </span>
        </div>
        <button
          onClick={() => message.info('Add max charge — select scope model and set maximum repair charge')}
          style={{
            height: 28, padding: '0 12px', fontSize: 11, fontWeight: 700,
            background: 'var(--navy)', color: 'var(--card)', border: 'none',
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No max charges on record for this department.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--neutral-50)' }}>
                <th style={thStyle}>Model</th>
                <th style={{ ...thStyle, width: 80 }}>Type</th>
                <th style={{ ...thStyle, width: 120 }}>Manufacturer</th>
                <th style={{ ...thStyle, width: 120 }}>Category</th>
                <th style={{ ...thStyle, width: 110, textAlign: 'right' }}>Max Charge</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.scopeTypeKey} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : undefined }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--navy)' }}>{item.model || '—'}</td>
                  <td style={tdStyle}>{item.type || '—'}</td>
                  <td style={tdStyle}>{item.manufacturer || '—'}</td>
                  <td style={tdStyle}>{item.category || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{fmt$(item.maxCharge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  color: 'var(--muted)', letterSpacing: '.04em', textAlign: 'left',
  borderBottom: '1px solid var(--neutral-200)',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px', borderBottom: '1px solid var(--neutral-100)', fontSize: 12,
};
