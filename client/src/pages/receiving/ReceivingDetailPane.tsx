import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { intakeReceive } from '../../api/receiving';
import { getWizardClients, getWizardDepartments } from '../../api/orders';
import type { WizardClient, WizardDepartment } from '../../api/orders';
import type { PendingArrival } from './types';

interface Props {
  arrival: PendingArrival | null;
  loading: boolean;
  onReceived: () => void;
}

export const ReceivingDetailPane = ({ arrival, loading, onReceived }: Props) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'view' | 'walkin'>('view');

  // Walk-in intake form state
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [departments, setDepartments] = useState<WizardDepartment[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(null);
  const [selectedDept, setSelectedDept] = useState<WizardDepartment | null>(null);
  const [serial, setSerial] = useState('');
  const [complaint, setComplaint] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [trackingIn, setTrackingIn] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startWalkin = useCallback(async () => {
    setMode('walkin');
    setSelectedClient(null);
    setSelectedDept(null);
    setSerial('');
    setComplaint('');
    setPoNumber('');
    setTrackingIn('');
    setNotes('');
    setClientSearch('');
    const c = await getWizardClients().catch(() => []);
    setClients(c);
  }, []);

  const handleSelectClient = useCallback(async (client: WizardClient) => {
    setSelectedClient(client);
    setSelectedDept(null);
    const depts = await getWizardDepartments(client.clientKey).catch(() => []);
    setDepartments(depts);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedDept || !serial.trim()) return;
    setSubmitting(true);
    try {
      const result = await intakeReceive({
        departmentKey: selectedDept.departmentKey,
        serialNumber: serial.trim(),
        complaintDesc: complaint.trim(),
        poNumber: poNumber.trim() || undefined,
        trackingIn: trackingIn.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      message.success(`Work Order ${result.workOrderNumber} created`);
      setMode('view');
      onReceived();
      navigate(`/repairs?wo=${result.workOrderNumber}`);
    } catch {
      message.error('Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  }, [selectedDept, serial, complaint, poNumber, trackingIn, notes, onReceived, navigate]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>;
  }

  // Walk-in intake mode
  if (mode === 'walkin') {
    const lowerSearch = clientSearch.toLowerCase();
    const filteredClients = lowerSearch
      ? clients.filter(c =>
          c.name.toLowerCase().includes(lowerSearch) ||
          c.city.toLowerCase().includes(lowerSearch) ||
          String(c.clientKey).includes(lowerSearch)
        )
      : clients;

    return (
      <div style={{ padding: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Walk-in Intake</h3>
          <button
            onClick={() => setMode('view')}
            style={{
              height: 28, padding: '0 12px', border: '1px solid var(--neutral-200)',
              borderRadius: 5, background: 'var(--card)', color: 'var(--muted)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
        </div>

        {/* Client picker */}
        {!selectedClient ? (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Customer</label>
            <input
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search customer..."
              style={inputStyle}
            />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
              maxHeight: 150, overflowY: 'auto', marginTop: 6,
            }}>
              {filteredClients.slice(0, 50).map(c => (
                <div
                  key={c.clientKey}
                  onClick={() => handleSelectClient(c)}
                  style={cardStyle}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neutral-200)'; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{c.city}{c.state ? `, ${c.state}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
            borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 12,
          }}>
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Customer</span><br />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{selectedClient.name}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                {selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ''}
              </span>
            </div>
            <button onClick={() => { setSelectedClient(null); setSelectedDept(null); }} style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            }}>Change</button>
          </div>
        )}

        {/* Department */}
        {selectedClient && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Department</label>
            <select
              value={selectedDept?.departmentKey ?? ''}
              onChange={e => {
                const dk = parseInt(e.target.value);
                setSelectedDept(departments.find(d => d.departmentKey === dk) || null);
              }}
              style={{ ...inputStyle, background: 'var(--card)' }}
            >
              <option value="">-- Select --</option>
              {departments.map(d => (
                <option key={d.departmentKey} value={d.departmentKey}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Serial + Complaint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Serial #</label>
            <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="Serial number" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PO #</label>
            <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO number" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Complaint / Problem</label>
          <input value={complaint} onChange={e => setComplaint(e.target.value)} placeholder="Customer perceived problem..." style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Tracking # In</label>
            <input value={trackingIn} onChange={e => setTrackingIn(e.target.value)} placeholder="Inbound tracking" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condition notes..." style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={!selectedDept || !serial.trim() || submitting}
            style={{
              height: 38, padding: '0 24px', border: 'none', borderRadius: 6,
              background: 'var(--success)', color: 'var(--card)',
              fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              opacity: (!selectedDept || !serial.trim() || submitting) ? 0.5 : 1,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {submitting ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>
    );
  }

  // Normal view: show selected arrival details or empty state
  if (!arrival) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
          Select a pending arrival from the list, or start a walk-in intake.
        </div>
        <button
          onClick={startWalkin}
          style={{
            height: 36, padding: '0 20px', border: '1.5px solid var(--navy)',
            borderRadius: 6, background: 'var(--card)', color: 'var(--navy)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Walk-in / No Match
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)', marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
            WO #{arrival.workOrderNumber}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {arrival.clientName} &mdash; {arrival.departmentName}
          </div>
        </div>
        <DaysInBadge days={arrival.daysIn} />
      </div>

      {/* Details grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        marginBottom: 20,
      }}>
        <DetailField label="Model" value={arrival.scopeTypeDesc} />
        <DetailField label="Serial #" value={arrival.serialNumber} mono />
        <DetailField label="Status" value={arrival.repairStatus} />
        <DetailField label="Date In" value={arrival.dateIn ? new Date(arrival.dateIn).toLocaleDateString() : 'N/A'} />
      </div>

      {arrival.complaintDesc && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Complaint</label>
          <div style={{
            fontSize: 12, color: 'var(--danger)', fontStyle: 'italic',
            padding: '8px 12px', background: 'rgba(var(--danger-rgb), 0.04)',
            border: '1px solid rgba(var(--danger-rgb), 0.12)', borderRadius: 6, marginTop: 4,
          }}>{arrival.complaintDesc}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate(`/repairs?wo=${arrival.workOrderNumber}`)}
          style={{
            height: 34, padding: '0 16px', border: 'none', borderRadius: 6,
            background: 'var(--primary)', color: 'var(--card)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Open in Repairs</button>
        <button
          onClick={startWalkin}
          style={{
            height: 34, padding: '0 16px', border: '1.5px solid var(--navy)',
            borderRadius: 6, background: 'var(--card)', color: 'var(--navy)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Walk-in
        </button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: 0.3, display: 'block', marginBottom: 2,
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 30, border: '1.5px solid var(--neutral-200)',
  borderRadius: 4, padding: '0 8px', fontSize: 11,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1.5px solid var(--neutral-200)',
  borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.1s',
};

const DetailField = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2, fontFamily: mono ? 'monospace' : 'inherit' }}>
      {value || 'N/A'}
    </div>
  </div>
);

const DaysInBadge = ({ days }: { days: number }) => {
  let bg = 'rgba(var(--success-rgb), 0.08)';
  let color = 'var(--success)';
  if (days >= 14) { bg = 'rgba(var(--danger-rgb), 0.08)'; color = 'var(--danger)'; }
  else if (days >= 7) { bg = 'rgba(var(--amber-rgb), 0.08)'; color = 'var(--warning)'; }
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: bg, color, fontWeight: 700 }}>
      {days}d in
    </span>
  );
};
