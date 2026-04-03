import { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { getClientContacts, addClientContact, updateClientContact, setClientPrimaryContact, deleteClientContact } from '../../../api/clients';
import type { ClientContact } from '../types';

interface ContactsTabProps {
  clientKey: number;
}

const emptyContact = (): Partial<ClientContact> & { isNew?: boolean } => ({
  contactKey: 0, firstName: '', lastName: '', phone: '', fax: '', email: '', isActive: true, isNew: true,
});

export const ContactsTab = ({ clientKey }: ContactsTabProps) => {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Partial<ClientContact> & { isNew?: boolean } | null>(null);
  const [primaryKey, setPrimaryKey] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getClientContacts(clientKey)
      .then(data => { setContacts(data); setEditingKey(null); setEditRow(null); })
      .finally(() => setLoading(false));
  }, [clientKey]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = () => {
    const row = emptyContact();
    setEditRow(row);
    setEditingKey(0);
  };

  const handleSaveRow = async () => {
    if (!editRow) return;
    const payload = { firstName: editRow.firstName ?? '', lastName: editRow.lastName ?? '', phone: editRow.phone ?? undefined, fax: editRow.fax ?? undefined, email: editRow.email ?? undefined };
    if (editRow.isNew) {
      await addClientContact(clientKey, payload);
    } else {
      await updateClientContact(clientKey, editRow.contactKey!, payload);
    }
    reload();
  };

  const handleSetPrimary = async (contactKey: number) => {
    await setClientPrimaryContact(clientKey, contactKey);
    setPrimaryKey(contactKey);
  };

  const handleDelete = async (contactKey: number) => {
    if (!confirm('Delete this contact?')) return;
    await deleteClientContact(clientKey, contactKey);
    reload();
  };

  const handleRowClick = (c: ClientContact) => {
    if (editingKey === c.contactKey) return;
    setEditingKey(c.contactKey);
    setEditRow({ ...c });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={handleAdd} style={addBtnStyle}>+ Add Contact</button>
      </div>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Fax</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, width: 50, textAlign: 'center' }}>Primary</th>
              <th style={{ ...thStyle, width: 80 }}>Status</th>
              <th style={{ ...thStyle, width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {editRow?.isNew && (
              <tr style={{ borderBottom: '1px solid var(--neutral-200)', background: 'rgba(var(--primary-rgb), 0.04)' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input style={inlineInput} placeholder="First" value={editRow.firstName ?? ''} onChange={e => setEditRow({ ...editRow, firstName: e.target.value })} />
                    <input style={inlineInput} placeholder="Last" value={editRow.lastName ?? ''} onChange={e => setEditRow({ ...editRow, lastName: e.target.value })} />
                  </div>
                </td>
                <td style={tdStyle}><input style={inlineInput} value={editRow.phone ?? ''} onChange={e => setEditRow({ ...editRow, phone: e.target.value })} /></td>
                <td style={tdStyle}><input style={inlineInput} value={editRow.fax ?? ''} onChange={e => setEditRow({ ...editRow, fax: e.target.value })} /></td>
                <td style={tdStyle}><input style={inlineInput} value={editRow.email ?? ''} onChange={e => setEditRow({ ...editRow, email: e.target.value })} /></td>
                <td style={tdStyle} />
                <td style={tdStyle} />
                <td style={tdStyle}>
                  <button onClick={handleSaveRow} style={actionBtn}>Save</button>
                  <button onClick={() => { setEditRow(null); setEditingKey(null); }} style={{ ...actionBtn, color: 'var(--muted)' }}>Cancel</button>
                </td>
              </tr>
            )}
            {contacts.map((c, i) => {
              const isEditing = editingKey === c.contactKey && !editRow?.isNew;
              const isPrimary = primaryKey === c.contactKey;
              return (
                <tr
                  key={c.contactKey}
                  onClick={() => handleRowClick(c)}
                  style={{
                    borderBottom: i < contacts.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                    background: isEditing ? 'rgba(var(--primary-rgb), 0.04)' : i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  {isEditing && editRow ? (
                    <>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input style={inlineInput} value={editRow.firstName ?? ''} onChange={e => setEditRow({ ...editRow, firstName: e.target.value })} />
                          <input style={inlineInput} value={editRow.lastName ?? ''} onChange={e => setEditRow({ ...editRow, lastName: e.target.value })} />
                        </div>
                      </td>
                      <td style={tdStyle}><input style={inlineInput} value={editRow.phone ?? ''} onChange={e => setEditRow({ ...editRow, phone: e.target.value })} /></td>
                      <td style={tdStyle}><input style={inlineInput} value={editRow.fax ?? ''} onChange={e => setEditRow({ ...editRow, fax: e.target.value })} /></td>
                      <td style={tdStyle}><input style={inlineInput} value={editRow.email ?? ''} onChange={e => setEditRow({ ...editRow, email: e.target.value })} /></td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); handleSetPrimary(c.contactKey); }} style={{ ...actionBtn, fontSize: 16 }} title="Set as primary">
                          {isPrimary ? '\u2605' : '\u2606'}
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <StatusPill active={c.isActive} />
                      </td>
                      <td style={tdStyle}>
                        <button onClick={e => { e.stopPropagation(); handleSaveRow(); }} style={actionBtn}>Save</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(c.contactKey); }} style={{ ...actionBtn, color: 'var(--danger)' }}>Del</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '\u2014'}</td>
                      <td style={tdStyle}>{c.phone || '\u2014'}</td>
                      <td style={tdStyle}>{c.fax || '\u2014'}</td>
                      <td style={tdStyle}>{c.email || '\u2014'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 16, color: isPrimary ? 'var(--amber)' : 'var(--neutral-200)' }}>
                        {isPrimary ? '\u2605' : '\u2606'}
                      </td>
                      <td style={tdStyle}><StatusPill active={c.isActive} /></td>
                      <td style={tdStyle} />
                    </>
                  )}
                </tr>
              );
            })}
            {contacts.length === 0 && !editRow?.isNew && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No contacts on record.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatusPill = ({ active }: { active: boolean }) => (
  <span style={{
    display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
    background: active ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
    border: `1px solid ${active ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
    color: active ? 'var(--success)' : 'var(--muted)',
  }}>
    {active ? 'Active' : 'Inactive'}
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
