import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getSupplierDocuments } from '../../../api/suppliers';
import type { SupplierDocument } from '../types';

interface DocumentsTabProps {
  supplierKey: number;
}

export const DocumentsTab = ({ supplierKey }: DocumentsTabProps) => {
  const [docs, setDocs] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSupplierDocuments(supplierKey)
      .then(data => { if (!cancelled) setDocs(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (docs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No documents uploaded for this supplier.
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Document Name</th>
              <th style={thStyle}>Uploaded Date</th>
              <th style={thStyle}>Document Type</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => (
              <tr
                key={doc.documentKey}
                style={{
                  borderBottom: i < docs.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{doc.documentName || '\u2014'}</td>
                <td style={tdStyle}>{doc.documentDate || '\u2014'}</td>
                <td style={tdStyle}>{doc.documentType || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '6px 8px',
        fontSize: 11,
        color: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  color: 'var(--text)',
};
