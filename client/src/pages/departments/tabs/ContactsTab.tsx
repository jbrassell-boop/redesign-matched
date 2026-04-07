import { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { getDepartmentContacts } from '../../../api/departments';
import type { DeptContact } from '../types';

interface ContactsTabProps {
  deptKey: number;
}

export const ContactsTab = ({ deptKey }: ContactsTabProps) => {
  const [contacts, setContacts] = useState<DeptContact[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return getDepartmentContacts(deptKey)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [deptKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentContacts(deptKey)
      .then(d => { if (!cancelled) setContacts(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--muted)' }}>
        Contacts from parent client account
      </div>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, width: 80 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => (
              <tr
                key={c.contactKey}
                style={{
                  borderBottom: i < contacts.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || '\u2014'}
                </td>
                <td style={tdStyle}>{c.phone || '\u2014'}</td>
                <td style={tdStyle}>{c.email || '\u2014'}</td>
                <td style={tdStyle}><StatusPill active={c.isActive} /></td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No contacts on record.
                </td>
              </tr>
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
