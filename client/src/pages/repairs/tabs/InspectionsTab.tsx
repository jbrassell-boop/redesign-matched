import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairInspections } from '../types';
import { getRepairInspections, updateRepairInspections } from '../../../api/repairs';

// ── Shared styles ─────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1100,
  background: 'rgba(0,0,0,0.48)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '28px 16px', overflowY: 'auto',
};
const panel: React.CSSProperties = {
  width: 720, background: 'var(--card)', borderRadius: 10,
  boxShadow: '0 8px 40px rgba(0,0,0,0.24)', overflow: 'hidden', flexShrink: 0,
};
const modalHeader: React.CSSProperties = {
  background: 'var(--navy)', color: '#fff',
  padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const modalTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' };
const modalSub: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 };
const modalBody: React.CSSProperties = {
  padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12,
  maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
};
const sectionBlock: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
};
const sectionHead: React.CSSProperties = {
  background: 'var(--neutral-50)', padding: '5px 10px',
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--navy)',
  borderBottom: '1px solid var(--border)',
};
const sectionBody: React.CSSProperties = { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 };
const pfRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 };
const pfLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--text)', flex: 1 };
const pfBtnRow: React.CSSProperties = { display: 'flex', gap: 3, flexShrink: 0 };
const fieldLbl: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 2 };
const angInput: React.CSSProperties = {
  width: 56, fontSize: 11, textAlign: 'center',
  border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px',
  fontFamily: 'inherit',
};
const textInput: React.CSSProperties = {
  width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)',
  borderRadius: 3, padding: '3px 6px', fontFamily: 'inherit', boxSizing: 'border-box' as const,
};
const textarea: React.CSSProperties = {
  width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)',
  borderRadius: 4, padding: '6px 8px', fontFamily: 'inherit',
  resize: 'vertical' as const, minHeight: 60, boxSizing: 'border-box' as const,
};
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
const cancelBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 12px', border: '1px solid var(--border)',
  borderRadius: 5, background: 'var(--card)', color: 'var(--muted)',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const modalFooter: React.CSSProperties = {
  padding: '12px 20px', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  background: 'var(--neutral-50)',
};

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

const YNBtn = ({ value, target, onClick }: { value?: string; target: 'Y' | 'N'; onClick: () => void }) => {
  const active = value === target;
  return (
    <button onClick={onClick} style={{
      width: 34, height: 28, border: '1px solid var(--neutral-200)', borderRadius: 3,
      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      background: active ? (target === 'Y' ? 'var(--success)' : 'var(--danger)') : 'var(--card)',
      color: active ? '#fff' : 'var(--muted)',
    }}>{target}</button>
  );
};

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
    <div style={pfRow}>
      <span style={pfLabel}>{label}</span>
      <div style={pfBtnRow}>
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
  <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={panel}>
      <div style={modalHeader}>
        <div>
          <div style={modalTitle}>Flexible Endoscope Diagnostic Report</div>
          <div style={modalSub}>OM05-1 — D&amp;I Intake Inspection</div>
        </div>
        <button style={closeBtnStyle} onClick={onClose}>Close</button>
      </div>

      <div style={modalBody}>

        {/* 3A — Leak Test & Fluid Invasion */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3A · Leak Test &amp; Fluid Invasion</div>
          <div style={sectionBody}>
            <PFLine label="Leak Test Performed" pfKey="insLeakPF" data={data} onChange={onChange} />
            <PFLine label="Fluid Invasion Detected" pfKey="insHotColdLeakPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3B — Angulation System */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3B · Angulation System</div>
          <div style={sectionBody}>
            {/* Degree inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 6 }}>
              {ANG_DIRS.map(dir => (
                <div key={dir}>
                  <span style={fieldLbl}>{dir} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(factory {ANG_FACTORY[dir]})</span></span>
                  <input
                    value={(data[`angIn${dir}` as PFKey] as string) ?? ''}
                    onChange={e => onChange({ [`angIn${dir}`]: e.target.value } as Partial<RepairInspections>)}
                    placeholder={ANG_FACTORY[dir]}
                    style={angInput}
                  />
                </div>
              ))}
            </div>
            <PFLine label="Angulation System (Play / Stiff / Grinding / Cable / Slip Stopper / Bracket)" pfKey="insAngulationPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3C — Image & Light Transmission */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3C · Image &amp; Light Transmission</div>
          <div style={sectionBody}>
            <PFLine label="Video Image (No Image / Static / Lens Sep / Imperfection)" pfKey="insImagePF" data={data} onChange={onChange} />
            <PFLine label="Light Bundle (Slip from Tip / Broken Fibers)" pfKey="insLightFibersPF" data={data} onChange={onChange} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '2px 0' }}>
              <div style={{ flex: 1 }}>
                <span style={fieldLbl}>Broken Fibers — % In</span>
                <input value={data.brokenFibersIn ?? ''} onChange={e => onChange({ brokenFibersIn: e.target.value })} style={textInput} placeholder="e.g. N/A" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={fieldLbl}>Fiber Angle</span>
                <input value={data.fiberAngle ?? ''} onChange={e => onChange({ fiberAngle: e.target.value })} style={textInput} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={fieldLbl}>Fiber Light Trans %</span>
                <input value={data.fiberLightTrans ?? ''} onChange={e => onChange({ fiberLightTrans: e.target.value })} style={textInput} />
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
        <div style={sectionBlock}>
          <div style={sectionHead}>3D · Channel Function</div>
          <div style={sectionBody}>
            <PFLine label="Suction Channel (Blocked / Leaking / Impeded)" pfKey="insSuctionPF" data={data} onChange={onChange} />
            <PFLine label="Forcep / Biopsy Channel (Blocked / Leaking / Port Seal)" pfKey="insForcepChannelPF" data={data} onChange={onChange} />
            <PFLine label="Auxiliary Water Channel (Blocked / Leaking / Loose / Weak)" pfKey="insAuxWaterPF" data={data} onChange={onChange} />
            <PFLine label="A/W System Channel (Kinked / Clogged / Leaking / Nozzle)" pfKey="insAirWaterPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3E — Electrical & Connector Integrity */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3E · Electrical &amp; Connector Integrity</div>
          <div style={sectionBody}>
            <PFLine label="Light Guide Connector (LGC) — Alignment Pin / Prong / Lens / ETO Valve" pfKey="insLightGuideConnectorPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3F — Control Body (info only, see comments) */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3F · Control Body</div>
          <div style={{ ...sectionBody }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
              Control Body Housing / Elevator Function — record findings in Comments below.
            </span>
          </div>
        </div>

        {/* 3G — Insertion Tube */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3G · Insertion Tube</div>
          <div style={sectionBody}>
            <PFLine label="Insertion Tube Surface (Dented / Buckled / Cut / Peeling / Discolored)" pfKey="insInsertionTubePF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3H — Distal Tip & Adhesive Surfaces */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3H · Distal Tip &amp; Adhesive Surfaces</div>
          <div style={sectionBody}>
            <PFLine label="Distal Tip / C-Cover / Bending Rubber / Section Mesh" pfKey="insDistalTipPF" data={data} onChange={onChange} />
            <PFLine label="Lenses (Cracked / Chipped / Dirty / Glue Missing)" pfKey="insEyePiecePF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 3I — Universal Cord & Boots */}
        <div style={sectionBlock}>
          <div style={sectionHead}>3I · Universal Cord &amp; Boots</div>
          <div style={sectionBody}>
            <PFLine label="Universal Cord (Dented / Buckled / Cut / Peeling)" pfKey="insUniversalCordPF" data={data} onChange={onChange} />
          </div>
        </div>

        {/* 4 — Detailed Inspection */}
        <div style={sectionBlock}>
          <div style={sectionHead}>4 · Detailed Inspection</div>
          <div style={sectionBody}>
            <PFLine label="Internal Channels (Freckling / Debris / Scratched / Deformed)" pfKey="insImageCentrationPF" data={data} onChange={onChange} />
            <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic', marginTop: -2 }}>
              Residue / Photos Taken — note in Comments
            </span>
          </div>
        </div>

        {/* Scope Condition */}
        <div style={sectionBlock}>
          <div style={sectionHead}>Scope Condition</div>
          <div style={{ ...sectionBody, flexDirection: 'row', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
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
          <span style={{ ...fieldLbl, marginBottom: 4 }}>5 · Repair Assessment / Tech Notes</span>
          <textarea
            value={data.diInsComments ?? ''}
            onChange={e => onChange({ diInsComments: e.target.value })}
            placeholder="Tech notes, control body findings, residue location, photos taken..."
            style={textarea}
          />
        </div>

      </div>

      <div style={modalFooter}>
        <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
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
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={modalHeader}>
          <div>
            <div style={modalTitle}>Post-Repair Inspection</div>
            <div style={modalSub}>Outgoing condition — verify all repairs complete</div>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>Close</button>
        </div>

        <div style={modalBody}>

          {/* Angulation OUT */}
          <div style={sectionBlock}>
            <div style={sectionHead}>Angulation — Outgoing</div>
            <div style={{ ...sectionBody, flexDirection: 'row', gap: 12 }}>
              {ANG_DIRS.map(dir => (
                <div key={dir} style={{ flex: 1 }}>
                  <span style={fieldLbl}>{dir} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(factory {ANG_FACTORY[dir]})</span></span>
                  <input
                    value={(data[`angOut${dir}` as PFKey] as string) ?? ''}
                    onChange={e => onChange({ [`angOut${dir}`]: e.target.value } as Partial<RepairInspections>)}
                    placeholder={ANG_FACTORY[dir]}
                    style={angInput}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Broken Fibers Out */}
          <div style={sectionBlock}>
            <div style={sectionHead}>Fiber Readings — Outgoing</div>
            <div style={{ ...sectionBody, flexDirection: 'row', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={fieldLbl}>Broken Fibers — % Out</span>
                <input value={data.brokenFibersOut ?? ''} onChange={e => onChange({ brokenFibersOut: e.target.value })} style={textInput} placeholder="e.g. N/A" />
              </div>
            </div>
          </div>

          {/* P/F verification by section */}
          <div style={sectionBlock}>
            <div style={{ ...sectionHead, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Pass / Fail Verification</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: failCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                  {passCount}P / {failCount}F
                </span>
                <button onClick={markAllPass} style={{ fontSize: 10, padding: '1px 8px', border: '1px solid var(--success)', borderRadius: 4, background: 'var(--card)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                  Mark All Pass
                </button>
              </div>
            </div>
            <div style={sectionBody}>
              {POST_SECTIONS.map(sec => (
                <div key={sec.cat} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                    {sec.cat}
                  </div>
                  {sec.items.map(f => (
                    <div key={f.key} style={pfRow}>
                      <span style={pfLabel}>{f.label}</span>
                      <div style={pfBtnRow}>
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

        <div style={modalFooter}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
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

  const diDone = !!(data.scopeRepairable || data.scopeUsable || data.angInUp || data.diInsComments);
  const pfPassCount = ALL_PF_KEYS.filter(k => data[k] === 'P').length;
  const pfFailCount = ALL_PF_KEYS.filter(k => data[k] === 'F').length;
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
