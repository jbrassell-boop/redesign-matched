import { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { getClientFlags, addClientFlag, updateClientFlag, deleteClientFlag } from '../../../api/clients';
import type { ClientFlag } from '../types';

interface FlagsTabProps {
  clientKey: number;
}

interface EditableFlag {
  flagKey: number;
  flagTypeKey: number;
  flagType: string;
  flag: string;
  visibleOnDI: boolean;
  visibleOnBlank: boolean;
  isNew?: boolean;
}

const emptyFlag = (): EditableFlag => ({
  flagKey: 0, flagTypeKey: 0, flagType: '', flag: '', visibleOnDI: false, visibleOnBlank: false, isNew: true,
});

export const FlagsTab = ({ clientKey }: FlagsTabProps) => {
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<EditableFlag | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getClientFlags(clientKey)
      .then(data => { setFlags(data); setEditingKey(null); setEditRow(null); })
      .finally(() => setLoading(false));
  }, [clientKey]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = () => {
    setEditRow(emptyFlag());
    setEditingKey(0);
  };

  const handleSave = async () => {
    if (!editRow) return;
    const payload = { flagTypeKey: editRow.flagTypeKey, flag: editRow.flag, visibleOnDI: editRow.visibleOnDI, visibleOnBlank: editRow.visibleOnBlank };
    if (editRow.isNew) {
      await addClientFlag(clientKey, payload);
    } else {
      await updateClientFlag(clientKey, editRow.flagKey, payload);
    }
    reload();
  };

  const handleDelete = async (flagKey: number) => {
    if (!confirm('Delete this flag?')) return;
    await deleteClientFlag(clientKey, flagKey);
    reload();
  };

  const handleRowClick = (f: ClientFlag) => {
    if (editingKey === f.flagKey) return;
    setEditingKey(f.flagKey);
    setEditRow({ ...f, flagTypeKey: 0, isNew: false });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={handleAdd} style={addBtnStyle}>+ Add Flag</button>
      </div>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Flag Type</th>
              <th style={thStyle}>Flag</th>
              <th style={{ ...thStyle, width: 100 }}>Visible on DI</th>
              <th style={{ ...thStyle, width: 120 }}>Visible on Blank</th>
              <th style={{ ...thStyle, width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {editRow?.isNew && (
              <tr style={{ borderBottom: '1px solid var(--neutral-200)', background: 'rgba(var(--primary-rgb), 0.04)' }}>
                <td style={tdStyle}><input style={inlineInput} placeholder="Flag Type" aria-label="Flag type" value={editRow.flagType} onChange={e => setEditRow({ ...editRow, flagType: e.target.value })} /></td>
                <td style={tdStyle}><input style={inlineInput} placeholder="Flag text" aria-label="Flag text" value={editRow.flag} onChange={e => setEditRow({ ...editRow, flag: e.target.value })} /></td>
                <td style={tdStyle}>
                  <input type="checkbox" checked={editRow.visibleOnDI} onChange={e => setEditRow({ ...editRow, visibleOnDI: e.target.checked })} />
                </td>
                <td style={tdStyle}>
                  <input type="checkbox" checked={editRow.visibleOnBlank} onChange={e => setEditRow({ ...editRow, visibleOnBlank: e.target.checked })} />
                </td>
                <td style={tdStyle}>
                  <button onClick={handleSave} style={actionBtn}>Save</button>
                  <button onClick={() => { setEditRow(null); setEditingKey(null); }} style={{ ...actionBtn, color: 'var(--muted)' }}>Cancel</button>
                </td>
              </tr>
            )}
            {flags.map((f, i) => {
              const isEditing = editingKey === f.flagKey && !editRow?.isNew;
              return (
                <tr
                  key={f.flagKey}
                  onClick={() => handleRowClick(f)}
                  style={{
                    borderBottom: i < flags.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                    background: isEditing ? 'rgba(var(--primary-rgb), 0.04)' : i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  {isEditing && editRow ? (
                    <>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{f.flagType || '\u2014'}</td>
                      <td style={tdStyle}><input style={inlineInput} value={editRow.flag} onChange={e => setEditRow({ ...editRow, flag: e.target.value })} /></td>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={editRow.visibleOnDI} onChange={e => setEditRow({ ...editRow, visibleOnDI: e.target.checked })} />
                      </td>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={editRow.visibleOnBlank} onChange={e => setEditRow({ ...editRow, visibleOnBlank: e.target.checked })} />
                      </td>
                      <td style={tdStyle}>
                        <button onClick={e => { e.stopPropagation(); handleSave(); }} style={actionBtn}>Save</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(f.flagKey); }} style={{ ...actionBtn, color: 'var(--danger)' }}>Del</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{f.flagType || '\u2014'}</td>
                      <td style={tdStyle}>{f.flag || '\u2014'}</td>
                      <td style={tdStyle}><TogglePill on={f.visibleOnDI} /></td>
                      <td style={tdStyle}><TogglePill on={f.visibleOnBlank} /></td>
                      <td style={tdStyle} />
                    </>
                  )}
                </tr>
              );
            })}
            {flags.length === 0 && !editRow?.isNew && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No flags on record.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TogglePill = ({ on }: { on: boolean }) => (
  <span style={{
    display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
    background: on ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--neutral-100)',
    color: on ? 'var(--primary)' : 'var(--muted)',
  }}>
    {on ? 'Yes' : 'No'}
  </span>
);

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

const inlineInput: React.CSSProperties = {
  width: '100%', padding: '3px 6px', fontSize: 12,
  border: '1px solid var(--neutral-200)', borderRadius: 3,
  outline: 'none', background: 'var(--card)',
};

const addBtnStyle: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--primary)', borderRadius: 4,
  background: 'transparent', color: 'var(--primary)',
};

const actionBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: 'none', borderRadius: 3, background: 'transparent', color: 'var(--primary)',
};
