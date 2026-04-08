// client/src/components/inspector/InspectorFieldDetail.tsx
import { useState, useEffect } from 'react';
import { Button, Spin, Tag } from 'antd';
import { TableOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { FIELD_VERIFIER_API, type FieldEntry } from '../../types/fieldRegistry';

interface Props {
  field: FieldEntry;
  screenFile: string; // e.g. 'repairs' — used for deep-link to /verify
  onBack: () => void;
}

export function InspectorFieldDetail({ field, screenFile, onBack }: Props) {
  const [liveValue, setLiveValue] = useState('');
  const [liveError, setLiveError] = useState('');
  const [loadingValue, setLoadingValue] = useState(false);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-fetch live value when field changes
  useEffect(() => {
    setLiveValue('');
    setLiveError('');
    setPreviewColumns([]);
    setPreviewRows([]);
    setShowPreview(false);
    if (field.sqlQuery) fetchLiveValue();
  }, [field.id]);

  async function fetchLiveValue() {
    setLoadingValue(true);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/live-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: field.sqlQuery }),
      });
      const data = await res.json();
      if (data.error) setLiveError(data.error);
      else setLiveValue(data.value);
    } catch {
      setLiveError('Could not reach API');
    } finally {
      setLoadingValue(false);
    }
  }

  async function fetchPreviewRows() {
    setLoadingPreview(true);
    setShowPreview(true);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/preview-rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: field.sqlQuery }),
      });
      const data = await res.json();
      if (data.error) setPreviewError(data.error);
      else { setPreviewColumns(data.columns ?? []); setPreviewRows(data.rows ?? []); }
    } catch {
      setPreviewError('Could not reach API');
    } finally {
      setLoadingPreview(false);
    }
  }

  const statusColor = field.status === 'confirmed' ? 'green' : field.status === 'flagged' ? 'gold' : 'default';
  const deepLink = `/verify?screen=${encodeURIComponent(screenFile)}&field=${encodeURIComponent(field.id)}`;

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E74B5', fontSize: 12, padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ArrowLeftOutlined style={{ fontSize: 10 }} /> All fields
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1 }}>Field</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A202C' }}>{field.label}</div>
        </div>
        <Tag color={statusColor} style={{ marginTop: 4 }}>{field.status}</Tag>
      </div>

      {/* SQL Table */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>SQL Table</div>
        <code style={{ fontSize: 12, color: '#00257A', background: '#EEF2F8', padding: '2px 6px', borderRadius: 3 }}>
          {field.sqlTable || '—'}
        </code>
      </div>

      {/* SQL Query */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>SQL Query</div>
        <pre style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: 4, fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', color: '#1A202C', maxHeight: 100, overflowY: 'auto' }}>
          {field.sqlQuery || '(not set)'}
        </pre>
      </div>

      {/* API Endpoint */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>API Endpoint</div>
        <code style={{ fontSize: 12, color: '#2E74B5', background: '#EEF2F8', padding: '2px 6px', borderRadius: 3 }}>
          {field.apiEndpoint || '—'}
        </code>
        {field.responseProperty && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#8896AA' }}>→ <code style={{ fontSize: 11 }}>{field.responseProperty}</code></span>
        )}
      </div>

      {/* Live Value */}
      <div style={{ marginBottom: 12, padding: '10px 12px', background: '#F0F7FF', border: '1px solid #BFD6F6', borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: '#44697D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Live value from DB
          {!loadingValue && field.sqlQuery && (
            <button
              onClick={fetchLiveValue}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E74B5', fontSize: 10, marginLeft: 6, padding: 0 }}
            >
              Refresh
            </button>
          )}
        </div>
        {loadingValue ? (
          <Spin size="small" />
        ) : liveError ? (
          <span style={{ color: '#B71234', fontSize: 12 }}>{liveError}</span>
        ) : liveValue ? (
          <span style={{ fontSize: 22, fontWeight: 700, color: '#00257A' }}>{liveValue}</span>
        ) : (
          <span style={{ color: '#8896AA', fontSize: 12 }}>—</span>
        )}
      </div>

      {/* Sample rows toggle */}
      {field.sqlQuery && (
        <div style={{ marginBottom: 12 }}>
          <Button
            type="link"
            size="small"
            icon={<TableOutlined />}
            style={{ padding: 0, fontSize: 11, color: '#2E74B5' }}
            loading={loadingPreview}
            onClick={() => showPreview ? setShowPreview(false) : fetchPreviewRows()}
          >
            {showPreview ? 'Hide sample rows' : 'Show sample rows'}
          </Button>
          {showPreview && !loadingPreview && (
            <div style={{ marginTop: 6, overflowX: 'auto' }}>
              {previewError ? (
                <span style={{ color: '#B71234', fontSize: 11 }}>{previewError}</span>
              ) : previewRows.length === 0 ? (
                <span style={{ color: '#8896AA', fontSize: 11 }}>No rows</span>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {previewColumns.map(col => (
                        <th key={col} style={{ textAlign: 'left', padding: '2px 6px 2px 0', borderBottom: '2px solid #BFD6F6', color: '#00257A', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : '#EEF5FF' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '2px 6px 2px 0', fontFamily: 'monospace', color: cell === '(null)' ? '#8896AA' : '#1A202C', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {field.notes && (
        <div style={{ marginBottom: 12, padding: '6px 10px', background: '#FFF3CD', borderRadius: 4, fontSize: 11, color: '#856404' }}>
          {field.notes}
        </div>
      )}

      {/* Deep link to full verifier */}
      <a
        href={deepLink}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: '#2E74B5', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        Open in Field Verifier ↗
      </a>
    </div>
  );
}
