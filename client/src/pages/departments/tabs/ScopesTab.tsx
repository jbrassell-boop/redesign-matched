import { useState, useEffect, useMemo } from 'react';
import { Spin, message, Modal } from 'antd';
import { getDepartmentScopes, addDeptScope } from '../../../api/departments';
import { getScopeTypes, type LookupOption } from '../../../api/lookups';
import type { DepartmentScope } from '../types';
import './ScopesTab.css';

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

  useEffect(() => {
    reload();
  }, [deptKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loading) return <div className="sct-loading"><Spin /></div>;

  return (
    <div className="sct-container">
      {/* Toolbar */}
      <div className="sct-toolbar">
        <input
          placeholder="Search model, serial..."
          aria-label="Search scopes by model or serial number"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sct-search"
        />
        <span className="sct-count">
          {filtered.length} of {scopes.length} scopes
        </span>
        <div className="sct-spacer" />
        <button onClick={openAdd} className="sct-add-btn">
          + Add Scope
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="sct-empty">
          {scopes.length === 0 ? 'No scopes on record for this department.' : 'No scopes match your search.'}
        </div>
      ) : (
        <div className="sct-list">
          {filtered.map(s => (
            <div
              key={s.scopeKey}
              onClick={() => onScopeClick(s.scopeKey)}
              className="sct-card scope-card-hover"
            >
              <div className="sct-card-left">
                {/* Type badge — bg/color dynamic on scope type */}
                <span className="sct-type-badge" style={{
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
                  <div className="sct-model">{s.model || '—'}</div>
                  <div className="sct-serial">SN# {s.serialNumber || '—'}</div>
                </div>
              </div>
              <div className="sct-card-right">
                <div className="sct-right-info">
                  <div className="sct-right-text">{s.manufacturer || ''}</div>
                  <div className="sct-right-text">{s.category || ''}</div>
                </div>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" className="sct-chevron">
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
        title={<span className="sct-modal-title">Add Scope</span>}
        width={400}
        footer={null}
      >
        <div className="sct-modal-body">
          <div>
            <div className="sct-modal-label">Serial Number</div>
            <input
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="Enter serial number"
              aria-label="Scope serial number"
              className="sct-modal-input"
            />
          </div>
          <div>
            <div className="sct-modal-label">Scope Type</div>
            <select
              value={typeKey ?? ''}
              onChange={e => setTypeKey(Number(e.target.value) || null)}
              className="sct-modal-input"
            >
              <option value="">— select scope type —</option>
              {scopeTypes.map(st => <option key={st.key} value={st.key}>{st.name}</option>)}
            </select>
          </div>
          <div className="sct-modal-footer">
            <button onClick={() => setAddOpen(false)} className="sct-cancel-btn">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="sct-save-btn">
              {saving ? 'Adding…' : 'Add Scope'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
