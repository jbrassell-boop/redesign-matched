import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { intakeReceive } from '../../api/receiving';
import { getWizardClients, getWizardDepartments } from '../../api/orders';
import type { WizardClient, WizardDepartment } from '../../api/orders';
import type { PendingArrival } from './types';

// ── Extracted static styles ──
const loadingWrapStyle: React.CSSProperties = { padding: 60, textAlign: 'center' };
const walkinWrapStyle: React.CSSProperties = { padding: 20 };
const walkinHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 };
const walkinTitleStyle: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--navy)' };
const cancelBtnStyle: React.CSSProperties = { height: 28, padding: '0 12px', border: '1px solid var(--neutral-200)', borderRadius: 5, background: 'var(--card)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const clientPickerGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 150, overflowY: 'auto', marginTop: 6 };
const clientCardNameStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--navy)' };
const clientCardCityStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)' };
const selectedClientWrapStyle: React.CSSProperties = { background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)', borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 };
const selectedClientLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' };
const selectedClientNameStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--navy)' };
const selectedClientCityStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', marginLeft: 4 };
const changeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' };
const fieldGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 };
const submitRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', marginTop: 16 };
const submitBtnBaseStyle: React.CSSProperties = { height: 38, padding: '0 24px', border: 'none', borderRadius: 6, background: 'var(--success)', color: 'var(--card)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 };
const svgIconStyle: React.CSSProperties = { width: 14, height: 14 };
const emptyStateStyle: React.CSSProperties = { padding: 60, textAlign: 'center' };
const emptyMsgStyle: React.CSSProperties = { fontSize: 14, color: 'var(--muted)', marginBottom: 16 };
const emptyBtnStyle: React.CSSProperties = { height: 36, padding: '0 20px', border: '1.5px solid var(--navy)', borderRadius: 6, background: 'var(--card)', color: 'var(--navy)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 };
const svgSmallStyle: React.CSSProperties = { width: 12, height: 12 };
const detailWrapStyle: React.CSSProperties = { padding: 20 };
const detailHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)', marginBottom: 16 };
const woNumberStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--navy)' };
const woSubtitleStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 2 };
const detailGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 };
const detailFieldLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 };
const detailFieldValueBaseStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 2 };
const complaintBoxStyle: React.CSSProperties = { fontSize: 12, color: 'var(--danger)', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(var(--danger-rgb), 0.04)', border: '1px solid rgba(var(--danger-rgb), 0.12)', borderRadius: 6, marginTop: 4 };
const actionRowStyle: React.CSSProperties = { display: 'flex', gap: 8 };
const openRepairsBtnStyle: React.CSSProperties = { height: 34, padding: '0 16px', border: 'none', borderRadius: 6, background: 'var(--primary)', color: 'var(--card)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const newWalkinBtnStyle: React.CSSProperties = { height: 34, padding: '0 16px', border: '1.5px solid var(--navy)', borderRadius: 6, background: 'var(--card)', color: 'var(--navy)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 };
const daysInBadgeBaseStyle: React.CSSProperties = { fontSize: 11, padding: '3px 10px', borderRadius: 4, fontWeight: 700 };

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
    const c = await getWizardClients().catch(() => { message.error('Failed to load clients'); return []; });
    setClients(c);
  }, []);

  const handleSelectClient = useCallback(async (client: WizardClient) => {
    setSelectedClient(client);
    setSelectedDept(null);
    const depts = await getWizardDepartments(client.clientKey).catch(() => { message.error('Failed to load departments'); return []; });
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
    return <div style={loadingWrapStyle}><Spin /></div>;
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
      <div style={walkinWrapStyle}>
        <div style={walkinHeaderStyle}>
          <h3 style={walkinTitleStyle}>Walk-in Intake</h3>
          <button
            onClick={() => setMode('view')}
            style={cancelBtnStyle}
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
              aria-label="Search customer"
              style={inputStyle}
            />
            <div style={clientPickerGridStyle}>
              {filteredClients.slice(0, 50).map(c => (
                <div
                  key={c.clientKey}
                  onClick={() => handleSelectClient(c)}
                  style={cardStyle}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neutral-200)'; }}
                >
                  <div style={clientCardNameStyle}>{c.name}</div>
                  <div style={clientCardCityStyle}>{c.city}{c.state ? `, ${c.state}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={selectedClientWrapStyle}>
            <div>
              <span style={selectedClientLabelStyle}>Customer</span><br />
              <span style={selectedClientNameStyle}>{selectedClient.name}</span>
              <span style={selectedClientCityStyle}>
                {selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ''}
              </span>
            </div>
            <button onClick={() => { setSelectedClient(null); setSelectedDept(null); }} style={changeBtnStyle}>Change</button>
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
        <div style={fieldGridStyle}>
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

        <div style={fieldGridStyle}>
          <div>
            <label style={labelStyle}>Tracking # In</label>
            <input value={trackingIn} onChange={e => setTrackingIn(e.target.value)} placeholder="Inbound tracking" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condition notes..." style={inputStyle} />
          </div>
        </div>

        <div style={submitRowStyle}>
          <button
            onClick={handleSubmit}
            disabled={!selectedDept || !serial.trim() || submitting}
            style={{
              ...submitBtnBaseStyle,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: (!selectedDept || !serial.trim() || submitting) ? 0.5 : 1,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={svgIconStyle}>
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
      <div style={emptyStateStyle}>
        <div style={emptyMsgStyle}>
          Select a pending arrival from the list, or start a walk-in intake.
        </div>
        <button
          onClick={startWalkin}
          style={emptyBtnStyle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgSmallStyle}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Walk-in / No Match
        </button>
      </div>
    );
  }

  return (
    <div style={detailWrapStyle}>
      {/* Header */}
      <div style={detailHeaderStyle}>
        <div>
          <div style={woNumberStyle}>
            WO #{arrival.workOrderNumber}
          </div>
          <div style={woSubtitleStyle}>
            {arrival.clientName} &mdash; {arrival.departmentName}
          </div>
        </div>
        <DaysInBadge days={arrival.daysIn} />
      </div>

      {/* Details grid */}
      <div style={detailGridStyle}>
        <DetailField label="Model" value={arrival.scopeTypeDesc} />
        <DetailField label="Serial #" value={arrival.serialNumber} mono />
        <DetailField label="Status" value={arrival.repairStatus} />
        <DetailField label="Date In" value={arrival.dateIn ? new Date(arrival.dateIn).toLocaleDateString() : 'N/A'} />
      </div>

      {arrival.complaintDesc && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Complaint</label>
          <div style={complaintBoxStyle}>{arrival.complaintDesc}</div>
        </div>
      )}

      <div style={actionRowStyle}>
        <button
          onClick={() => navigate(`/repairs?wo=${arrival.workOrderNumber}`)}
          style={openRepairsBtnStyle}
        >Open in Repairs</button>
        <button
          onClick={startWalkin}
          style={newWalkinBtnStyle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgSmallStyle}>
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
    <div style={detailFieldLabelStyle}>{label}</div>
    <div style={{ ...detailFieldValueBaseStyle, fontFamily: mono ? 'monospace' : 'inherit' }}>
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
    <span style={{ ...daysInBadgeBaseStyle, background: bg, color }}>
      {days}d in
    </span>
  );
};
