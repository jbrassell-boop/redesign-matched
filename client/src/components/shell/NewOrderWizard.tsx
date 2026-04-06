import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { getWizardClients, getWizardDepartments, createOrder } from '../../api/orders';
import type { WizardClient, WizardDepartment } from '../../api/orders';

interface Props {
  open: boolean;
  onClose: () => void;
  orderType: string;
  title: string;
}

export const NewOrderWizard = ({ open, onClose, orderType, title }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [departments, setDepartments] = useState<WizardDepartment[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(null);
  const [selectedDept, setSelectedDept] = useState<WizardDepartment | null>(null);
  const [creating, setCreating] = useState(false);
  const clientSearchRef = useRef<HTMLInputElement>(null);
  const deptSearchRef = useRef<HTMLInputElement>(null);

  // Load clients on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedClient(null);
    setSelectedDept(null);
    setClientSearch('');
    setDeptSearch('');
    getWizardClients().then(setClients).catch(() => setClients([]));
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
    if (s === 2) {
      setDeptSearch('');
      setTimeout(() => deptSearchRef.current?.focus(), 50);
    }
  }, []);

  const handleSelectClient = useCallback(async (client: WizardClient) => {
    setSelectedClient(client);
    const depts = await getWizardDepartments(client.clientKey).catch(() => []);
    setDepartments(depts);
    goStep(2);
  }, [goStep]);

  const handleSelectDept = useCallback((dept: WizardDepartment) => {
    setSelectedDept(dept);
    goStep(3);
  }, [goStep]);

  const handleCreate = useCallback(async () => {
    if (!selectedDept) return;
    setCreating(true);
    try {
      const result = await createOrder({
        departmentKey: selectedDept.departmentKey,
        orderType,
      });
      onClose();
      navigate(`/repairs/${result.repairKey}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg ? `Failed to create order: ${msg}` : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  }, [selectedDept, orderType, onClose, navigate]);

  if (!open) return null;

  // Filter clients
  const lowerClient = clientSearch.toLowerCase();
  const filteredClients = lowerClient
    ? clients.filter(c =>
        c.name.toLowerCase().includes(lowerClient) ||
        c.city.toLowerCase().includes(lowerClient) ||
        c.state.toLowerCase().includes(lowerClient) ||
        c.zip.toLowerCase().includes(lowerClient) ||
        String(c.clientKey).includes(lowerClient)
      )
    : clients;

  // Filter departments
  const lowerDept = deptSearch.toLowerCase();
  const filteredDepts = lowerDept
    ? departments.filter(d => d.name.toLowerCase().includes(lowerDept))
    : departments;

  const stepTabs = [
    { num: 1, label: 'Client' },
    { num: 2, label: 'Department' },
    { num: 3, label: 'Confirm' },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,37,0.35)',
        zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'var(--card)', borderRadius: 10, width: 620, maxHeight: '82vh',
        overflow: 'hidden', boxShadow: '0 24px 72px rgba(0,0,37,0.28)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(120deg, var(--navy) 0%, var(--steel) 100%)',
          color: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WizardIcon type={orderType} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>{title}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: 'var(--card)', width: 28, height: 28, borderRadius: 5,
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>x</button>
        </div>

        {/* Step tabs */}
        <div style={{
          display: 'flex', background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)', flexShrink: 0,
        }}>
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
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', fontSize: 9,
                  background: (active || past) ? 'var(--navy)' : 'var(--neutral-200)',
                  color: 'var(--card)',
                }}>{t.num}</span>
                {t.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Step 1: Client */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <input
                  ref={clientSearchRef}
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search by name, city, state, zip, or ID..."
                  style={{
                    height: 32, border: '1.5px solid var(--neutral-200)', borderRadius: 5,
                    padding: '0 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', flex: 1,
                  }}
                />
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                overflowY: 'auto', flex: 1,
              }}>
                {filteredClients.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
                    No clients found
                  </div>
                ) : filteredClients.map(c => (
                  <div
                    key={c.clientKey}
                    onClick={() => handleSelectClient(c)}
                    style={{
                      padding: '10px 12px', border: '1.5px solid var(--neutral-200)',
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'var(--primary-light)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--neutral-200)';
                      e.currentTarget.style.background = '';
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      {c.city}{c.state ? `, ${c.state}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Department */}
          {step === 2 && selectedClient && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 }}>
              {/* Selected client chip */}
              <div style={{
                background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
                borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexShrink: 0,
              }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Client</span><br />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{selectedClient.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                    {selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ''}
                  </span>
                </div>
                <button onClick={() => goStep(1)} style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                }}>Change</button>
              </div>
              <input
                ref={deptSearchRef}
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                placeholder="Search departments..."
                style={{
                  height: 32, border: '1.5px solid var(--neutral-200)', borderRadius: 5,
                  padding: '0 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', flexShrink: 0,
                }}
              />
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                overflowY: 'auto', flex: 1,
              }}>
                {filteredDepts.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
                    No departments found for this client
                  </div>
                ) : filteredDepts.map(d => (
                  <div
                    key={d.departmentKey}
                    onClick={() => handleSelectDept(d)}
                    style={{
                      padding: '10px 12px', border: '1.5px solid var(--neutral-200)',
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'var(--primary-light)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--neutral-200)';
                      e.currentTarget.style.background = '';
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{d.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && selectedClient && selectedDept && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 12 }}>
              {/* Client confirm */}
              <div style={{
                background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
                borderRadius: 6, padding: '10px 14px', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Client</span>
                  <button onClick={() => goStep(1)} style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                  }}>Change</button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{selectedClient.name}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                  {selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ''}
                </span>
              </div>
              {/* Department confirm */}
              <div style={{
                background: 'rgba(var(--primary-rgb), 0.06)', border: '1px solid rgba(var(--primary-rgb), 0.2)',
                borderRadius: 6, padding: '10px 14px', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Department</span>
                  <button onClick={() => goStep(2)} style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                  }}>Change</button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{selectedDept.name}</span>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /><line x1="12" y1="11" x2="12" y2="15" />
      </svg>
    );
  }
  if (type === 'repair' || type === 'instrument') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  // default: cart icon for product-sale
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
};
