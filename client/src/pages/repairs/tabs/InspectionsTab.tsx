import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairInspections } from '../types';
import { getRepairInspections, updateRepairInspections } from '../../../api/repairs';
import './InspectionsTab.css';

// ── Shared P/F keys type ──────────────────────────────────────────────────────

type PFKey = keyof RepairInspections;

// ── Buttons ───────────────────────────────────────────────────────────────────

const PFBtn = ({ value, target, onClick }: { value?: string; target: 'P' | 'F'; onClick: () => void }) => {
  const active = value === target;
  return (
    <button onClick={onClick} style={{
      width: 28, height: 24, border: '1px solid var(--neutral-200)', borderRadius: 3,
      fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      background: active ? (target === 'P' ? 'var(--success)' : 'var(--danger)') : 'var(--card)',
      color: active ? '#fff' : 'var(--muted)',
    }}>{target}</button>
  );
};

const NaBtn = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{
    width: 28, height: 24, border: '1px solid var(--neutral-200)', borderRadius: 3,
    fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--muted)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
  }}>N/A</button>
);

// Note: PFBtn and NaBtn retain inline styles because background and color are dynamic (active state)


// ── PF row helper ─────────────────────────────────────────────────────────────

const PFLine = ({
  label, pfKey, naKey, data, onChange,
}: {
  label: string;
  pfKey: PFKey;
  naKey?: PFKey;
  data: RepairInspections;
  onChange: (p: Partial<RepairInspections>) => void;
}) => {
  const val = data[pfKey] as string | undefined;
  const naVal = naKey ? (data[naKey] as string | undefined) : undefined;
  const isNA = naVal === 'NA';

  const toggle = (target: 'P' | 'F') =>
    onChange({ [pfKey]: val === target ? '' : target } as Partial<RepairInspections>);

  return (
    <div className="insp-pf-row">
      <span className="insp-pf-label">{label}</span>
      <div className="insp-pf-btn-row">
        <PFBtn value={val} target="P" onClick={() => toggle('P')} />
        <PFBtn value={val} target="F" onClick={() => toggle('F')} />
        {naKey && (
          <NaBtn
            active={isNA}
            onClick={() => onChange({ [naKey]: isNA ? '' : 'NA' } as Partial<RepairInspections>)}
          />
        )}
      </div>
    </div>
  );
};

// ── D&I P/F sections — OM05-1 Flexible Endoscope Diagnostic Report ─────────────

// Maps real form sections to DB columns. N/A uses a secondary PF column as a flag.
// Sections without DB columns are shown for context (info only).

const ANG_DIRS = ['Up', 'Down', 'Left', 'Right'] as const;
const ANG_FACTORY = { Up: '180°', Down: '180°', Left: '160°', Right: '160°' };

// All PF keys used across both modals
const ALL_PF_KEYS: PFKey[] = [
  'insLeakPF', 'insHotColdLeakPF',
  'insAngulationPF',
  'insImagePF', 'insLightFibersPF', 'insFiberLightTransPF', 'insVisionPF',
  'insImageCentrationPF', 'insFocalDistancePF', 'insFogPF',
  'insSuctionPF', 'insForcepChannelPF', 'insAuxWaterPF', 'insAirWaterPF',
  'insLightGuideConnectorPF',
  'insInsertionTubePF',
  'insDistalTipPF', 'insEyePiecePF',
  'insUniversalCordPF',
  'insAlcoholWipePF', 'insFinalPF',
];

// ── D&I Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  data: RepairInspections;
  saving: boolean;
  onChange: (patch: Partial<RepairInspections>) => void;
  onSave: () => void;
  onClose: () => void;
}

const DiModal = ({ data, saving, onChange, onSave, onClose }: ModalProps) => (
  <div className="insp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="insp-panel">
      <div className="insp-modal-header">
        <div>
          <div className="insp-modal-title">Flexible Endoscope Diagnostic Report</div>
          <div className="insp-modal-sub">OM05-1 — D&amp;I Intake Inspection</div>
        </div>
        <button className="insp-close-btn" onClick={onClose}>Close</button>
      </div>

      <div className="insp-modal-body">

        {/* 3A — Leak Test & Fluid Invasion */}
        <div className="insp-section-block">
          <div className="insp-section-head">3A · Leak Test &amp; Fluid Invasion</div>
          <div className="insp-section-body">
            <PFLine label="Leak Test Performed" pfKey="insLeakPF" data={data} onChange={onChange} />
            <PFLine label="Fluid Invasion Detected" pfKey="insHotColdLeakPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3B — Angulation System */}
        <div className="insp-section-block">
          <div className="insp-section-head">3B · Angulation System</div>
          <div className="insp-section-body">
            {/* Degree inputs */}
            <div className="insp-ang-grid">
              {ANG_DIRS.map(dir => (
                <div key={dir}>
                  <span className="insp-field-lbl">{dir} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(factory {ANG_FACTORY[dir]})</span></span>
                  <input
                    value={(data[`angIn${dir}` as PFKey] as string) ?? ''}
                    onChange={e => onChange({ [`angIn${dir}`]: e.target.value } as Partial<RepairInspections>)}
                    placeholder={ANG_FACTORY[dir]}
                    className="insp-ang-input"
                  />
                </div>
              ))}
            </div>
            <PFLine label="Angulation System (Play / Stiff / Grinding / Cable / Slip Stopper / Bracket)" pfKey="insAngulationPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3C — Image & Light Transmission */}
        <div className="insp-section-block">
          <div className="insp-section-head">3C · Image &amp; Light Transmission</div>
          <div className="insp-section-body">
            <PFLine label="Video Image (No Image / Static / Lens Sep / Imperfection)" pfKey="insImagePF" data={data} onChange={onChange} />
            <PFLine label="Light Bundle (Slip from Tip / Broken Fibers)" pfKey="insLightFibersPF" data={data} onChange={onChange} />
            <div className="insp-trio-row">
              <div className="insp-trio-cell">
                <span className="insp-field-lbl">Broken Fibers — % In</span>
                <input value={data.brokenFibersIn ?? ''} onChange={e => onChange({ brokenFibersIn: e.target.value })} className="insp-text-input" placeholder="e.g. N/A" />
              </div>
              <div className="insp-trio-cell">
                <span className="insp-field-lbl">Fiber Angle</span>
                <input value={data.fiberAngle ?? ''} onChange={e => onChange({ fiberAngle: e.target.value })} className="insp-text-input" />
              </div>
              <div className="insp-trio-cell">
                <span className="insp-field-lbl">Fiber Light Trans %</span>
                <input value={data.fiberLightTrans ?? ''} onChange={e => onChange({ fiberLightTrans: e.target.value })} className="insp-text-input" />
              </div>
            </div>
            <PFLine label="Fiber Light Transmission" pfKey="insFiberLightTransPF" data={data} onChange={onChange} />
            <PFLine label="Video Features (Data / WB / NBI / Dual Focus / Orientation)" pfKey="insVisionPF" data={data} onChange={onChange} />
            <PFLine label="Focal Distance" pfKey="insFocalDistancePF" data={data} onChange={onChange} />
            <PFLine label="Image Centration" pfKey="insImageCentrationPF" data={data} onChange={onChange} />
            <PFLine label="Fog" pfKey="insFogPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3D — Channel Function */}
        <div className="insp-section-block">
          <div className="insp-section-head">3D · Channel Function</div>
          <div className="insp-section-body">
            <PFLine label="Suction Channel (Blocked / Leaking / Impeded)" pfKey="insSuctionPF" data={data} onChange={onChange} />
            <PFLine label="Forcep / Biopsy Channel (Blocked / Leaking / Port Seal)" pfKey="insForcepChannelPF" data={data} onChange={onChange} />
            <PFLine label="Auxiliary Water Channel (Blocked / Leaking / Loose / Weak)" pfKey="insAuxWaterPF" data={data} onChange={onChange} />
            <PFLine label="A/W System Channel (Kinked / Clogged / Leaking / Nozzle)" pfKey="insAirWaterPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3E — Electrical & Connector Integrity */}
        <div className="insp-section-block">
          <div className="insp-section-head">3E · Electrical &amp; Connector Integrity</div>
          <div className="insp-section-body">
            <PFLine label="Light Guide Connector (LGC) — Alignment Pin / Prong / Lens / ETO Valve" pfKey="insLightGuideConnectorPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3F — Control Body (info only, see comments) */}
        <div className="insp-section-block">
          <div className="insp-section-head">3F · Control Body</div>
          <div className="insp-section-body">
            <span className="insp-italic-note">
              Control Body Housing / Elevator Function — record findings in Comments below.
            </span>
          </div>
        </div>

        {/* 3G — Insertion Tube */}
        <div className="insp-section-block">
          <div className="insp-section-head">3G · Insertion Tube</div>
          <div className="insp-section-body">
            <PFLine label="Insertion Tube Surface (Dented / Buckled / Cut / Peeling / Discolored)" pfKey="insInsertionTubePF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3H — Distal Tip & Adhesive Surfaces */}
        <div className="insp-section-block">
          <div className="insp-section-head">3H · Distal Tip &amp; Adhesive Surfaces</div>
          <div className="insp-section-body">
            <PFLine label="Distal Tip / C-Cover / Bending Rubber / Section Mesh" pfKey="insDistalTipPF" data={data} onChange={onChange} />
            <PFLine label="Lenses (Cracked / Chipped / Dirty / Glue Missing)" pfKey="insEyePiecePF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3I — Universal Cord & Boots */}
        <div className="insp-section-block">
          <div className="insp-section-head">3I · Universal Cord &amp; Boots</div>
          <div className="insp-section-body">
            <PFLine label="Universal Cord (Dented / Buckled / Cut / Peeling)" pfKey="insUniversalCordPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 4 — Detailed Inspection */}
        <div className="insp-section-block">
          <div className="insp-section-head">4 · Detailed Inspection</div>
          <div className="insp-section-body">
            <PFLine label="Internal Channels (Freckling / Debris / Scratched / Deformed)" pfKey="insImageCentrationPF" data={data} onChange={onChange} />
            <span className="insp-italic-note-sm">
              Residue / Photos Taken — note in Comments
            </span>
          </div>
        </div>

        {/* Scope Condition */}
        <div className="insp-section-block">
          <div className="insp-section-head">Scope Condition</div>
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['Not Patient Safe', 'Functional Issue', 'Cosmetic Only', 'No Issues Found'] as const).map(opt => {
              // map to scopeRepairable / scopeUsable
              const isActive =
                opt === 'Not Patient Safe' ? (data.scopeRepairable === 'N' && data.scopeUsable === 'N') :
                opt === 'Functional Issue' ? (data.scopeRepairable === 'Y' && data.scopeUsable === 'N') :
                opt === 'Cosmetic Only' ? (data.scopeRepairable === 'Y' && data.scopeUsable === 'Y' && !!data.diInsComments?.includes('Cosmetic')) :
                (data.scopeRepairable === 'Y' && data.scopeUsable === 'Y' && !data.diInsComments?.includes('Cosmetic'));

              const select = () => {
                if (opt === 'Not Patient Safe') onChange({ scopeRepairable: 'N', scopeUsable: 'N' });
                else if (opt === 'Functional Issue') onChange({ scopeRepairable: 'Y', scopeUsable: 'N' });
                else if (opt === 'Cosmetic Only') onChange({ scopeRepairable: 'Y', scopeUsable: 'Y' });
                else onChange({ scopeRepairable: 'Y', scopeUsable: 'Y' });
              };

              return (
                <button
                  key={opt}
                  onClick={select}
                  style={{
                    padding: '5px 12px', border: '1.5px solid', borderRadius: 5,
                    fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: isActive ? (
                      opt === 'Not Patient Safe' ? 'var(--danger)' :
                      opt === 'Functional Issue' ? 'var(--warning)' :
                      opt === 'Cosmetic Only' ? 'var(--primary)' : 'var(--success)'
                    ) : 'var(--border)',
                    background: isActive ? (
                      opt === 'Not Patient Safe' ? 'rgba(var(--danger-rgb),0.08)' :
                      opt === 'Functional Issue' ? 'rgba(var(--amber-rgb),0.08)' :
                      opt === 'Cosmetic Only' ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(var(--success-rgb),0.08)'
                    ) : 'var(--card)',
                    color: isActive ? (
                      opt === 'Not Patient Safe' ? 'var(--danger)' :
                      opt === 'Functional Issue' ? 'var(--warning)' :
                      opt === 'Cosmetic Only' ? 'var(--primary)' : 'var(--success)'
                    ) : 'var(--muted)',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 — Comments / Tech Notes */}
        <div>
          <span className="insp-field-lbl" style={{ marginBottom: 4 }}>5 · Repair Assessment / Tech Notes</span>
          <textarea
            value={data.diInsComments ?? ''}
            onChange={e => onChange({ diInsComments: e.target.value })}
            placeholder="Tech notes, control body findings, residue location, photos taken..."
            className="insp-textarea"
          />
        </div>

      </div>

      <div className="insp-modal-footer">
        <button className="insp-cancel-btn" onClick={onClose}>Cancel</button>
        <button
          className="insp-save-btn"
          style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
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

const POST_SECTIONS: { cat: string; items: { key: PFKey; label: string }[] }[] = [
  {
    cat: '3A · Leak & Pressure',
    items: [
      { key: 'insLeakPF', label: 'Leak Test' },
      { key: 'insHotColdLeakPF', label: 'Hot/Cold Leak' },
    ],
  },
  {
    cat: '3B · Angulation',
    items: [{ key: 'insAngulationPF', label: 'Angulation System' }],
  },
  {
    cat: '3C · Image & Light',
    items: [
      { key: 'insImagePF', label: 'Video Image' },
      { key: 'insLightFibersPF', label: 'Light Bundle' },
      { key: 'insFiberLightTransPF', label: 'Fiber Light Transmission' },
      { key: 'insVisionPF', label: 'Video Features' },
      { key: 'insFocalDistancePF', label: 'Focal Distance' },
      { key: 'insImageCentrationPF', label: 'Image Centration' },
      { key: 'insFogPF', label: 'Fog' },
    ],
  },
  {
    cat: '3D · Channels',
    items: [
      { key: 'insSuctionPF', label: 'Suction Channel' },
      { key: 'insForcepChannelPF', label: 'Forcep / Biopsy Channel' },
      { key: 'insAuxWaterPF', label: 'Auxiliary Water Channel' },
      { key: 'insAirWaterPF', label: 'A/W System Channel' },
    ],
  },
  {
    cat: '3E · Connector',
    items: [{ key: 'insLightGuideConnectorPF', label: 'Light Guide Connector (LGC)' }],
  },
  {
    cat: '3G-3I · Scope Body',
    items: [
      { key: 'insInsertionTubePF', label: 'Insertion Tube' },
      { key: 'insDistalTipPF', label: 'Distal Tip' },
      { key: 'insEyePiecePF', label: 'Lenses' },
      { key: 'insUniversalCordPF', label: 'Universal Cord' },
    ],
  },
  {
    cat: 'Sign-Off',
    items: [
      { key: 'insAlcoholWipePF', label: 'Alcohol Wipe' },
      { key: 'insFinalPF', label: 'Final Approval' },
    ],
  },
];

const PostRepairModal = ({ data, saving, onChange, onSave, onClose }: ModalProps) => {
  const toggle = (key: PFKey, target: 'P' | 'F') =>
    onChange({ [key]: (data[key] as string | undefined) === target ? '' : target } as Partial<RepairInspections>);

  const passCount = ALL_PF_KEYS.filter(k => data[k] === 'P').length;
  const failCount = ALL_PF_KEYS.filter(k => data[k] === 'F').length;

  const markAllPass = () => {
    const patch: Partial<RepairInspections> = {};
    for (const k of ALL_PF_KEYS) (patch as Record<string, string>)[k] = 'P';
    onChange(patch);
  };

  return (
    <div className="insp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="insp-panel">
        <div className="insp-modal-header">
          <div>
            <div className="insp-modal-title">Post-Repair Inspection</div>
            <div className="insp-modal-sub">Outgoing condition — verify all repairs complete</div>
          </div>
          <button className="insp-close-btn" onClick={onClose}>Close</button>
        </div>

        <div className="insp-modal-body">

          {/* Angulation OUT */}
          <div className="insp-section-block">
            <div className="insp-section-head">Angulation — Outgoing</div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'row', gap: 12 }}>
              {ANG_DIRS.map(dir => (
                <div key={dir} style={{ flex: 1 }}>
                  <span className="insp-field-lbl">{dir} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(factory {ANG_FACTORY[dir]})</span></span>
                  <input
                    value={(data[`angOut${dir}` as PFKey] as string) ?? ''}
                    onChange={e => onChange({ [`angOut${dir}`]: e.target.value } as Partial<RepairInspections>)}
                    placeholder={ANG_FACTORY[dir]}
                    className="insp-ang-input"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Broken Fibers Out */}
          <div className="insp-section-block">
            <div className="insp-section-head">Fiber Readings — Outgoing</div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'row', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span className="insp-field-lbl">Broken Fibers — % Out</span>
                <input value={data.brokenFibersOut ?? ''} onChange={e => onChange({ brokenFibersOut: e.target.value })} className="insp-text-input" placeholder="e.g. N/A" />
              </div>
            </div>
          </div>

          {/* P/F verification by section */}
          <div className="insp-section-block">
            <div className="insp-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Pass / Fail Verification</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={failCount > 0 ? 'insp-pf-count-fail' : 'insp-pf-count-pass'}>
                  {passCount}P / {failCount}F
                </span>
                <button onClick={markAllPass} className="insp-mark-all-btn">
                  Mark All Pass
                </button>
              </div>
            </div>
            <div className="insp-section-body">
              {POST_SECTIONS.map(sec => (
                <div key={sec.cat} className="insp-section-cat-wrap">
                  <div className="insp-section-cat-lbl">
                    {sec.cat}
                  </div>
                  {sec.items.map(f => (
                    <div key={f.key} className="insp-pf-row">
                      <span className="insp-pf-label">{f.label}</span>
                      <div className="insp-pf-btn-row">
                        <PFBtn value={data[f.key] as string | undefined} target="P" onClick={() => toggle(f.key, 'P')} />
                        <PFBtn value={data[f.key] as string | undefined} target="F" onClick={() => toggle(f.key, 'F')} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="insp-modal-footer">
          <button className="insp-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="insp-save-btn"
            style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
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
    className="insp-sel-card tab-card-hover"
  >
    <div className="insp-sel-icon">
      {icon}
    </div>
    <div className="insp-sel-body">
      <div className="insp-sel-title">{title}</div>
      <div className="insp-sel-subtitle">{subtitle}</div>
    </div>
    {badge && (
      <div className="insp-sel-badge" style={{ color: badgeColor ?? 'var(--muted)' }}>
        {badge}
      </div>
    )}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16} className="insp-sel-chevron">
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

  if (loading) return <div className="insp-loading">Loading inspections...</div>;
  if (!data) return <div className="insp-loading">No inspection data</div>;

  const diDone = !!(data.scopeRepairable || data.scopeUsable || data.angInUp || data.diInsComments);
  const pfPassCount = ALL_PF_KEYS.filter(k => data[k] === 'P').length;
  const pfFailCount = ALL_PF_KEYS.filter(k => data[k] === 'F').length;
  const postDone = pfPassCount + pfFailCount > 0;

  return (
    <>
      <div className="insp-selector-wrap">
        <div className="insp-selector-header">
          Select Inspection Type
        </div>
        <div className="insp-selector-row">
          <SelectorCard
            title="D&I Intake"
            subtitle="OM05-1 — Flexible Endoscope Diagnostic Report"
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
            subtitle="Outgoing angulation, pass/fail verification"
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
