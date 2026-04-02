import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getClientContacts } from '../../../api/clients';
import type { ClientContact } from '../types';

interface ContactsTabProps {
  clientKey: number;
}

export const ContactsTab = ({ clientKey }: ContactsTabProps) => {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientContacts(clientKey)
      .then(data => { if (!cancelled) setContacts(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (contacts.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No contacts on record for this client.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Fax</th>
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
                <td style={tdStyle}>{c.fax || '\u2014'}</td>
                <td style={tdStyle}>{c.email || '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: c.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                    border: `1px solid ${c.isActive ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
                    color: c.isActive ? 'var(--success)' : 'var(--muted)',
                  }}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
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
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--text)',
};
