import { useState, useEffect, useCallback } from 'react';
import { Spin, message, Popconfirm } from 'antd';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar, DevNotice } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import {
  getPendingContractScopes, getAvailablePendingContractScopes,
  addPendingContractScope, deletePendingContractScope, updatePendingContractScope,
  getPendingContractDepartments, getAvailablePendingContractDepartments,
  addPendingContractDepartments, removePendingContractDepartment,
  getPendingContractAffiliates, getAvailablePendingContractAffiliates,
  addPendingContractAffiliate, removePendingContractAffiliate,
  deletePendingContract,
} from '../../api/pendingContracts';
import type {
  PendingContractDetail, PendingContractScopeItem, AvailablePendingContractScope,
  PendingContractDepartmentItem, PendingContractAffiliateItem,
} from './types';

const fmtDate = (d: string | null | undefined) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

// ── shared styles (kept local; mirror ContractDetailPane) ──
const spinnerContainerStyle: React.CSSProperties = { padding: 24, textAlign: 'center' };
const emptyStateStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
const tabPaddingStyle: React.CSSProperties = { padding: '10px 14px' };
const tableContainerStyle: React.CSSProperties = { padding: 0, maxHeight: 460, overflowY: 'auto' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const detailContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const loadingCenterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const emptySelectStyle: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 };
const panelBodyStyle: React.CSSProperties = { padding: '12px 14px' };
const specsPaddingStyle: React.CSSProperties = { padding: '14px 16px' };
const headerActionsStyle: React.CSSProperties = { display: 'flex', gap: 6 };
const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
  background: 'var(--card)', border: '1px solid var(--neutral-200)',
  borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
};
const convertBtnStyle: React.CSSProperties = {
  ...actionBtnStyle, background: 'var(--success)', color: 'var(--card)', border: 'none', fontWeight: 700,
};
const thStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
  textAlign: 'left', background: 'var(--neutral-50)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)', color: 'var(--text)',
};
const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>{children}</div>
);
const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>{children}</div>
);
const smallBtn: React.CSSProperties = {
  padding: '2px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--primary)',
  borderRadius: 4, background: 'rgba(var(--primary-rgb), 0.07)', color: 'var(--primary)', cursor: 'pointer',
};
const linkDanger: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0,
};
const typeLabel = (rf: string) => rf === 'F' ? 'Flexible' : rf === 'R' ? 'Rigid' : rf === 'C' ? 'Camera' : (rf || '—');

// ============================ SCOPES TAB (convert-critical) ============================
interface ScopesTabProps {
  pendingKey: number;
  onScopeCountsChange: (total: number, modelOnly: number) => void;
}
const ScopesTab = ({ pendingKey, onScopeCountsChange }: ScopesTabProps) => {
  const [scopes, setScopes] = useState<PendingContractScopeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<AvailablePendingContractScope[]>([]);
  const [picker, setPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<number | null>(null);
  const [serialEdits, setSerialEdits] = useState<Record<number, string>>({});

  // Initial + key-change load. setState happens only inside the async callbacks
  // (never synchronously in the effect body), so this stays clean under
  // react-hooks/set-state-in-effect. `loading` already starts true.
  useEffect(() => {
    let active = true;
    getPendingContractScopes(pendingKey)
      .then(s => {
        if (!active) return;
        setScopes(s);
        onScopeCountsChange(s.length, s.filter(x => x.scopeKey === 0).length);
      })
      .catch(() => { if (active) message.error('Failed to load scopes'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pendingKey, onScopeCountsChange]);

  // Refetch after a mutation (called from handlers, not an effect).
  const reload = useCallback(() => {
    setLoading(true);
    getPendingContractScopes(pendingKey)
      .then(s => {
        setScopes(s);
        onScopeCountsChange(s.length, s.filter(x => x.scopeKey === 0).length);
      })
      .catch(() => message.error('Failed to load scopes'))
      .finally(() => setLoading(false));
  }, [pendingKey, onScopeCountsChange]);

  const openPicker = () => {
    setPicker(true);
    setSelectedScope(null);
    setPickerLoading(true);
    getAvailablePendingContractScopes(pendingKey)
      .then(setAvailable)
      .catch(() => message.error('Failed to load available scopes'))
      .finally(() => setPickerLoading(false));
  };

  const handleAdd = async () => {
    if (!selectedScope) { message.error('Select a scope to add'); return; }
    try {
      await addPendingContractScope(pendingKey, selectedScope);
      message.success('Scope added');
      setPicker(false);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to add scope');
    }
  };

  const handleDelete = async (rowKey: number) => {
    try {
      await deletePendingContractScope(pendingKey, rowKey);
      message.success('Scope removed');
      reload();
    } catch {
      message.error('Failed to remove scope');
    }
  };

  const handleAssignSerial = async (rowKey: number) => {
    const serial = (serialEdits[rowKey] ?? '').trim();
    if (!serial) { message.error('Enter a serial number'); return; }
    try {
      await updatePendingContractScope(pendingKey, rowKey, { serialNumber: serial });
      message.success('Serial assigned');
      setSerialEdits(prev => { const n = { ...prev }; delete n[rowKey]; return n; });
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to assign serial');
    }
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const modelOnly = scopes.filter(s => s.scopeKey === 0).length;

  return (
    <div style={tabPaddingStyle}>
      {modelOnly > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, background: 'rgba(var(--danger-rgb), 0.08)', border: '1px solid rgba(var(--danger-rgb), 0.25)', fontSize: 11.5, color: 'var(--danger)', fontWeight: 600 }}>
          {modelOnly} scope(s) have no serial number. All scopes must have serials before this deal can be converted.
        </div>
      )}

      {picker && (
        <Panel>
          <PanelHead>
            <span>Add Inventory Scope</span>
            <button onClick={() => setPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>✕</button>
          </PanelHead>
          <div style={{ padding: '10px 12px' }}>
            {pickerLoading ? (
              <div style={spinnerContainerStyle}><Spin size="small" /></div>
            ) : available.length === 0 ? (
              <div style={emptyStateStyle}>No unassigned scopes available for this client.</div>
            ) : (
              <>
                <select
                  value={selectedScope ?? ''}
                  onChange={e => setSelectedScope(Number(e.target.value) || null)}
                  style={{ width: '100%', height: 30, fontSize: 12, border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '0 8px', marginBottom: 8 }}
                >
                  <option value="">— select a scope —</option>
                  {available.map(s => (
                    <option key={s.scopeKey} value={s.scopeKey}>
                      {s.serialNumber || '(no serial)'} — {s.scopeTypeDesc} ({s.departmentName})
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setPicker(false)} style={{ ...actionBtnStyle, height: 28 }}>Cancel</button>
                  <button onClick={handleAdd} style={{ ...smallBtn, height: 28, padding: '0 14px' }}>Add Scope</button>
                </div>
              </>
            )}
          </div>
        </Panel>
      )}

      <div style={{ marginTop: picker ? 10 : 0 }}>
        <Panel>
          <PanelHead>
            <span>Covered Scopes ({scopes.length})</span>
            {!picker && <button onClick={openPicker} style={smallBtn}>+ Add Scope</button>}
          </PanelHead>
          <div style={tableContainerStyle}>
            {scopes.length === 0 ? (
              <div style={emptyStateStyle}>No scopes added to this pending contract yet.</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Serial #</th>
                    <th style={thStyle}>Model</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Department</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scopes.map(s => {
                    const isModelOnly = s.scopeKey === 0;
                    return (
                      <tr key={s.pendingContractScopeKey} style={isModelOnly ? { background: 'rgba(var(--danger-rgb), 0.04)' } : undefined}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: isModelOnly ? 'var(--danger)' : 'var(--primary)' }}>
                          {isModelOnly ? (
                            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                              <input
                                value={serialEdits[s.pendingContractScopeKey] ?? ''}
                                onChange={e => setSerialEdits(p => ({ ...p, [s.pendingContractScopeKey]: e.target.value }))}
                                placeholder="serial…"
                                style={{ width: 90, height: 22, fontSize: 11, border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '0 5px' }}
                              />
                              <button onClick={() => handleAssignSerial(s.pendingContractScopeKey)} style={{ ...smallBtn, padding: '1px 6px' }}>Set</button>
                            </span>
                          ) : (s.serialNumber || '—')}
                        </td>
                        <td style={tdStyle}>{s.scopeTypeDesc || '—'}</td>
                        <td style={tdStyle}>{typeLabel(s.rigidOrFlexible)}</td>
                        <td style={tdStyle}>{s.departmentName || '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{s.quantity || 1}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{s.contractCost > 0 ? fmtMoney(s.contractCost) : '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <Popconfirm title="Remove this scope?" onConfirm={() => handleDelete(s.pendingContractScopeKey)} okText="Remove" cancelText="Cancel">
                            <button style={linkDanger}>Remove</button>
                          </Popconfirm>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============================ DEPARTMENTS TAB ============================
const DepartmentsTab = ({ pendingKey }: { pendingKey: number }) => {
  const [depts, setDepts] = useState<PendingContractDepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<PendingContractDepartmentItem[]>([]);
  const [picker, setPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getPendingContractDepartments(pendingKey)
      .then(d => { if (active) setDepts(d); })
      .catch(() => { if (active) message.error('Failed to load departments'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pendingKey]);

  const reload = useCallback(() => {
    setLoading(true);
    getPendingContractDepartments(pendingKey)
      .then(setDepts)
      .catch(() => message.error('Failed to load departments'))
      .finally(() => setLoading(false));
  }, [pendingKey]);

  const openPicker = () => {
    setPicker(true);
    setSelected(null);
    setPickerLoading(true);
    getAvailablePendingContractDepartments(pendingKey)
      .then(setAvailable)
      .catch(() => message.error('Failed to load available departments'))
      .finally(() => setPickerLoading(false));
  };

  const handleAdd = async () => {
    if (!selected) { message.error('Select a department'); return; }
    try {
      await addPendingContractDepartments(pendingKey, [selected]);
      message.success('Department added');
      setPicker(false);
      reload();
    } catch { message.error('Failed to add department'); }
  };

  const handleRemove = async (deptKey: number) => {
    try {
      await removePendingContractDepartment(pendingKey, deptKey);
      message.success('Department removed');
      reload();
    } catch { message.error('Failed to remove department'); }
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      {picker && (
        <Panel>
          <PanelHead>
            <span>Add Department</span>
            <button onClick={() => setPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>✕</button>
          </PanelHead>
          <div style={{ padding: '10px 12px' }}>
            {pickerLoading ? <div style={spinnerContainerStyle}><Spin size="small" /></div> :
              available.length === 0 ? <div style={emptyStateStyle}>No more departments available for this client.</div> : (
                <>
                  <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value) || null)} style={{ width: '100%', height: 30, fontSize: 12, border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '0 8px', marginBottom: 8 }}>
                    <option value="">— select department —</option>
                    {available.map(d => <option key={d.departmentKey} value={d.departmentKey}>{d.departmentName}</option>)}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setPicker(false)} style={{ ...actionBtnStyle, height: 28 }}>Cancel</button>
                    <button onClick={handleAdd} style={{ ...smallBtn, height: 28, padding: '0 14px' }}>Add</button>
                  </div>
                </>
              )}
          </div>
        </Panel>
      )}
      <div style={{ marginTop: picker ? 10 : 0 }}>
        <Panel>
          <PanelHead>
            <span>Linked Departments ({depts.length})</span>
            {!picker && <button onClick={openPicker} style={smallBtn}>+ Add Department</button>}
          </PanelHead>
          <div style={tableContainerStyle}>
            {depts.length === 0 ? <div style={emptyStateStyle}>No departments linked.</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Department</th><th style={thStyle}>Client</th><th style={{ ...thStyle, textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {depts.map(d => (
                    <tr key={d.departmentKey}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{d.departmentName || '—'}</td>
                      <td style={tdStyle}>{d.clientName || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <Popconfirm title="Remove this department?" onConfirm={() => handleRemove(d.departmentKey)} okText="Remove" cancelText="Cancel">
                          <button style={linkDanger}>Remove</button>
                        </Popconfirm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============================ AFFILIATES TAB ============================
const AffiliatesTab = ({ pendingKey }: { pendingKey: number }) => {
  const [affs, setAffs] = useState<PendingContractAffiliateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<PendingContractAffiliateItem[]>([]);
  const [picker, setPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getPendingContractAffiliates(pendingKey)
      .then(a => { if (active) setAffs(a); })
      .catch(() => { if (active) message.error('Failed to load affiliates'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pendingKey]);

  const reload = useCallback(() => {
    setLoading(true);
    getPendingContractAffiliates(pendingKey)
      .then(setAffs)
      .catch(() => message.error('Failed to load affiliates'))
      .finally(() => setLoading(false));
  }, [pendingKey]);

  const openPicker = () => {
    setPicker(true);
    setSelected(null);
    setPickerLoading(true);
    getAvailablePendingContractAffiliates(pendingKey)
      .then(setAvailable)
      .catch(() => message.error('Failed to load available affiliates'))
      .finally(() => setPickerLoading(false));
  };

  const handleAdd = async () => {
    if (!selected) { message.error('Select a department'); return; }
    try {
      await addPendingContractAffiliate(pendingKey, selected);
      message.success('Affiliate added');
      setPicker(false);
      reload();
    } catch { message.error('Failed to add affiliate'); }
  };

  const handleRemove = async (deptKey: number) => {
    try {
      await removePendingContractAffiliate(pendingKey, deptKey);
      message.success('Affiliate removed');
      reload();
    } catch { message.error('Failed to remove affiliate'); }
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      {picker && (
        <Panel>
          <PanelHead>
            <span>Add Affiliate</span>
            <button onClick={() => setPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>✕</button>
          </PanelHead>
          <div style={{ padding: '10px 12px' }}>
            {pickerLoading ? <div style={spinnerContainerStyle}><Spin size="small" /></div> :
              available.length === 0 ? <div style={emptyStateStyle}>No affiliate departments available.</div> : (
                <>
                  <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value) || null)} style={{ width: '100%', height: 30, fontSize: 12, border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '0 8px', marginBottom: 8 }}>
                    <option value="">— select department —</option>
                    {available.map(d => <option key={d.departmentKey} value={d.departmentKey}>{d.clientName} — {d.departmentName}</option>)}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setPicker(false)} style={{ ...actionBtnStyle, height: 28 }}>Cancel</button>
                    <button onClick={handleAdd} style={{ ...smallBtn, height: 28, padding: '0 14px' }}>Add</button>
                  </div>
                </>
              )}
          </div>
        </Panel>
      )}
      <div style={{ marginTop: picker ? 10 : 0 }}>
        <Panel>
          <PanelHead>
            <span>Affiliated Facilities ({affs.length})</span>
            {!picker && <button onClick={openPicker} style={smallBtn}>+ Add Affiliate</button>}
          </PanelHead>
          <div style={tableContainerStyle}>
            {affs.length === 0 ? <div style={emptyStateStyle}>No affiliates linked.</div> : (
              <table style={tableStyle}>
                <thead><tr><th style={thStyle}>Department</th><th style={thStyle}>Client</th><th style={{ ...thStyle, textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {affs.map(a => (
                    <tr key={a.departmentKey}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{a.departmentName || '—'}</td>
                      <td style={tdStyle}>{a.clientName || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <Popconfirm title="Remove this affiliate?" onConfirm={() => handleRemove(a.departmentKey)} okText="Remove" cancelText="Cancel">
                          <button style={linkDanger}>Remove</button>
                        </Popconfirm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============================ SPECS TAB ============================
const SpecsTab = ({ detail }: { detail: PendingContractDetail }) => (
  <div style={specsPaddingStyle}>
    <Panel>
      <PanelHead><span>Deal Information</span></PanelHead>
      <div style={panelBodyStyle}>
        <FormGrid cols={2}>
          <div className="span-2"><Field label="Pending Contract Name" value={detail.name} /></div>
          <Field label="Client" value={detail.clientName} />
          <Field label="Contract Type" value={detail.contractType || '—'} />
          <Field label="Status" value={detail.status} />
          <Field label="Sales Rep" value={detail.salesRep || '—'} />
          <Field label="Term (months)" value={detail.termMonths || '—'} />
          <Field label="Created" value={fmtDate(detail.creationDate)} />
          <Field label="Scopes" value={detail.scopeCount} />
          <Field label="Departments" value={detail.departmentCount} />
          <Field label="Affiliates" value={detail.affiliateCount} />
        </FormGrid>
      </div>
    </Panel>
    {/* The full editable Specs/Address workspace + Notes tab are best-effort and
        not yet wired — see docs/pending-contracts-deferred.md. */}
    <div style={{ marginTop: 12 }}>
      <DevNotice
        title="Pending Contract Specs editing"
        requirement="Inline edit of address/sales-rep/term/template + a Notes tab are deferred. The convert-critical Scopes sub-grid is fully functional; use it to assemble the deal. See docs/pending-contracts-deferred.md."
      >
        <span style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'underline dotted', cursor: 'help' }}>
          Specs editing &amp; Notes tab are deferred — details
        </span>
      </DevNotice>
    </div>
  </div>
);

// ============================ MAIN PANE ============================
interface PendingContractDetailPaneProps {
  detail: PendingContractDetail | null;
  loading: boolean;
  onConvert: (scopeCount: number, modelOnlyCount: number) => void;
  onDeleted: () => void;
  isAdmin: boolean;
  // Lets the parent keep the live scope counts for the convert dialog.
  onScopeCountsChange: (total: number, modelOnly: number) => void;
}

const TABS: TabDef[] = [
  { key: 'specs', label: 'Specifications' },
  { key: 'scopes', label: 'Scopes' },
  { key: 'departments', label: 'Departments' },
  { key: 'affiliates', label: 'Affiliates' },
];

// Tab area owns its own active-tab state. The parent keys this on
// pendingContractKey so it remounts (resetting to Specs) when the record
// changes — avoids a setState-in-effect / ref-during-render reset.
const PaneTabs = ({ detail, onScopeCountsChange }: {
  detail: PendingContractDetail;
  onScopeCountsChange: (total: number, modelOnly: number) => void;
}) => {
  const [activeTab, setActiveTab] = useState('specs');
  return (
    <>
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'specs' && <SpecsTab detail={detail} />}
        {activeTab === 'scopes' && <ScopesTab pendingKey={detail.pendingContractKey} onScopeCountsChange={onScopeCountsChange} />}
        {activeTab === 'departments' && <DepartmentsTab pendingKey={detail.pendingContractKey} />}
        {activeTab === 'affiliates' && <AffiliatesTab pendingKey={detail.pendingContractKey} />}
      </div>
    </>
  );
};

export const PendingContractDetailPane = ({ detail, loading, onConvert, onDeleted, isAdmin, onScopeCountsChange }: PendingContractDetailPaneProps) => {
  const [counts, setCounts] = useState({ total: 0, modelOnly: 0 });

  const handleCounts = useCallback((total: number, modelOnly: number) => {
    setCounts({ total, modelOnly });
    onScopeCountsChange(total, modelOnly);
  }, [onScopeCountsChange]);

  const handleDelete = async () => {
    if (!detail) return;
    try {
      await deletePendingContract(detail.pendingContractKey);
      message.success('Pending contract deleted');
      onDeleted();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) return <div style={loadingCenterStyle}><Spin /></div>;
  if (!detail) return <div style={emptySelectStyle}>Select a pending contract to view details</div>;

  const isDead = detail.status.toLowerCase() !== 'pending';

  return (
    <div style={detailContainerStyle}>
      <DetailHeader
        headingLevel="h2"
        title={detail.clientName || '(No client)'}
        subtitle={detail.name || undefined}
        badges={<StatusBadge status={isDead ? 'Dead' : 'Pending'} variant={isDead ? 'red' : 'amber'} />}
        actions={
          <div style={headerActionsStyle}>
            {/* CSA generation is deferred — legacy used server-side Word COM. */}
            <DevNotice
              title="Create Agreement (CSA)"
              requirement="Legacy CSA generation impersonated an admin and mail-merged a Word .docx server-side via COM. That does not port to the cloud; it is deferred to a future templated-PDF effort. See docs/pending-contracts-deferred.md."
            >
              <span style={actionBtnStyle}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Create Agreement
              </span>
            </DevNotice>
            {!isDead && (
              <button onClick={() => onConvert(counts.total, counts.modelOnly)} style={convertBtnStyle}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Convert
              </button>
            )}
            {isAdmin && (
              <Popconfirm title="Delete this pending contract? This cannot be undone from the UI." onConfirm={handleDelete} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                <button style={{ ...actionBtnStyle, color: 'var(--danger)', borderColor: 'rgba(var(--danger-rgb), 0.3)' }}>
                  Delete
                </button>
              </Popconfirm>
            )}
          </div>
        }
      />

      <PaneTabs key={detail.pendingContractKey} detail={detail} onScopeCountsChange={handleCounts} />
    </div>
  );
};
