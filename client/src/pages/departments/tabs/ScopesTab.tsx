import { useState, useEffect, useMemo } from 'react';
import { Spin, message, Modal } from 'antd';
import { getDepartmentScopes, addDeptScope } from '../../../api/departments';
import { getScopeTypes, type LookupOption } from '../../../api/lookups';
import type { DepartmentScope } from '../types';

interface ScopesTabProps {
  deptKey: number;
  onScopeClick: (scopeKey: number) => void;
}

export const ScopesTab = ({ deptKey, onScopeClick }: ScopesTabProps) => {
  const [scopes, setScopes]         = useState<DepartmentScope[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [addOpen, setAddOpen]       = useState(false);
  const [scopeTypes, setScopeTypes] = useState<LookupOption[]>([]);
  const [serial, setSerial]         = useState('');
  const [typeKey, setTypeKey]       = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);

  const reload = () => {
    setLoading(true);
    getDepartmentScopes(deptKey)
      .then(data => setScopes(data))
      .catch(() => message.error('Failed to load scopes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [deptKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setSerial('');
    setTypeKey(null);
    setAddOpen(true);
    if (scopeTypes.length === 0) {
      getScopeTypes()
        .then(setScopeTypes)
        .catch(() => message.error('Failed to load scope types'));
    }
  };

  const handleAdd = async () => {
    if (!serial.trim() && !typeKey) {
      message.error('Enter a serial number or select a scope type');
      return;
    }
    setSaving(true);
    try {
      await addDeptScope(deptKey, { serialNumber: serial || null, scopeTypeKey: typeKey });
      message.success('Scope added');
      setAddOpen(false);
      reload();
    } catch {
      message.error('Failed to add scope');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return scopes;
    const q = search.toLowerCase();
    return scopes.filter(s =>
      s.serialNumber.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.manufacturer.toLowerCase().includes(q)
    );
  }, [scopes, search]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Search model, serial..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 240, padding: '5px 10px', fontSize: 12,
            border: '1px solid var(--neutral-200)', borderRadius: 4,
            outline: 'none', background: 'var(--card)', color: 'var(--text)',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} of {scopes.length} scopes
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={openAdd}
          style={{
            height: 28, padding: '0 12px', fontSize: 11, fontWeight: 700,
            background: 'var(--navy)', color: '#fff', border: 'none',
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          + Add Scope
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {scopes.length === 0 ? 'No scopes on record for this department.' : 'No scopes match your search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(s => (
            <div
              key={s.scopeKey}
              onClick={() => onScopeClick(s.scopeKey)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--card)',
                border: '1px solid var(--neutral-200)', borderRadius: 6,
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light, #dbeafe)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Type badge */}
                <span style={{
                  width: 28, height: 28, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: s.type === 'F' || s.type === 'Flexible' ? 'rgba(var(--success-rgb), 0.1)' :
                              s.type === 'R' || s.type === 'Rigid' ? 'rgba(var(--primary-rgb), 0.1)' :
                              s.type === 'I' || s.type === 'Instrument' ? 'rgba(var(--amber-rgb), 0.1)' :
                              'var(--neutral-100)',
                  color: s.type === 'F' || s.type === 'Flexible' ? 'var(--success)' :
                         s.type === 'R' || s.type === 'Rigid' ? 'var(--primary)' :
                         s.type === 'I' || s.type === 'Instrument' ? 'var(--amber)' :
                         'var(--muted)',
                }}>
                  {(s.type || '?')[0]}
                </span>
                {/* Model — SN# */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    {s.model || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    SN# {s.serialNumber || '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.manufacturer || ''}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.category || ''}</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ width: 14, height: 14, opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Scope modal */}
      <Modal
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>Add Scope</span>}
        width={400}
        footer={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 }}>
              Serial Number
            </div>
            <input
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="Enter serial number"
              style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 3, padding: '0 8px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 }}>
              Scope Type
            </div>
            <select
              value={typeKey ?? ''}
              onChange={e => setTypeKey(Number(e.target.value) || null)}
              style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 3, padding: '0 8px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="">— select scope type —</option>
              {scopeTypes.map(st => <option key={st.key} value={st.key}>{st.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button onClick={() => setAddOpen(false)} style={{ height: 30, padding: '0 14px', fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving} style={{ height: 30, padding: '0 18px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Adding…' : 'Add Scope'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
