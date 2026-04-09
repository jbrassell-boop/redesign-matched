import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import type { RepairFull } from '../types';
import { getUpdateSlipReasons, createUpdateSlip, getRepairTechnicians } from '../../../api/repairs';
import type { TechnicianOption } from '../../../api/repairs';
import './UpdateSlipsModal.css';

interface UpdateSlipsModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  slips: { slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[];
  onSlipCreated?: () => void;
}

export const UpdateSlipsModal = ({ open, onClose, repair, slips, onSlipCreated }: UpdateSlipsModalProps) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [reasons, setReasons] = useState<{ key: number; name: string }[]>([]);
  const [techs, setTechs] = useState<TechnicianOption[]>([]);
  const [reasonKey, setReasonKey] = useState<number | ''>('');
  const [techKey, setTechKey] = useState<number | ''>('');
  const [tech2Key, setTech2Key] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getUpdateSlipReasons().then(setReasons).catch(() => { message.error('Failed to load update slip reasons'); });
    getRepairTechnicians().then(setTechs).catch(() => { message.error('Failed to load technicians'); });
  }, [open]);

  const handleCreate = async () => {
    if (!reasonKey) { message.warning('Select a reason'); return; }
    setSaving(true);
    try {
      await createUpdateSlip(repair.repairKey, {
        techKey: techKey || null,
        tech2Key: tech2Key || null,
        reasonKey: Number(reasonKey),
      });
      message.success('Update slip created');
      setShowNewForm(false);
      setReasonKey('');
      setTechKey('');
      setTech2Key('');
      onSlipCreated?.();
    } catch {
      message.error('Failed to create update slip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={760} destroyOnClose>
      <div className="usm-root">

        {/* Internal Use Only Banner */}
        <div className="usm-banner">
          <div className="usm-banner-text">Internal Use Only</div>
        </div>

        {/* Header */}
        <div className="usm-header">
          <img src="/logo-color.png" alt="Total Scope Inc." loading="lazy" className="usm-logo" />
          <div className="usm-title-block">
            <div className="usm-title">Update Slip</div>
            <div className="usm-subtitle">OM15-2</div>
          </div>
        </div>

        {/* Scope Information */}
        <div className="usm-sbar">Scope Information</div>
        <div className="usm-scope-grid">
          <div><span className="usm-fl">Work Order #</span><div className="usm-fv">{repair.wo}</div></div>
          <div><span className="usm-fl">Client / Facility</span><div className="usm-fv">{repair.client}</div></div>
          <div><span className="usm-fl">Serial #</span><div className="usm-fv">{repair.serial}</div></div>
          <div><span className="usm-fl">Model</span><div className="usm-fv">{repair.scopeModel || repair.scopeType}</div></div>
        </div>

        {/* Slip History */}
        <div className="usm-sbar">Slip History ({slips.length})</div>
        {slips.length === 0 ? (
          <div className="usm-no-slips">No update slips recorded.</div>
        ) : (
          <table className="usm-table">
            <thead>
              <tr>
                {['Date', 'Reason', 'Primary Tech', 'Secondary Tech'].map(h => (
                  <th key={h} className="usm-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slips.map((s, i) => (
                <tr key={s.slipKey} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td className="usm-td">{s.date}</td>
                  <td className="usm-td">{s.reason || '—'}</td>
                  <td className="usm-td">{s.primaryTech || '—'}</td>
                  <td className="usm-td">{s.secondaryTech || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* New Slip Form */}
        <div className="usm-form-wrap">
          {!showNewForm ? (
            <button onClick={() => setShowNewForm(true)} className="usm-new-btn">
              + New Slip
            </button>
          ) : (
            <div className="usm-form-box">
              <div className="usm-form-title">Create New Slip</div>
              <div className="usm-form-grid">
                <div>
                  <div className="usm-fl">Reason *</div>
                  <select className="usm-select" value={reasonKey} onChange={e => setReasonKey(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— Select Reason —</option>
                    {reasons.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="usm-fl">Primary Tech</div>
                  <select className="usm-select" value={techKey} onChange={e => setTechKey(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— Select —</option>
                    {techs.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
                  </select>
                </div>
                <div>
                  <div className="usm-fl">Secondary Tech</div>
                  <select className="usm-select" value={tech2Key} onChange={e => setTech2Key(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">None</option>
                    {techs.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
                  </select>
                </div>
              </div>
              <div className="usm-form-actions">
                <button onClick={handleCreate} disabled={saving} className="usm-save-btn">{saving ? 'Creating...' : 'Create'}</button>
                <button onClick={() => setShowNewForm(false)} className="usm-cancel-btn">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Print button */}
        <div className="no-print usm-print-bar">
          <button onClick={() => window.print()} className="usm-print-btn">Print / Save PDF</button>
        </div>
      </div>
    </Modal>
  );
};
