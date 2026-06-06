import { useState } from 'react';
import { Modal, message } from 'antd';
import { createPendingContract } from '../../api/pendingContracts';
import { getClientsSimple, getContractTypes, type LookupOption } from '../../api/lookups';

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
  background: 'var(--card)', padding: '0 7px', fontSize: 11, color: 'var(--label)',
  width: '100%', fontFamily: 'inherit', outline: 'none',
};
const secHead: React.CSSProperties = {
  background: 'var(--navy)', color: 'var(--card)', padding: '4px 10px',
  fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  borderRadius: 3, marginBottom: 6, marginTop: 4,
};

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block', marginBottom: 8 }}><span style={lbl}>{l}</span>{children}</label>
);

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (newKey: number) => void;
}

// Auto-name preview mirrors the legacy WinForms client:
//   "Pending Contract: {Client} - {Type} {MM/dd/yyyy}"
// The server performs the authoritative dedup (#2..#10) on submit.
const buildName = (clientName: string, typeName: string) => {
  if (!clientName || !typeName) return '';
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `Pending Contract: ${clientName.trim()} - ${typeName.trim()} ${mm}/${dd}/${d.getFullYear()}`;
};

export const NewPendingContractModal = ({ open, onClose, onCreated }: Props) => {
  const [clients, setClients] = useState<LookupOption[]>([]);
  const [types, setTypes] = useState<LookupOption[]>([]);
  const [clientKey, setClientKey] = useState<number | null>(null);
  const [typeKey, setTypeKey] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clientName = clients.find(c => c.key === clientKey)?.name ?? '';
  const typeName = types.find(t => t.key === typeKey)?.name ?? '';
  const effectiveName = nameTouched ? name : buildName(clientName, typeName);

  const reset = () => {
    setClientKey(null);
    setTypeKey(null);
    setName('');
    setNameTouched(false);
  };

  // Load-on-open via Modal afterOpenChange (not a setState-in-effect).
  const handleAfterOpen = (visible: boolean) => {
    if (!visible) return;
    reset();
    setLoadingLookups(true);
    Promise.all([getClientsSimple(), getContractTypes()])
      .then(([c, t]) => { setClients(c); setTypes(t); })
      .catch(() => message.error('Failed to load form data'))
      .finally(() => setLoadingLookups(false));
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!clientKey || !typeKey) {
      const missing: string[] = [];
      if (!clientKey) missing.push('a client');
      if (!typeKey) missing.push('a contract type');
      message.error(`Please select ${missing.join(' and ')}.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        clientKey,
        contractTypeKey: typeKey,
        name: nameTouched && name.trim() ? name.trim() : undefined,
      };
      const { pendingContractKey, name: finalName } = await createPendingContract(payload);
      message.success(`Pending contract created: ${finalName}`);
      onCreated(pendingContractKey);
      handleClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create pending contract');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      afterOpenChange={handleAfterOpen}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>New Pending Contract</span>}
      width={560}
      footer={null}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={secHead}>Deal Details</div>

      <F label="Client *">
        <select value={clientKey ?? ''} onChange={e => setClientKey(Number(e.target.value) || null)} style={fld} disabled={loadingLookups}>
          <option value="">{loadingLookups ? 'Loading…' : '— select client —'}</option>
          {clients.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </F>

      <F label="Contract Type *">
        <select value={typeKey ?? ''} onChange={e => setTypeKey(Number(e.target.value) || null)} style={fld} disabled={loadingLookups}>
          <option value="">{loadingLookups ? 'Loading…' : '— select contract type —'}</option>
          {types.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        {!loadingLookups && types.length === 0 && (
          <span style={{ fontSize: 10.5, color: 'var(--danger)' }}>
            No contract types are configured in this environment.
          </span>
        )}
      </F>

      <F label="Pending Contract Name">
        <input
          type="text"
          value={effectiveName}
          onChange={e => { setName(e.target.value); setNameTouched(true); }}
          placeholder="Auto-generated from client + type"
          style={fld}
        />
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
          Leave blank to auto-name. Duplicates are numbered automatically.
        </span>
      </F>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {submitting ? 'Creating…' : 'Create Pending Contract'}
        </button>
      </div>
    </Modal>
  );
};
