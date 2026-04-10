import { useState, useEffect } from 'react';
import { Button, Input, Spin, Tag, message } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined, LeftOutlined, RightOutlined, TableOutlined, SearchOutlined, LinkOutlined } from '@ant-design/icons';
import { FIELD_VERIFIER_API, type FieldEntry } from '../../types/fieldRegistry';
import './VerifierCard.css';

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
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [colResults, setColResults] = useState<{ tableName: string; columnName: string; dataType: string; sampleValue: string }[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [joinSql, setJoinSql] = useState('');
  const [joinColumns, setJoinColumns] = useState<string[]>([]);
  const [joinRows, setJoinRows] = useState<string[][]>([]);
  const [joinError, setJoinError] = useState('');
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

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
    setPreviewColumns([]);
    setPreviewRows([]);
    setPreviewError('');
    setShowPreview(false);
    setColSearch('');
    setColResults([]);
    setJoinSql('');
    setJoinColumns([]);
    setJoinRows([]);
    setJoinError('');
    setShowJoin(false);
    if (field.sqlQuery) fetchLiveValue(field.sqlQuery);
  }, [field.id]);

  async function fetchLiveValue(sql: string) {
    if (!sql) return;
    setLoadingValue(true);
    setLiveValue('');
    setLiveError('');
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/live-value`, {
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

  async function fetchPreviewRows() {
    if (!field.sqlQuery) return;
    setLoadingPreview(true);
    setPreviewColumns([]);
    setPreviewRows([]);
    setPreviewError('');
    setShowPreview(true);
    try {
      // Run the actual sqlQuery — it already targets the exact column(s) for this field
      const res = await fetch(`${FIELD_VERIFIER_API}/preview-rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: field.sqlQuery }),
      });
      const data = await res.json();
      if (data.error) setPreviewError(data.error);
      else {
        setPreviewColumns(data.columns ?? []);
        setPreviewRows(data.rows ?? []);
      }
    } catch {
      setPreviewError('Failed to reach API');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function searchColumns() {
    if (!colSearch.trim()) return;
    setLoadingCols(true);
    setColResults([]);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/ai-search-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: colSearch, table: editSqlTable || null }),
      });
      const data = await res.json();
      if (data.error) message.error(data.error);
      setColResults(data.columns ?? []);
    } catch {
      message.error('Failed to search columns');
    } finally {
      setLoadingCols(false);
    }
  }

  function useColumn(match: { tableName: string; columnName: string }) {
    setEditSqlTable(match.tableName);
    setEditSqlQuery(`SELECT TOP 5 ${match.columnName} FROM ${match.tableName} ORDER BY 1`);
    setColResults([]);
    setColSearch('');
    message.success(`Using ${match.tableName}.${match.columnName}`);
  }

  async function buildJoin() {
    setLoadingJoin(true);
    setJoinSql('');
    setJoinColumns([]);
    setJoinRows([]);
    setJoinError('');
    setShowJoin(true);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/build-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: field.sqlTable,
          currentSql: field.sqlQuery,
          fieldLabel: field.label,
        }),
      });
      const data = await res.json();
      if (data.error) { setJoinError(data.error); return; }
      setJoinSql(data.sql);
      setJoinColumns(data.columns ?? []);
      setJoinRows(data.rows ?? []);
    } catch {
      setJoinError('Failed to reach API');
    } finally {
      setLoadingJoin(false);
    }
  }

  async function useJoinSql() {
    await updateField({ sqlQuery: joinSql });
    setShowJoin(false);
    fetchLiveValue(joinSql);
    message.success('SQL updated — live value refreshed');
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
    await fetch(`${FIELD_VERIFIER_API}/field`, {
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
    <div className="vc-root">
      {/* Navigation */}
      <div className="vc-nav">
        <Button icon={<LeftOutlined />} size="small" disabled={fieldIndex === 0} onClick={() => onNavigate(fieldIndex - 1)}>Prev</Button>
        <span className="vc-nav-counter">{fieldIndex + 1} / {totalFields}</span>
        <Button icon={<RightOutlined />} size="small" disabled={fieldIndex === totalFields - 1} onClick={() => onNavigate(fieldIndex + 1)}>Next</Button>
      </div>

      {/* Card */}
      <div className="vc-card">
        {/* Header */}
        <div className="vc-card-header">
          <div>
            <div className="vc-field-label">Field Label</div>
            <div className="vc-field-name">{field.label}</div>
          </div>
          <Tag color={field.status === 'confirmed' ? 'green' : field.status === 'flagged' ? 'gold' : 'default'}>
            {field.status}
          </Tag>
        </div>

        {/* SQL */}
        <div className="vc-section-mb16">
          <div className="vc-section-label">SQL Query</div>
          {editing ? (
            <Input.TextArea
              value={editSqlQuery}
              onChange={e => setEditSqlQuery(e.target.value)}
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="SELECT ... FROM dbo.TableName WHERE ..."
            />
          ) : (
            <pre className={`vc-sql-pre ${field.sqlQuery ? 'vc-sql-pre--set' : 'vc-sql-pre--empty'}`}>
              {field.sqlQuery || '(no SQL set — click Edit to add)'}
            </pre>
          )}
        </div>

        {/* Live Value */}
        <div className="vc-section-mb8">
          <div className="vc-section-label">
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
            <span className="vc-live-error">{liveError}</span>
          ) : liveValue ? (
            <span className="vc-live-value">{liveValue}</span>
          ) : (
            <span className="vc-live-empty">
              {field.sqlQuery ? 'Click Refresh to load' : 'Add SQL query first'}
            </span>
          )}
        </div>

        {/* Build JOIN */}
        {!editing && field.sqlQuery && (
          <div className="vc-section-mb12">
            <Button
              icon={<LinkOutlined />}
              size="small"
              style={{ background: 'var(--amber-light)', borderColor: 'var(--amber)', color: 'var(--badge-amber-text)', fontSize: 11 }}
              onClick={showJoin ? () => setShowJoin(false) : buildJoin}
              loading={loadingJoin}
            >
              {showJoin ? 'Hide JOIN result' : 'Build JOIN — show real value'}
            </Button>

            {showJoin && !loadingJoin && (
              <div className="vc-join-panel">
                {joinError ? (
                  <div className="vc-join-error">{joinError}</div>
                ) : (
                  <>
                    <div className="vc-join-heading">
                      AI-generated JOIN SQL
                    </div>
                    <pre className="vc-join-pre">
                      {joinSql}
                    </pre>
                    {joinRows.length > 0 && (
                      <>
                        <div className="vc-join-result-heading">
                          Live result from production DB
                        </div>
                        <table className="vc-join-table">
                          <thead>
                            <tr>
                              {joinColumns.map(col => (
                                <th key={col} className="vc-join-th">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {joinRows.map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className={cell === '(null)' ? 'vc-join-td--null' : 'vc-join-td'}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    <div className="vc-join-actions">
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        style={{ background: 'var(--amber)', borderColor: 'var(--amber)' }}
                        onClick={useJoinSql}
                      >
                        Looks right — use this SQL
                      </Button>
                      <Button size="small" onClick={() => setShowJoin(false)}>Dismiss</Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sample Data */}
        <div className="vc-section-mb16">
          {currentSql && (
            <Button
              type="link"
              size="small"
              icon={<TableOutlined />}
              style={{ padding: '0 0', fontSize: 11, color: 'var(--primary)' }}
              onClick={() => showPreview && previewRows.length > 0 ? setShowPreview(false) : fetchPreviewRows()}
              loading={loadingPreview}
            >
              {showPreview ? 'Hide sample data' : 'Show sample data'}
            </Button>
          )}
          {showPreview && !loadingPreview && (
            <div className="vc-preview-panel">
              {previewError ? (
                <span className="vc-preview-error">{previewError}</span>
              ) : previewRows.length === 0 ? (
                <span className="vc-preview-empty">No rows returned</span>
              ) : (
                <>
                  <div className="vc-preview-heading">
                    Sample rows from DB
                  </div>
                  <table className="vc-preview-table">
                    <thead>
                      <tr>
                        {previewColumns.map(col => (
                          <th key={col} className="vc-preview-th">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--primary-light)' }}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={cell === '(null)' ? 'vc-preview-td--null' : 'vc-preview-td'}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>

        {/* Column search (edit mode) */}
        {editing && (
          <div className="vc-col-search">
            <div className="vc-col-search-heading">
              AI Column Search — describe what you're looking for
            </div>
            <Input.Search
              placeholder='e.g. "when we expect to deliver the repair" or "pending ship status"'
              value={colSearch}
              onChange={e => setColSearch(e.target.value)}
              onSearch={searchColumns}
              enterButton={<><SearchOutlined /> Search</>}
              loading={loadingCols}
              size="small"
            />
            {colSearch && editSqlTable && (
              <div className="vc-col-search-hint">
                Searching in <strong>{editSqlTable}</strong> — clear SQL Table field to search all tables
              </div>
            )}
            {colResults.length > 0 && (
              <div className="vc-col-results">
                {colResults.map((r, i) => (
                  <div key={i} className="vc-col-result-row">
                    <div className="vc-col-result-body">
                      <span className="vc-col-name">{r.columnName}</span>
                      <span className="vc-col-meta">{r.tableName} · {r.dataType}</span>
                      <div className="vc-col-sample">
                        Sample: {r.sampleValue}
                      </div>
                    </div>
                    <Button size="small" type="primary" ghost style={{ flexShrink: 0, fontSize: 11 }} onClick={() => useColumn(r)}>
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!loadingCols && colResults.length === 0 && colSearch && (
              <div className="vc-col-no-match">No matches yet — press Search</div>
            )}
          </div>
        )}

        {/* Edit form extras */}
        {editing && (
          <div className="vc-edit-grid">
            <div>
              <div className="vc-edit-field-label">SQL Table</div>
              <Input value={editSqlTable} onChange={e => setEditSqlTable(e.target.value)} size="small" />
            </div>
            <div>
              <div className="vc-edit-field-label">API Endpoint</div>
              <Input value={editApiEndpoint} onChange={e => setEditApiEndpoint(e.target.value)} size="small" />
            </div>
            <div>
              <div className="vc-edit-field-label">Response Property</div>
              <Input value={editResponseProperty} onChange={e => setEditResponseProperty(e.target.value)} size="small" />
            </div>
            <div>
              <div className="vc-edit-field-label">Notes</div>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} size="small" />
            </div>
          </div>
        )}

        {/* Flag note input */}
        {showFlagInput && (
          <div className="vc-flag-wrap">
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
        <div className="vc-actions">
          {editing ? (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSaveEdit} style={{ background: 'var(--navy)' }}>
                Save & Test
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm} style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
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
          <div className="vc-notes">
            Note: {field.notes}
          </div>
        )}

        {/* Meta */}
        {field.verifiedAt && (
          <div className="vc-meta">
            Last verified: {new Date(field.verifiedAt).toLocaleString()} by {field.verifiedBy}
          </div>
        )}
      </div>
    </div>
  );
}
