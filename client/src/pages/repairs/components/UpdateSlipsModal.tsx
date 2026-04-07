import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import type { RepairFull } from '../types';
import { getUpdateSlipReasons, createUpdateSlip, getRepairTechnicians } from '../../../api/repairs';
import type { TechnicianOption } from '../../../api/repairs';

interface UpdateSlipsModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  slips: { slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[];
  onSlipCreated?: () => void;
}

const sBar: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: React.CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px',
};

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

  const selectStyle: React.CSSProperties = {
    width: '100%', height: 28, border: '1px solid var(--border)', borderRadius: 4,
    fontSize: 11, padding: '0 6px',
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={760} destroyOnClose>
      <div style={{ background: 'var(--card)', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

        {/* Internal Use Only Banner */}
        <div style={{
          background: '#FEF2F2', border: '2px solid #FECACA',
          borderRadius: 4, padding: '8px 16px', textAlign: 'center', marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
            Internal Use Only
          </div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <img src="/logo-color.png" alt="Total Scope Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Update Slip</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM15-2</div>
          </div>
        </div>

        {/* Scope Information */}
        <div style={sBar}>Scope Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5px 12px', padding: '6px 0 2px' }}>
          <div><span style={fl}>Work Order #</span><div style={fv}>{repair.wo}</div></div>
          <div><span style={fl}>Client / Facility</span><div style={fv}>{repair.client}</div></div>
          <div><span style={fl}>Serial #</span><div style={fv}>{repair.serial}</div></div>
          <div><span style={fl}>Model</span><div style={fv}>{repair.scopeModel || repair.scopeType}</div></div>
        </div>

        {/* Slip History */}
        <div style={sBar}>Slip History ({slips.length})</div>
        {slips.length === 0 ? (
          <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>No update slips recorded.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
            <thead>
              <tr>
                {['Date', 'Reason', 'Primary Tech', 'Secondary Tech'].map(h => (
                  <th key={h} style={{ background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '4px 8px', textAlign: 'left', letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slips.map((s, i) => (
                <tr key={s.slipKey} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.date}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.reason || '—'}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.primaryTech || '—'}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.secondaryTech || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* New Slip Form */}
        <div style={{ marginTop: 12 }}>
          {!showNewForm ? (
            <button onClick={() => setShowNewForm(true)} style={{
              height: 30, padding: '0 14px', background: 'var(--navy)', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              + New Slip
            </button>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, background: 'var(--neutral-50)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Create New Slip</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                <div>
                  <div style={fl}>Reason *</div>
                  <select style={selectStyle} value={reasonKey} onChange={e => setReasonKey(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— Select Reason —</option>
                    {reasons.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={fl}>Primary Tech</div>
                  <select style={selectStyle} value={techKey} onChange={e => setTechKey(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— Select —</option>
                    {techs.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
                  </select>
                </div>
                <div>
                  <div style={fl}>Secondary Tech</div>
                  <select style={selectStyle} value={tech2Key} onChange={e => setTech2Key(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">None</option>
                    {techs.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={handleCreate} disabled={saving} style={{
                  padding: '5px 14px', background: 'var(--navy)', color: '#fff', border: 'none',
                  borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>{saving ? 'Creating...' : 'Create'}</button>
                <button onClick={() => setShowNewForm(false)} style={{
                  padding: '5px 14px', background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)',
                  borderRadius: 4, fontSize: 11, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Print button */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => window.print()} style={{
            padding: '7px 20px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Print / Save PDF</button>
        </div>
      </div>
    </Modal>
  );
};
