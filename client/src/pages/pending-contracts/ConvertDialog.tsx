import { useState } from 'react';
import { Modal, message } from 'antd';
import dayjs from 'dayjs';
import { convertPendingContract } from '../../api/pendingContracts';
import { getInvoiceFrequencies, type LookupOption } from '../../api/lookups';
import type { PendingContractDetail } from './types';

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
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' };

const F = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block' }}><span style={lbl}>{l}</span>{children}</label>
);

interface Props {
  open: boolean;
  detail: PendingContractDetail | null;
  scopeCount: number;
  modelOnlyCount: number;   // scopes still missing a serial (blocks convert)
  onClose: () => void;
  onConverted: () => void;
}

// Termination = effective + length months - 1 day (ports UpdateTerminationDate).
const computeTermination = (effective: string, lengthMonths: number): string =>
  dayjs(effective).add(lengthMonths, 'month').subtract(1, 'day').format('YYYY-MM-DD');

// Convert-time contract name (ports UpdateContractName):
//   "{Client} - {Type} - {MM/dd/yyyy termination}"
const buildContractName = (clientName: string, type: string, termination: string): string =>
  `${clientName} - ${type} - ${dayjs(termination).format('MM/DD/YYYY')}`;

export const ConvertDialog = ({ open, detail, scopeCount, modelOnlyCount, onClose, onConverted }: Props) => {
  const [freqs, setFreqs] = useState<LookupOption[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [lengthMonths, setLengthMonths] = useState(12);
  const [poNumber, setPoNumber] = useState('');
  const [installmentTypeId, setInstallmentTypeId] = useState<number | null>(null);
  const [contractName, setContractName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const termination = (effectiveDate && lengthMonths > 0)
    ? computeTermination(effectiveDate, lengthMonths)
    : '';
  const autoName = (detail && termination)
    ? buildContractName(detail.clientName, detail.contractType, termination)
    : '';
  const effectiveName = nameTouched ? contractName : autoName;

  const reset = () => {
    setEffectiveDate(dayjs().format('YYYY-MM-DD'));
    setLengthMonths(12);
    setPoNumber('');
    setInstallmentTypeId(null);
    setContractName('');
    setNameTouched(false);
  };

  const handleAfterOpen = (visible: boolean) => {
    if (!visible) return;
    reset();
    setLoadingLookups(true);
    getInvoiceFrequencies()
      .then((f) => {
        setFreqs(f);
        if (f.length > 0) setInstallmentTypeId(f[0].key); // default Monthly (first)
      })
      .catch(() => message.error('Failed to load invoice frequencies'))
      .finally(() => setLoadingLookups(false));
  };

  const handleClose = () => { reset(); onClose(); };

  // Client-side guards mirroring frmPendingContractConvert.btnSave_Click.
  const validate = (): string | null => {
    if (!installmentTypeId) return 'Select a valid invoice frequency.';
    if (!effectiveDate || !dayjs(effectiveDate).isValid()) return 'Enter a valid effective date.';
    if (!Number.isInteger(lengthMonths) || lengthMonths < 1) return 'Contract length must be a whole number of months (≥ 1).';
    if (!termination || dayjs(termination).isBefore(dayjs(effectiveDate))) return 'Termination date cannot be before the effective date.';
    if (!effectiveName.trim()) return 'Enter a contract name.';
    if (!poNumber.trim()) return 'Enter a purchase order number.';
    if (poNumber.trim().length > 20) return 'PO numbers cannot be more than 20 characters.';
    if (scopeCount > 0 && modelOnlyCount > 0) return `${modelOnlyCount} scope(s) still need a serial number before converting.`;
    return null;
  };

  const handleConvert = async () => {
    if (!detail) return;
    const err = validate();
    if (err) { message.error(err); return; }

    // Soft-confirm when the deal has no scopes at all (mirrors legacy YesNo).
    if (scopeCount === 0) {
      const ok = window.confirm('This pending contract has no scopes. Convert it to a real contract anyway?');
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const result = await convertPendingContract(detail.pendingContractKey, {
        contractName: effectiveName.trim(),
        contractNumber: poNumber.trim(),
        effectiveDate,
        terminationDate: termination,
        contractLength: lengthMonths,
        installmentTypeId: installmentTypeId!,
      });
      if (result.contractKey && result.contractKey > 0) {
        message.success(`Converted to contract #${result.contractKey}`);
        onConverted();
        handleClose();
      } else {
        // Pre-flight passed but the engine returned no key.
        message.warning(result.message || 'Conversion did not complete.');
      }
    } catch (err) {
      // The cloud convert engine is not provisioned (HTTP 501) — surface its message.
      message.error(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      afterOpenChange={handleAfterOpen}
      onCancel={handleClose}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>Convert Pending Contract</span>}
      width={620}
      footer={null}
      styles={{ body: { padding: '12px 16px' } }}
    >
      {detail && (
        <>
          <div style={secHead}>Contract Terms</div>

          <div style={{ ...g2, marginBottom: 8 }}>
            <F label="Client">
              <input value={detail.clientName} disabled style={{ ...fld, background: 'var(--bg)', color: 'var(--muted)' }} />
            </F>
            <F label="Contract Type">
              <input value={detail.contractType || '—'} disabled style={{ ...fld, background: 'var(--bg)', color: 'var(--muted)' }} />
            </F>
          </div>

          <div style={{ ...g2, marginBottom: 8 }}>
            <F label="Effective Date *">
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                style={fld}
              />
            </F>
            <F label="Length (months) *">
              <input
                type="number"
                min={1}
                value={lengthMonths}
                onChange={e => setLengthMonths(Math.floor(Number(e.target.value) || 0))}
                style={fld}
              />
            </F>
          </div>

          <div style={{ ...g2, marginBottom: 8 }}>
            <F label="Termination Date">
              <input value={termination ? dayjs(termination).format('MM/DD/YYYY') : '—'} disabled style={{ ...fld, background: 'var(--bg)', color: 'var(--muted)' }} />
            </F>
            <F label="Invoice Frequency *">
              <select value={installmentTypeId ?? ''} onChange={e => setInstallmentTypeId(Number(e.target.value) || null)} style={fld} disabled={loadingLookups}>
                <option value="">{loadingLookups ? 'Loading…' : '— select —'}</option>
                {freqs.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
              </select>
            </F>
          </div>

          <F label="Purchase Order # *">
            <input
              type="text"
              maxLength={20}
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="≤ 20 characters"
              style={{ ...fld, marginBottom: 8 }}
            />
          </F>

          <F label="Contract Name *">
            <input
              type="text"
              value={effectiveName}
              onChange={e => { setContractName(e.target.value); setNameTouched(true); }}
              placeholder="Auto-generated from client + type + termination"
              style={{ ...fld, marginBottom: 4 }}
            />
          </F>

          {/* Serial-completeness warning (convert blocks unless all serials present). */}
          {scopeCount > 0 && modelOnlyCount > 0 && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6, fontWeight: 600 }}>
              {modelOnlyCount} of {scopeCount} scope(s) have no serial number. Assign serials before converting.
            </div>
          )}
          {scopeCount === 0 && (
            <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 6 }}>
              This deal has no scopes attached.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button onClick={handleClose} style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={submitting}
              style={{ height: 30, padding: '0 20px', fontSize: 12, fontWeight: 700, background: 'var(--success)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              {submitting ? 'Converting…' : 'Convert to Contract'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};
