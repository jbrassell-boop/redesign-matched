import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getWizardClients, getWizardDepartments, getWizardScopes,
  getInstrumentTypes, getWizardScopeTypes, createOrder,
} from '../../api/orders';
import type {
  WizardClient, WizardDepartment, WizardScope,
  WizardInstrumentType, WizardScopeType,
} from '../../api/orders';

interface Props {
  open: boolean;
  onClose: () => void;
  orderType: string;
  title: string;
}

const TYPE_LABELS: Record<string, string> = { F: 'Flexible', R: 'Rigid', C: 'Camera', I: 'Instrument' };

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 4,
  padding: '0 8px', fontSize: 11, fontFamily: 'inherit', outline: 'none', width: '100%',
  color: 'var(--label)', background: 'var(--card)',
};

// ── Extracted static styles ──
const wizOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,37,0.35)',
  zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const wizDialogStyle: React.CSSProperties = {
  background: 'var(--card)', borderRadius: 10, width: 660, maxHeight: '85vh',
  overflow: 'hidden', boxShadow: '0 24px 72px rgba(0,0,37,0.28)',
  display: 'flex', flexDirection: 'column',
};
const wizHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  background: 'var(--navy)',
  color: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  flexShrink: 0,
};
const wizHeaderTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, letterSpacing: 0.3 };
const wizCloseBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
  color: 'var(--card)', width: 28, height: 28, borderRadius: 5,
  cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const wizStepBarStyle: React.CSSProperties = {
  display: 'flex', background: 'var(--neutral-50)',
  borderBottom: '1px solid var(--neutral-200)', flexShrink: 0,
};
const wizBodyStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const wizStepContentStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 };
const wizGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflowY: 'auto', flex: 1 };
const wizCardNameStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--navy)' };
const wizCardSubStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', marginTop: 2 };
const wizEmptyStyle: React.CSSProperties = { gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted)' };
const wizScopeGridStyle: React.CSSProperties = { overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' };
const wizNewScopeBoxStyle: React.CSSProperties = {
  border: '1px solid var(--neutral-200)', borderRadius: 6,
  background: 'var(--neutral-50)', padding: '10px 12px', flexShrink: 0,
};
const wizNewScopeTitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 };
const wizNewScopeHintStyle: React.CSSProperties = { fontSize: 9, color: 'var(--muted)', fontWeight: 400, marginLeft: 'auto' };
const wizNewScopeGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 10px' };
const wizModelDropdownStyle: React.CSSProperties = { maxHeight: 120, overflowY: 'auto', border: '1px solid var(--neutral-200)', borderRadius: 4, background: 'var(--card)', marginTop: 6 };
const wizModelEmptyStyle: React.CSSProperties = { padding: 8, fontSize: 10, color: 'var(--muted)', textAlign: 'center' };
const wizSerialRowStyle: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 8, alignItems: 'flex-end' };
const wizAddScopeBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 16px', background: 'var(--success)', color: 'var(--card)',
  border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center', gap: 4,
};
const wizStep4Style: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 10, overflowY: 'auto' };
const wizSummaryChipStyle: React.CSSProperties = {
  background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
  borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, flexShrink: 0,
};
const wizAccessoryRowStyle: React.CSSProperties = { display: 'flex', gap: 16, marginTop: 4 };
const wizAccessoryLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer' };
const wizPoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
const wizStepNumBaseStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 16, height: 16, borderRadius: '50%', fontSize: 9,
  color: 'var(--card)',
};
const wizModelMfgStyle: React.CSSProperties = { fontSize: 9, color: 'var(--muted)' };
const wizIconStyle: React.CSSProperties = { width: 16, height: 16 };
const wizChipBreadcrumbStyle: React.CSSProperties = {
  background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
  borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', flexShrink: 0,
};
const wizChipLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' };
const wizChipValueStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--navy)' };
const wizChipExtraStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', marginLeft: 4 };
const wizChangeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--primary)',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
};
const wizScopeEmptyNoSearchStyle: React.CSSProperties = { gridColumn: '1/-1', padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)' };

export const NewOrderWizard = ({ open, onClose, orderType, title }: Props) => {
  const navigate = useNavigate();

  // ── Navigation ──
  const [step, setStep] = useState(1);

  // ── Step 1 ──
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);

  // ── Step 2 ──
  const [departments, setDepartments] = useState<WizardDepartment[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<WizardDepartment | null>(null);
  const deptSearchRef = useRef<HTMLInputElement>(null);

  // ── Step 3: Scope ──
  const [scopes, setScopes] = useState<WizardScope[]>([]);
  const [scopeSearch, setScopeSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<WizardScope | null>(null);
  const scopeSearchRef = useRef<HTMLInputElement>(null);
  // New scope form
  const [instTypes, setInstTypes] = useState<WizardInstrumentType[]>([]);
  const [scopeTypes, setScopeTypes] = useState<WizardScopeType[]>([]);
  const [newInstType, setNewInstType] = useState('');
  const [newScopeTypeKey, setNewScopeTypeKey] = useState<number | null>(null);
  const [newScopeTypeName, setNewScopeTypeName] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // ── Step 4: Intake ──
  const [complaint, setComplaint] = useState('');
  const [po, setPo] = useState('');
  const [rack, setRack] = useState('');
  const [inclCase, setInclCase] = useState(false);
  const [inclETOCap, setInclETOCap] = useState(false);
  const [inclWPCap, setInclWPCap] = useState(false);

  const [creating, setCreating] = useState(false);

  // ── Init on open ──
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedClient(null);
    setSelectedDept(null);
    setSelectedScope(null);
    setClientSearch('');
    setDeptSearch('');
    setScopeSearch('');
    setComplaint('');
    setPo('');
    setRack('');
    setInclCase(false);
    setInclETOCap(false);
    setInclWPCap(false);
    setNewInstType('');
    setNewScopeTypeKey(null);
    setNewScopeTypeName('');
    setNewSerial('');
    setModelSearch('');
    getWizardClients().then(setClients).catch(() => { message.error('Failed to load clients'); setClients([]); });
    setTimeout(() => clientSearchRef.current?.focus(), 100);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const goStep = useCallback((s: number) => {
    setStep(s);
    if (s === 1) setTimeout(() => clientSearchRef.current?.focus(), 50);
    if (s === 2) { setDeptSearch(''); setTimeout(() => deptSearchRef.current?.focus(), 50); }
    if (s === 3) { setScopeSearch(''); setTimeout(() => scopeSearchRef.current?.focus(), 50); }
  }, []);

  // ── Step handlers ──
  const handleSelectClient = useCallback(async (client: WizardClient) => {
    setSelectedClient(client);
    setSelectedDept(null);
    setSelectedScope(null);
    const depts = await getWizardDepartments(client.clientKey).catch(() => { message.error('Failed to load departments'); return []; });
    setDepartments(depts);
    goStep(2);
  }, [goStep]);

  const handleSelectDept = useCallback(async (dept: WizardDepartment) => {
    setSelectedDept(dept);
    setSelectedScope(null);
    const sc = await getWizardScopes(dept.departmentKey).catch(() => { message.error('Failed to load scopes'); return []; });
    setScopes(sc);
    // Load instrument types for new scope form
    if (instTypes.length === 0) {
      getInstrumentTypes().then(setInstTypes).catch(() => { message.error('Failed to load instrument types'); });
    }
    goStep(3);
  }, [goStep, instTypes.length]);

  const handleSelectScope = useCallback((scope: WizardScope) => {
    setSelectedScope(scope);
    // Set accessory defaults based on type
    const isFlex = scope.type === 'F';
    setInclCase(!isFlex);
    setInclETOCap(isFlex);
    setInclWPCap(isFlex);
    goStep(4);
  }, [goStep]);

  // Instrument type change → load scope types
  const handleInstTypeChange = useCallback(async (typeCode: string) => {
    setNewInstType(typeCode);
    setNewScopeTypeKey(null);
    setNewScopeTypeName('');
    setModelSearch('');
    if (!typeCode) { setScopeTypes([]); return; }
    const types = await getWizardScopeTypes(typeCode).catch(() => { message.error('Failed to load scope types'); return []; });
    setScopeTypes(types);
  }, []);

  const handlePickModel = useCallback((key: number, name: string) => {
    setNewScopeTypeKey(key);
    setNewScopeTypeName(name);
    setModelSearch(name);
  }, []);

  const handleAddScope = useCallback(() => {
    if (!newInstType) { message.warning('Select instrument type'); return; }
    if (!newScopeTypeKey) { message.warning('Select a model'); return; }
    if (!newSerial.trim()) { message.warning('Enter serial number'); return; }
    // Create a local scope object (will be created server-side on submit)
    const localScope: WizardScope = {
      scopeKey: 0, // signals "create new" to the backend
      serialNumber: newSerial.trim(),
      model: newScopeTypeName,
      manufacturer: scopeTypes.find(t => t.scopeTypeKey === newScopeTypeKey)?.manufacturer ?? '',
      type: newInstType,
    };
    setSelectedScope(localScope);
    const isFlex = newInstType === 'F';
    setInclCase(!isFlex);
    setInclETOCap(isFlex);
    setInclWPCap(isFlex);
    message.success('Scope added');
    goStep(4);
  }, [newInstType, newScopeTypeKey, newScopeTypeName, newSerial, scopeTypes, goStep]);

  // ── Create order ──
  const handleCreate = useCallback(async () => {
    if (!selectedDept) return;
    if (!complaint.trim()) { message.error('Customer complaint is required'); return; }
    setCreating(true);
    try {
      const result = await createOrder({
        departmentKey: selectedDept.departmentKey,
        orderType,
        scopeKey: selectedScope && selectedScope.scopeKey > 0 ? selectedScope.scopeKey : undefined,
        serialNumber: selectedScope && selectedScope.scopeKey === 0 ? selectedScope.serialNumber : undefined,
        scopeTypeKey: selectedScope && selectedScope.scopeKey === 0 ? newScopeTypeKey : undefined,
        complaint: complaint.trim(),
        purchaseOrder: po.trim() || undefined,
        rackPosition: rack.trim() || undefined,
        includesCaseYN: inclCase ? 'Y' : 'N',
        includesETOCapYN: inclETOCap ? 'Y' : 'N',
        includesWaterProofCapYN: inclWPCap ? 'Y' : 'N',
      });
      onClose();
      message.success(`Work order ${result.workOrderNumber} created`);
      navigate(`/repairs/${result.repairKey}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      console.error('[NewOrder] create failed:', err);
      message.error(msg ? `Failed: ${msg}` : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  }, [selectedDept, selectedScope, orderType, complaint, po, rack, inclCase, inclETOCap, inclWPCap, newScopeTypeKey, onClose, navigate]);

  if (!open) return null;

  // ── Filters ──
  const lc = clientSearch.toLowerCase();
  const filteredClients = lc
    ? clients.filter(c => c.name.toLowerCase().includes(lc) || c.city.toLowerCase().includes(lc) || c.state.toLowerCase().includes(lc) || c.zip.includes(lc) || String(c.clientKey).includes(lc))
    : clients;

  const ld = deptSearch.toLowerCase();
  const filteredDepts = ld ? departments.filter(d => d.name.toLowerCase().includes(ld)) : departments;

  const ls = scopeSearch.toLowerCase();
  const filteredScopes = ls
    ? scopes.filter(s => s.serialNumber.toLowerCase().includes(ls) || s.model.toLowerCase().includes(ls) || s.manufacturer.toLowerCase().includes(ls))
    : scopes;

  const lm = modelSearch.toLowerCase();
  const filteredModels = lm ? scopeTypes.filter(t => t.description.toLowerCase().includes(lm) || t.manufacturer.toLowerCase().includes(lm)) : scopeTypes;

  const stepTabs = [
    { num: 1, label: 'Client' },
    { num: 2, label: 'Department' },
    { num: 3, label: 'Scope' },
    { num: 4, label: 'Intake' },
  ];

  // ── Shared card style ──
  const cardStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1.5px solid var(--neutral-200)',
    borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
  };

  // ── Breadcrumb chip ──
  const Chip = ({ label, value, extra, onChangeStep }: { label: string; value: string; extra?: string; onChangeStep: number }) => (
    <div style={wizChipBreadcrumbStyle}>
      <div>
        <span style={wizChipLabelStyle}>{label}</span><br />
        <span style={wizChipValueStyle}>{value}</span>
        {extra && <span style={wizChipExtraStyle}>{extra}</span>}
      </div>
      <button onClick={() => goStep(onChangeStep)} style={wizChangeBtnStyle}>Change</button>
    </div>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={wizOverlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="New Work Order"
    >
      <div style={wizDialogStyle}>
        {/* Header */}
        <div style={wizHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WizardIcon type={orderType} />
            <span style={wizHeaderTitleStyle}>{title}</span>
          </div>
          <button onClick={onClose} style={wizCloseBtnStyle}>x</button>
        </div>

        {/* Step tabs */}
        <div style={wizStepBarStyle}>
          {stepTabs.map((t) => {
            const active = t.num === step;
            const past = t.num < step;
            return (
              <div key={t.num} style={{
                padding: '8px 16px', fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--navy)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                cursor: 'default', userSelect: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  ...wizStepNumBaseStyle,
                  background: (active || past) ? 'var(--navy)' : 'var(--neutral-200)',
                }}>{t.num}</span>
                {t.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={wizBodyStyle}>

          {/* ════ Step 1: Client ════ */}
          {step === 1 && (
            <div style={wizStepContentStyle}>
              <input ref={clientSearchRef} value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                placeholder="Search by name, city, state, zip, or ID..." aria-label="Search clients" style={{ ...fld, height: 32, flexShrink: 0 }} />
              <div style={wizGridStyle}>
                {filteredClients.length === 0
                  ? <div style={wizEmptyStyle}>No clients found</div>
                  : filteredClients.map(c => (
                    <div key={c.clientKey} onClick={() => handleSelectClient(c)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectClient(c); } }} style={cardStyle} className="wizard-card">
                      <div style={wizCardNameStyle}>{c.name}</div>
                      <div style={wizCardSubStyle}>
                        {c.city}{c.state ? `, ${c.state}` : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════ Step 2: Department ════ */}
          {step === 2 && selectedClient && (
            <div style={wizStepContentStyle}>
              <Chip label="Client" value={selectedClient.name} extra={`${selectedClient.city}${selectedClient.state ? `, ${selectedClient.state}` : ''}`} onChangeStep={1} />
              <input ref={deptSearchRef} value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                placeholder="Search departments..." aria-label="Search departments" style={{ ...fld, height: 32, flexShrink: 0 }} />
              <div style={wizGridStyle}>
                {filteredDepts.length === 0
                  ? <div style={wizEmptyStyle}>No departments found</div>
                  : filteredDepts.map(d => (
                    <div key={d.departmentKey} onClick={() => handleSelectDept(d)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectDept(d); } }} style={cardStyle} className="wizard-card">
                      <div style={wizCardNameStyle}>{d.name}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════ Step 3: Scope ════ */}
          {step === 3 && selectedClient && selectedDept && (
            <div style={wizStepContentStyle}>
              <Chip label="Client / Department" value={`${selectedClient.name} / ${selectedDept.name}`} onChangeStep={2} />
              <input ref={scopeSearchRef} value={scopeSearch} onChange={e => setScopeSearch(e.target.value)}
                placeholder="Search by serial number or model..." aria-label="Search scopes" style={{ ...fld, height: 32, flexShrink: 0 }} />

              {/* Existing scopes grid */}
              <div style={wizScopeGridStyle}>
                {filteredScopes.length === 0 && !scopeSearch
                  ? <div style={wizScopeEmptyNoSearchStyle}>No scopes for this department. Use <b>Add New Scope</b> below.</div>
                  : filteredScopes.length === 0
                  ? <div style={wizScopeEmptyNoSearchStyle}>No scopes matching &quot;{scopeSearch}&quot;</div>
                  : filteredScopes.map(s => (
                    <div key={s.scopeKey} onClick={() => handleSelectScope(s)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectScope(s); } }} style={cardStyle} className="wizard-card">
                      <div style={wizCardNameStyle}>SN# {s.serialNumber || '\u2014'}</div>
                      <div style={wizCardSubStyle}>
                        {s.model || '\u2014'}{s.manufacturer ? ` \u00b7 ${s.manufacturer}` : ''}{s.type ? ` \u00b7 ${TYPE_LABELS[s.type] || s.type}` : ''}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add New Scope */}
              <div style={wizNewScopeBoxStyle}>
                <div style={wizNewScopeTitleStyle}>
                  <span style={{ fontSize: 14 }}>+</span> Add New Scope
                  <span style={wizNewScopeHintStyle}>Scope not in system yet</span>
                </div>
                <div style={wizNewScopeGridStyle}>
                  <div>
                    <div style={lbl}>Instrument Type *</div>
                    <select value={newInstType} onChange={e => handleInstTypeChange(e.target.value)} aria-label="Instrument type" style={fld}>
                      <option value="">-- Select --</option>
                      {instTypes.map(t => <option key={t.typeCode} value={t.typeCode}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={lbl}>Search Model * {scopeTypes.length > 0 && `(${scopeTypes.length})`}</div>
                    <input value={modelSearch} onChange={e => { setModelSearch(e.target.value); setNewScopeTypeKey(null); setNewScopeTypeName(''); }}
                      placeholder={newInstType ? `Type to search ${scopeTypes.length} models...` : 'Select type first...'}
                      aria-label="Search scope model"
                      disabled={!newInstType} style={fld} />
                  </div>
                </div>
                {/* Model grid */}
                {newInstType && modelSearch && (
                  <div style={wizModelDropdownStyle}>
                    {filteredModels.length === 0
                      ? <div style={wizModelEmptyStyle}>No models matching &quot;{modelSearch}&quot;</div>
                      : filteredModels.slice(0, 50).map(t => (
                        <div key={t.scopeTypeKey}
                          onClick={() => handlePickModel(t.scopeTypeKey, t.description)}
                          role="option"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePickModel(t.scopeTypeKey, t.description); } }}
                          style={{
                            padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                            borderBottom: '1px solid var(--neutral-100)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: newScopeTypeKey === t.scopeTypeKey ? 'var(--primary-light)' : '',
                            fontWeight: newScopeTypeKey === t.scopeTypeKey ? 700 : 400,
                          }}
                          className={newScopeTypeKey === t.scopeTypeKey ? 'selected' : 'menu-item-hover'}
                        >
                          <span>{t.description}</span>
                          {t.manufacturer && <span style={wizModelMfgStyle}>{t.manufacturer}</span>}
                        </div>
                      ))}
                  </div>
                )}
                <div style={wizSerialRowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={lbl}>Serial Number *</div>
                    <input value={newSerial} onChange={e => setNewSerial(e.target.value)} placeholder="e.g. 2801442" aria-label="Scope serial number" style={fld} />
                  </div>
                  <button onClick={handleAddScope} style={wizAddScopeBtnStyle}>+ Add Scope</button>
                </div>
              </div>
            </div>
          )}

          {/* ════ Step 4: Intake ════ */}
          {step === 4 && selectedClient && selectedDept && (
            <div style={wizStep4Style}>
              {/* Summary chips */}
              <div style={wizSummaryChipStyle}>
                <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Client:</span> {selectedClient.name}</div>
                <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Dept:</span> {selectedDept.name}</div>
                {selectedScope && <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Scope:</span> {selectedScope.model} / SN# {selectedScope.serialNumber}</div>}
              </div>

              {/* Complaint */}
              <div>
                <div style={lbl}>Customer Complaint *</div>
                <textarea value={complaint} onChange={e => setComplaint(e.target.value)} rows={3}
                  placeholder="What did the customer report? (e.g., Leaking at base, No image, Angulation stiff...)"
                  aria-label="Customer complaint"
                  style={{ ...fld, height: 'auto', padding: '6px 8px', resize: 'vertical' }} />
              </div>

              {/* PO + Rack */}
              <div style={wizPoGridStyle}>
                <div>
                  <div style={lbl}>PO Number</div>
                  <input value={po} onChange={e => setPo(e.target.value)} placeholder="If provided" aria-label="PO number" style={fld} />
                </div>
                <div>
                  <div style={lbl}>Rack Position</div>
                  <input value={rack} onChange={e => setRack(e.target.value)} placeholder="Auto-assigned if blank" aria-label="Rack position" style={fld} />
                </div>
              </div>

              {/* Accessories */}
              <div>
                <div style={lbl}>Accessories Received</div>
                <div style={wizAccessoryRowStyle}>
                  {[
                    { label: 'Carrying Case', checked: inclCase, set: setInclCase },
                    { label: 'ETO Cap', checked: inclETOCap, set: setInclETOCap },
                    { label: 'Water Res. Cap', checked: inclWPCap, set: setInclWPCap },
                  ].map(a => (
                    <label key={a.label} style={wizAccessoryLabelStyle}>
                      <input type="checkbox" checked={a.checked} onChange={e => a.set(e.target.checked)} />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  height: 38, background: 'var(--navy)', color: 'var(--card)', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.3, flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, opacity: creating ? 0.7 : 1,
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {creating ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WizardIcon = ({ type }: { type: string }) => {
  if (type === 'endocart') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={wizIconStyle}>
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /><line x1="12" y1="11" x2="12" y2="15" />
      </svg>
    );
  }
  if (type === 'repair' || type === 'instrument') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={wizIconStyle}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={wizIconStyle}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
};
