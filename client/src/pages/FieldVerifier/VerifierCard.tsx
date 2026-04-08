import { useState, useEffect } from 'react';
import { Button, Input, Spin, Tag, message } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined, LeftOutlined, RightOutlined, TableOutlined } from '@ant-design/icons';
import type { FieldEntry } from './index';

const API = 'http://localhost:5000/api/field-verifier';

interface Props {
  screenFile: string;
  field: FieldEntry;
  fieldIndex: number;
  totalFields: number;
  onUpdate: (updated: FieldEntry) => void;
  onNavigate: (index: number) => void;
}

export function VerifierCard({ screenFile, field, fieldIndex, totalFields, onUpdate, onNavigate }: Props) {
  const [liveValue, setLiveValue] = useState<string>('');
  const [liveError, setLiveError] = useState<string>('');
  const [loadingValue, setLoadingValue] = useState(false);
  const [editing, setEditing] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [editSqlQuery, setEditSqlQuery] = useState(field.sqlQuery);
  const [editSqlTable, setEditSqlTable] = useState(field.sqlTable);
  const [editApiEndpoint, setEditApiEndpoint] = useState(field.apiEndpoint);
  const [editResponseProperty, setEditResponseProperty] = useState(field.responseProperty);
  const [editNotes, setEditNotes] = useState(field.notes);

  useEffect(() => {
    setEditSqlQuery(field.sqlQuery);
    setEditSqlTable(field.sqlTable);
    setEditApiEndpoint(field.apiEndpoint);
    setEditResponseProperty(field.responseProperty);
    setEditNotes(field.notes);
    setEditing(false);
    setShowFlagInput(false);
    setLiveValue('');
    setLiveError('');
    setPreviewRows([]);
    setPreviewError('');
    setShowPreview(false);
    if (field.sqlQuery) fetchLiveValue(field.sqlQuery);
  }, [field.id]);

  async function fetchLiveValue(sql: string) {
    if (!sql) return;
    setLoadingValue(true);
    setLiveValue('');
    setLiveError('');
    try {
      const res = await fetch(`${API}/live-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: sql }),
      });
      const data = await res.json();
      if (data.error) setLiveError(data.error);
      else setLiveValue(data.value);
    } catch {
      setLiveError('Failed to reach API');
    } finally {
      setLoadingValue(false);
    }
  }

  async function fetchPreviewRows(sql: string) {
    if (!sql) return;
    setLoadingPreview(true);
    setPreviewRows([]);
    setPreviewError('');
    setShowPreview(true);
    try {
      const res = await fetch(`${API}/preview-rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: sql }),
      });
      const data = await res.json();
      if (data.error) setPreviewError(data.error);
      else setPreviewRows(data.rows ?? []);
    } catch {
      setPreviewError('Failed to reach API');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function updateField(patch: Partial<FieldEntry>) {
    const updated = { ...field, ...patch };
    const body = {
      screenFile,
      fieldId: field.id,
      status: updated.status,
      sqlQuery: updated.sqlQuery,
      sqlTable: updated.sqlTable,
      apiEndpoint: updated.apiEndpoint,
      responseProperty: updated.responseProperty,
      notes: updated.notes,
      verifiedBy: 'Joe',
    };
    await fetch(`${API}/field`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate({ ...updated, verifiedAt: new Date().toISOString(), verifiedBy: 'Joe' });
  }

  async function handleConfirm() {
    await updateField({ status: 'confirmed' });
    message.success('Confirmed!');
  }

  async function handleFlag() {
    if (!showFlagInput) { setShowFlagInput(true); return; }
    await updateField({ status: 'flagged', notes: flagNote });
    setShowFlagInput(false);
    message.warning('Flagged');
  }

  async function handleSaveEdit() {
    const patch: Partial<FieldEntry> = {
      sqlQuery: editSqlQuery,
      sqlTable: editSqlTable,
      apiEndpoint: editApiEndpoint,
      responseProperty: editResponseProperty,
      notes: editNotes,
    };
    await updateField(patch);
    setEditing(false);
    if (editSqlQuery) fetchLiveValue(editSqlQuery);
    message.success('Saved');
  }

  const currentSql = editing ? editSqlQuery : field.sqlQuery;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Button icon={<LeftOutlined />} size="small" disabled={fieldIndex === 0} onClick={() => onNavigate(fieldIndex - 1)}>Prev</Button>
        <span style={{ fontSize: 12, color: '#8896AA' }}>{fieldIndex + 1} / {totalFields}</span>
        <Button icon={<RightOutlined />} size="small" disabled={fieldIndex === totalFields - 1} onClick={() => onNavigate(fieldIndex + 1)}>Next</Button>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #DDE3EE', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1 }}>Field Label</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>{field.label}</div>
          </div>
          <Tag color={field.status === 'confirmed' ? 'green' : field.status === 'flagged' ? 'gold' : 'default'}>
            {field.status}
          </Tag>
        </div>

        {/* SQL */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>SQL Query</div>
          {editing ? (
            <Input.TextArea
              value={editSqlQuery}
              onChange={e => setEditSqlQuery(e.target.value)}
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="SELECT ... FROM dbo.TableName WHERE ..."
            />
          ) : (
            <pre style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', color: field.sqlQuery ? '#1A202C' : '#8896AA' }}>
              {field.sqlQuery || '(no SQL set — click Edit to add)'}
            </pre>
          )}
        </div>

        {/* Live Value */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Live Value
            {currentSql && !editing && (
              <Button type="link" size="small" style={{ padding: '0 4px', fontSize: 11 }} onClick={() => fetchLiveValue(field.sqlQuery)}>
                Refresh
              </Button>
            )}
          </div>
          {loadingValue ? (
            <Spin size="small" />
          ) : liveError ? (
            <span style={{ color: '#B71234', fontSize: 13 }}>{liveError}</span>
          ) : liveValue ? (
            <span style={{ fontSize: 24, fontWeight: 700, color: '#00257A' }}>{liveValue}</span>
          ) : (
            <span style={{ color: '#8896AA', fontSize: 13 }}>
              {field.sqlQuery ? 'Click Refresh to load' : 'Add SQL query first'}
            </span>
          )}
        </div>

        {/* Sample Data */}
        <div style={{ marginBottom: 16 }}>
          {currentSql && (
            <Button
              type="link"
              size="small"
              icon={<TableOutlined />}
              style={{ padding: '0 0', fontSize: 11, color: '#2E74B5' }}
              onClick={() => showPreview && previewRows.length > 0 ? setShowPreview(false) : fetchPreviewRows(editing ? editSqlQuery : field.sqlQuery)}
              loading={loadingPreview}
            >
              {showPreview ? 'Hide sample data' : 'Show sample data'}
            </Button>
          )}
          {showPreview && !loadingPreview && (
            <div style={{ marginTop: 8, background: '#F0F7FF', border: '1px solid #BFD6F6', borderRadius: 4, padding: '8px 10px' }}>
              {previewError ? (
                <span style={{ color: '#B71234', fontSize: 12 }}>{previewError}</span>
              ) : previewRows.length === 0 ? (
                <span style={{ color: '#8896AA', fontSize: 12 }}>No rows returned</span>
              ) : (
                <>
                  <div style={{ fontSize: 10, color: '#44697D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    Sample rows from DB
                  </div>
                  {previewRows.map((row, i) => (
                    <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: '#1A202C', padding: '2px 0', borderBottom: i < previewRows.length - 1 ? '1px solid #DDE6F5' : 'none' }}>
                      {row}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Edit form extras */}
        {editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>SQL Table</div>
              <Input value={editSqlTable} onChange={e => setEditSqlTable(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>API Endpoint</div>
              <Input value={editApiEndpoint} onChange={e => setEditApiEndpoint(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>Response Property</div>
              <Input value={editResponseProperty} onChange={e => setEditResponseProperty(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>Notes</div>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} size="small" />
            </div>
          </div>
        )}

        {/* Flag note input */}
        {showFlagInput && (
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="What's wrong with this field?"
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              onPressEnter={handleFlag}
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {editing ? (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSaveEdit} style={{ background: '#00257A' }}>
                Save & Test
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm} style={{ background: '#16A34A', borderColor: '#16A34A' }}>
                {field.status === 'confirmed' ? 'Re-verify' : 'Confirm'}
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleFlag} danger>
                {showFlagInput ? 'Submit Flag' : 'Flag'}
              </Button>
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )}
        </div>

        {/* Notes display */}
        {field.notes && !editing && (
          <div style={{ marginTop: 12, padding: 8, background: '#FFF3CD', borderRadius: 4, fontSize: 12, color: '#856404' }}>
            Note: {field.notes}
          </div>
        )}

        {/* Meta */}
        {field.verifiedAt && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#8896AA' }}>
            Last verified: {new Date(field.verifiedAt).toLocaleString()} by {field.verifiedBy}
          </div>
        )}
      </div>
    </div>
  );
}
