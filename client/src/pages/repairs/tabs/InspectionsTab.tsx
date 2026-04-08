import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairInspections } from '../types';
import { getRepairInspections, updateRepairInspections } from '../../../api/repairs';

// ── Shared styles ─────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1100,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '32px 16px', overflowY: 'auto',
};
const panel: React.CSSProperties = {
  width: 660, background: 'var(--card)', borderRadius: 10,
  boxShadow: '0 8px 40px rgba(0,0,0,0.22)', overflow: 'hidden', flexShrink: 0,
};
const modalHeader: React.CSSProperties = {
  background: 'var(--navy)', color: '#fff',
  padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const modalTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' };
const modalSub: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 };
const modalBody: React.CSSProperties = { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 };
const sectionLbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--primary)',
  borderBottom: '1px solid var(--border)', paddingBottom: 5, marginBottom: 10,
};
const fieldLbl: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 3 };
const closeBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 12px', border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 5, background: 'transparent', color: '#fff',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const saveBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 16px', border: 'none',
  borderRadius: 5, background: 'var(--primary)', color: '#fff',
  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const modalFooter: React.CSSProperties = {
  padding: '12px 20px', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  background: 'var(--neutral-50)',
};
const angTable: React.CSSProperties = { fontSize: 11, borderCollapse: 'collapse', width: '100%' };
const angTh: React.CSSProperties = { textAlign: 'center', fontSize: 9, color: 'var(--muted)', padding: '2px 6px', fontWeight: 600 };
const angThLeft: React.CSSProperties = { textAlign: 'left', fontSize: 9, color: 'var(--muted)', padding: '2px 6px', fontWeight: 600 };
const angTd: React.CSSProperties = { padding: '3px 6px', fontWeight: 500, fontSize: 11 };
const angTdC: React.CSSProperties = { padding: '3px 6px', textAlign: 'center' };
const angInput: React.CSSProperties = {
  width: 56, fontSize: 11, textAlign: 'center',
  border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px',
  fontFamily: 'inherit',
};
const fiberGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
const fiberInput: React.CSSProperties = {
  width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)',
  borderRadius: 3, padding: '4px 6px', fontFamily: 'inherit', boxSizing: 'border-box' as const,
};
const pfGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 20px' };
const pfRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const pfLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text)' };
const pfBtnRow: React.CSSProperties = { display: 'flex', gap: 3 };
const textarea: React.CSSProperties = {
  width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)',
  borderRadius: 4, padding: '6px 8px', fontFamily: 'inherit',
  resize: 'vertical' as const, minHeight: 60, boxSizing: 'border-box' as const,
};

// ── P/F button ────────────────────────────────────────────────────────────────

const PFBtn = ({ value, target, onClick }: { value?: string; target: 'P' | 'F'; onClick: () => void }) => {
  const active = value === target;
  return (
    <button
      onClick={onClick}
      style={{
        width: 30, height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: active ? (target === 'P' ? 'var(--success)' : 'var(--danger)') : 'var(--card)',
        color: active ? '#fff' : 'var(--muted)',
      }}
    >
      {target}
    </button>
  );
};

// ── Y/N button ────────────────────────────────────────────────────────────────

const YNBtn = ({ value, target, onClick }: { value?: string; target: 'Y' | 'N'; onClick: () => void }) => {
  const active = value === target;
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 30, border: '1px solid var(--neutral-200)', borderRadius: 3,
        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: active ? (target === 'Y' ? 'var(--success)' : 'var(--danger)') : 'var(--card)',
        color: active ? '#fff' : 'var(--muted)',
      }}
    >
      {target}
    </button>
  );
};

// ── D&I Modal ─────────────────────────────────────────────────────────────────

const ANG_DIRS = ['Up', 'Down', 'Left', 'Right'] as const;

interface DiModalProps {
  data: RepairInspections;
  saving: boolean;
  onChange: (patch: Partial<RepairInspections>) => void;
  onSave: () => void;
  onClose: () => void;
}

const DiModal = ({ data, saving, onChange, onSave, onClose }: DiModalProps) => (
  <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={panel}>
      <div style={modalHeader}>
        <div>
          <div style={modalTitle}>D&amp;I Intake Inspection</div>
          <div style={modalSub}>Disassembly &amp; Inspection — incoming condition</div>
        </div>
        <button style={closeBtnStyle} onClick={onClose}>Close</button>
      </div>

      <div style={modalBody}>

        {/* Scope Condition */}
        <div>
          <div style={sectionLbl}>Scope Condition</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={fieldLbl}>Scope Repairable</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <YNBtn value={data.scopeRepairable} target="Y" onClick={() => onChange({ scopeRepairable: data.scopeRepairable === 'Y' ? '' : 'Y' })} />
                <YNBtn value={data.scopeRepairable} target="N" onClick={() => onChange({ scopeRepairable: data.scopeRepairable === 'N' ? '' : 'N' })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={fieldLbl}>Scope Usable</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <YNBtn value={data.scopeUsable} target="Y" onClick={() => onChange({ scopeUsable: data.scopeUsable === 'Y' ? '' : 'Y' })} />
                <YNBtn value={data.scopeUsable} target="N" onClick={() => onChange({ scopeUsable: data.scopeUsable === 'N' ? '' : 'N' })} />
              </div>
            </div>
          </div>
        </div>

        {/* Angulation IN */}
        <div>
          <div style={sectionLbl}>Angulation — Incoming</div>
          <table style={angTable}>
            <thead>
              <tr>
                <th style={angThLeft}>Direction</th>
                <th style={angTh}>In</th>
              </tr>
            </thead>
            <tbody>
              {ANG_DIRS.map(dir => (
                <tr key={dir}>
                  <td style={angTd}>{dir}</td>
                  <td style={angTdC}>
                    <input
                      value={(data[`angIn${dir}` as keyof RepairInspections] as string) ?? ''}
                      onChange={e => onChange({ [`angIn${dir}`]: e.target.value } as Partial<RepairInspections>)}
                      style={angInput}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fiber Readings */}
        <div>
          <div style={sectionLbl}>Fiber Readings</div>
          <div style={fiberGrid}>
            <div>
              <span style={fieldLbl}>Broken Fibers In</span>
              <input value={data.brokenFibersIn ?? ''} onChange={e => onChange({ brokenFibersIn: e.target.value })} style={fiberInput} />
            </div>
            <div>
              <span style={fieldLbl}>Fiber Angle</span>
              <input value={data.fiberAngle ?? ''} onChange={e => onChange({ fiberAngle: e.target.value })} style={fiberInput} />
            </div>
            <div>
              <span style={fieldLbl}>Light Transmission</span>
              <input value={data.fiberLightTrans ?? ''} onChange={e => onChange({ fiberLightTrans: e.target.value })} style={fiberInput} />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div>
          <div style={sectionLbl}>Comments</div>
          <textarea
            value={data.diInsComments ?? ''}
            onChange={e => onChange({ diInsComments: e.target.value })}
            placeholder="D&I inspection notes..."
            style={textarea}
          />
        </div>

      </div>

      <div style={modalFooter}>
        <button
          style={{ ...closeBtnStyle, border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--card)' }}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          style={{ ...saveBtnStyle, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save D&I'}
        </button>
      </div>
    </div>
  </div>
);

// ── Post-Repair Modal ──────────────────────────────────────────────────────────

const PF_FIELDS: { key: keyof RepairInspections; label: string }[] = [
  { key: 'insImagePF', label: 'Image' },
  { key: 'insLeakPF', label: 'Leak Test' },
  { key: 'insFiberLightTransPF', label: 'Fiber Light Trans' },
  { key: 'insAngulationPF', label: 'Angulation' },
  { key: 'insFocalDistancePF', label: 'Focal Distance' },
  { key: 'insImageCentrationPF', label: 'Image Centration' },
  { key: 'insFogPF', label: 'Fog' },
  { key: 'insHotColdLeakPF', label: 'Hot/Cold Leak' },
  { key: 'insSuctionPF', label: 'Suction' },
  { key: 'insForcepChannelPF', label: 'Forcep Channel' },
  { key: 'insAirWaterPF', label: 'Air/Water' },
  { key: 'insAuxWaterPF', label: 'Aux Water' },
  { key: 'insVisionPF', label: 'Vision' },
  { key: 'insInsertionTubePF', label: 'Insertion Tube' },
  { key: 'insUniversalCordPF', label: 'Universal Cord' },
  { key: 'insLightGuideConnectorPF', label: 'Light Guide Connector' },
  { key: 'insDistalTipPF', label: 'Distal Tip' },
  { key: 'insEyePiecePF', label: 'Eyepiece' },
  { key: 'insLightFibersPF', label: 'Light Fibers' },
  { key: 'insAlcoholWipePF', label: 'Alcohol Wipe' },
  { key: 'insFinalPF', label: 'Final' },
];

interface PostRepairModalProps {
  data: RepairInspections;
  saving: boolean;
  onChange: (patch: Partial<RepairInspections>) => void;
  onSave: () => void;
  onClose: () => void;
}

const PostRepairModal = ({ data, saving, onChange, onSave, onClose }: PostRepairModalProps) => {
  const passCount = PF_FIELDS.filter(f => data[f.key] === 'P').length;

  const markAllPass = () => {
    const patch: Partial<RepairInspections> = {};
    for (const f of PF_FIELDS) (patch as Record<string, string>)[f.key] = 'P';
    onChange(patch);
  };

  const clearAll = () => {
    const patch: Partial<RepairInspections> = {};
    for (const f of PF_FIELDS) (patch as Record<string, string>)[f.key] = '';
    onChange(patch);
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={modalHeader}>
          <div>
            <div style={modalTitle}>Post-Repair Inspection</div>
            <div style={modalSub}>Outgoing condition — pass/fail checkpoints</div>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>Close</button>
        </div>

        <div style={modalBody}>

          {/* Angulation OUT */}
          <div>
            <div style={sectionLbl}>Angulation — Outgoing</div>
            <table style={angTable}>
              <thead>
                <tr>
                  <th style={angThLeft}>Direction</th>
                  <th style={angTh}>Out</th>
                </tr>
              </thead>
              <tbody>
                {ANG_DIRS.map(dir => (
                  <tr key={dir}>
                    <td style={angTd}>{dir}</td>
                    <td style={angTdC}>
                      <input
                        value={(data[`angOut${dir}` as keyof RepairInspections] as string) ?? ''}
                        onChange={e => onChange({ [`angOut${dir}`]: e.target.value } as Partial<RepairInspections>)}
                        style={angInput}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Broken Fibers Out */}
          <div>
            <div style={sectionLbl}>Fiber Readings — Outgoing</div>
            <div style={{ maxWidth: 240 }}>
              <span style={fieldLbl}>Broken Fibers Out</span>
              <input value={data.brokenFibersOut ?? ''} onChange={e => onChange({ brokenFibersOut: e.target.value })} style={fiberInput} />
            </div>
          </div>

          {/* P/F Checkpoints */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={sectionLbl}>Pass / Fail Checkpoints</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{passCount}/{PF_FIELDS.length} Pass</span>
                <button
                  onClick={markAllPass}
                  style={{ fontSize: 10, padding: '2px 8px', border: '1px solid var(--success)', borderRadius: 4, background: 'var(--card)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Mark All Pass
                </button>
                <button
                  onClick={clearAll}
                  style={{ fontSize: 10, padding: '2px 8px', border: '1px solid var(--neutral-200)', borderRadius: 4, background: 'var(--card)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={pfGrid}>
              {PF_FIELDS.map(f => (
                <div key={f.key} style={pfRow}>
                  <span style={pfLabel}>{f.label}</span>
                  <div style={pfBtnRow}>
                    <PFBtn value={data[f.key] as string | undefined} target="P" onClick={() => onChange({ [f.key]: data[f.key] === 'P' ? '' : 'P' } as Partial<RepairInspections>)} />
                    <PFBtn value={data[f.key] as string | undefined} target="F" onClick={() => onChange({ [f.key]: data[f.key] === 'F' ? '' : 'F' } as Partial<RepairInspections>)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div style={modalFooter}>
          <button
            style={{ ...closeBtnStyle, border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--card)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ ...saveBtnStyle, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Post-Repair'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Selector Card ──────────────────────────────────────────────────────────────

interface SelectorCardProps {
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
  icon: React.ReactNode;
}

const SelectorCard = ({ title, subtitle, badge, badgeColor, onClick, icon }: SelectorCardProps) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 16,
      padding: '20px 22px', border: '1.5px solid var(--border-dk)',
      borderRadius: 10, background: 'var(--card)', cursor: 'pointer',
      textAlign: 'left', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
    className="tab-card-hover"
  >
    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(var(--navy-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{subtitle}</div>
    </div>
    {badge && (
      <div style={{ fontSize: 11, fontWeight: 700, color: badgeColor ?? 'var(--muted)', background: 'var(--neutral-50)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', flexShrink: 0 }}>
        {badge}
      </div>
    )}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} style={{ color: 'var(--muted)', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </button>
);

// ── Main Tab ──────────────────────────────────────────────────────────────────

interface InspectionsTabProps {
  repairKey: number;
}

export const InspectionsTab = ({ repairKey }: InspectionsTabProps) => {
  const [data, setData] = useState<RepairInspections | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diOpen, setDiOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRepairInspections(repairKey)
      .then(setData)
      .catch(() => message.error('Failed to load inspections'))
      .finally(() => setLoading(false));
  }, [repairKey]);

  const patch = useCallback((update: Partial<RepairInspections>) => {
    setData(prev => prev ? { ...prev, ...update } : prev);
  }, []);

  const saveAndClose = useCallback(async (closeFn: () => void) => {
    if (!data) return;
    setSaving(true);
    try {
      await updateRepairInspections(repairKey, data);
      message.success('Saved');
      closeFn();
    } catch {
      message.error('Failed to save inspections');
    } finally {
      setSaving(false);
    }
  }, [data, repairKey]);

  if (loading) return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 12 }}>Loading inspections...</div>;
  if (!data) return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 12 }}>No inspection data</div>;

  // Status badges
  const diDone = !!(data.scopeRepairable || data.scopeUsable || data.angInUp || data.angInDown || data.diInsComments);
  const pfPassCount = PF_FIELDS.filter(f => data[f.key] === 'P').length;
  const pfFailCount = PF_FIELDS.filter(f => data[f.key] === 'F').length;
  const postDone = pfPassCount + pfFailCount > 0;

  return (
    <>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
          Select Inspection Type
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <SelectorCard
            title="D&I Intake"
            subtitle="Incoming condition, angulation, fiber readings"
            badge={diDone ? 'Recorded' : 'Not started'}
            badgeColor={diDone ? 'var(--success)' : undefined}
            onClick={() => setDiOpen(true)}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <SelectorCard
            title="Post-Repair"
            subtitle="Outgoing angulation, pass/fail checkpoints"
            badge={postDone ? `${pfPassCount}P / ${pfFailCount}F` : 'Not started'}
            badgeColor={postDone ? (pfFailCount > 0 ? 'var(--danger)' : 'var(--success)') : undefined}
            onClick={() => setPostOpen(true)}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
          />
        </div>
      </div>

      {diOpen && (
        <DiModal
          data={data}
          saving={saving}
          onChange={patch}
          onSave={() => saveAndClose(() => setDiOpen(false))}
          onClose={() => setDiOpen(false)}
        />
      )}

      {postOpen && (
        <PostRepairModal
          data={data}
          saving={saving}
          onChange={patch}
          onSave={() => saveAndClose(() => setPostOpen(false))}
          onClose={() => setPostOpen(false)}
        />
      )}
    </>
  );
};
