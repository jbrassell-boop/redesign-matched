import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import type { Amendment, AmendType, AmendReason, CreateAmendmentRequest, RepairFull } from '../types';
import { getAmendments, createAmendment, getAmendTypes, getAmendReasons } from '../../../api/repairs';

interface Props {
  repairKey: number;
  repair: RepairFull;
  open: boolean;
  onClose: () => void;
  onAmendmentCreated: () => void;
  prefillTranKey?: number;
}

export const AmendmentModal = ({ repairKey, repair: _repair, open, onClose, onAmendmentCreated, prefillTranKey }: Props) => {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [selected, setSelected] = useState<Amendment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [amendTypes, setAmendTypes] = useState<AmendType[]>([]);
  const [amendReasons, setAmendReasons] = useState<AmendReason[]>([]);

  // Form state
  const [typeKey, setTypeKey] = useState<number | ''>('');
  const [reasonKey, setReasonKey] = useState<number | ''>('');
  const [newFixType, setNewFixType] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAmendments(repairKey)
      .then(data => { setAmendments(data); })
      .catch(() => message.error('Failed to load amendments'));
    getAmendTypes()
      .then(setAmendTypes)
      .catch(() => { message.error('Failed to load amendment types'); });
  }, [open, repairKey]);

  useEffect(() => {
    if (typeKey) {
      getAmendReasons(Number(typeKey))
        .then(setAmendReasons)
        .catch(() => { message.error('Failed to load amendment reasons'); });
    } else {
      setAmendReasons([]);
    }
    setReasonKey('');
  }, [typeKey]);

  // If opened from a row click, go straight to form
  useEffect(() => {
    if (open && prefillTranKey != null) {
      setShowForm(true);
      setSelected(null);
    }
  }, [open, prefillTranKey]);

  const handleSave = async () => {
    if (!typeKey || !reasonKey) {
      message.warning('Select a type and reason');
      return;
    }
    if (!prefillTranKey) {
      message.warning('No line item selected');
      return;
    }
    setSaving(true);
    try {
      const body: CreateAmendmentRequest = {
        tranKey: prefillTranKey,
        amendTypeKey: Number(typeKey),
        amendReasonKey: Number(reasonKey),
        comment: comment || undefined,
        newFixType: newFixType || undefined,
        newAmount: newAmount ? parseFloat(newAmount) : undefined,
      };
      await createAmendment(repairKey, body);
      message.success('Amendment saved');
      onAmendmentCreated();
      // Refresh amendment list
      const updated = await getAmendments(repairKey);
      setAmendments(updated);
      // Reset form
      setShowForm(false);
      setTypeKey('');
      setReasonKey('');
      setNewFixType('');
      setNewAmount('');
      setComment('');
    } catch {
      message.error('Failed to save amendment');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 3 };
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 28, border: '1px solid var(--border)',
    borderRadius: 3, fontSize: 12, padding: '0 8px', boxSizing: 'border-box',
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Amendments</span>}
      width={700}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', height: 420 }}>
        {/* Left — history list */}
        <div style={{
          width: 260, borderRight: '1px solid var(--border)',
          overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{
            padding: '8px 12px', background: 'var(--neutral-50)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              {amendments.length} amendment{amendments.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)',
                  borderRadius: 3, padding: '2px 7px', fontSize: 9, fontWeight: 600, cursor: 'pointer',
                }}>
                Print OM07-9
              </button>
              <button
                onClick={() => { setShowForm(true); setSelected(null); }}
                style={{
                  background: 'var(--primary)', color: 'var(--card)', border: 'none',
                  borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>
                + New
              </button>
            </div>
          </div>
          {amendments.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              No amendments yet
            </div>
          )}
          {amendments.map(a => (
            <div key={a.amendKey}
              onClick={() => { setSelected(a); setShowForm(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer',
                background: selected?.amendKey === a.amendKey ? 'var(--primary-light)' : 'var(--card)',
                borderBottom: '1px solid var(--border)',
                borderLeft: selected?.amendKey === a.amendKey ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                #{a.amendmentNumber} · {a.date}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {a.amendType} — {a.amendReason}
              </div>
            </div>
          ))}
        </div>

        {/* Right — detail or form */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {!showForm && !selected && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 40, textAlign: 'center' }}>
              Select an amendment to view, or click + New to create one.
            </div>
          )}

          {/* Past amendment detail (read-only) */}
          {!showForm && selected && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                Amendment #{selected.amendmentNumber}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
                {[
                  ['Date', selected.date],
                  ['Type', selected.amendType],
                  ['Reason', selected.amendReason],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: 12 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selected.comment && (
                <div>
                  <div style={labelStyle}>Comment</div>
                  <div style={{
                    fontSize: 12, background: 'var(--neutral-50)',
                    border: '1px solid var(--border)', borderRadius: 4,
                    padding: '8px 10px', marginTop: 2,
                  }}>
                    {selected.comment}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New amendment form */}
          {showForm && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                New Amendment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={labelStyle}>Type *</div>
                  <select style={inputStyle} value={typeKey}
                    onChange={e => setTypeKey(e.target.value ? Number(e.target.value) : '')}
                    aria-label="Amendment type">
                    <option value="">Select type…</option>
                    {amendTypes.map(t => (
                      <option key={t.typeKey} value={t.typeKey}>{t.typeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Reason *</div>
                  <select style={inputStyle} value={reasonKey}
                    onChange={e => setReasonKey(e.target.value ? Number(e.target.value) : '')}
                    disabled={!typeKey}
                    aria-label="Amendment reason">
                    <option value="">Select reason…</option>
                    {amendReasons.map(r => (
                      <option key={r.reasonKey} value={r.reasonKey}>{r.reasonName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelStyle}>New Fix Type (optional)</div>
                    <select style={inputStyle} value={newFixType}
                      onChange={e => setNewFixType(e.target.value)}
                      aria-label="New fix type">
                      <option value="">No change</option>
                      <option value="W">W — Warranty</option>
                      <option value="NC">NC — Non-Covered</option>
                      <option value="C">C — Customer</option>
                      <option value="A">A — Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>New Amount (optional)</div>
                    <input style={inputStyle} type="number" min="0" step="0.01"
                      placeholder="No change"
                      aria-label="New amendment amount"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)} />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Comment</div>
                  <input style={inputStyle} maxLength={80} placeholder="Optional…"
                    aria-label="Amendment comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '5px 14px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontSize: 12 }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '5px 14px', borderRadius: 3, border: 'none', background: 'var(--primary)', color: 'var(--card)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {saving ? 'Saving…' : 'Save Amendment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
