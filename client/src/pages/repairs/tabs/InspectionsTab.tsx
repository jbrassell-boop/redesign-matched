import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairInspections } from '../types';
import { getRepairInspections, updateRepairInspections } from '../../../api/repairs';
import { SectionCard } from '../../../components/shared';

interface InspectionsTabProps {
  repairKey: number;
}

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
];

const ANG_DIRS = ['Up', 'Down', 'Left', 'Right'] as const;

const PFButton = ({ value, target, onClick }: { value: string | undefined; target: 'P' | 'F'; onClick: () => void }) => {
  const active = value === target;
  const isPass = target === 'P';
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 22, border: '1px solid var(--neutral-200)', borderRadius: 3,
        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: active ? (isPass ? 'var(--success)' : 'var(--danger)') : 'var(--card)',
        color: active ? 'var(--card)' : 'var(--muted)',
      }}
    >
      {target}
    </button>
  );
};

export const InspectionsTab = ({ repairKey }: InspectionsTabProps) => {
  const [data, setData] = useState<RepairInspections | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRepairInspections(repairKey).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [repairKey]);

  const update = useCallback((key: keyof RepairInspections, value: string) => {
    setData(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const togglePF = useCallback((key: keyof RepairInspections, target: 'P' | 'F') => {
    setData(prev => {
      if (!prev) return prev;
      const current = prev[key];
      return { ...prev, [key]: current === target ? '' : target };
    });
  }, []);

  const handleMarkAllPass = useCallback(() => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      for (const f of PF_FIELDS) {
        (updated as Record<string, string | undefined>)[f.key] = 'P';
      }
      return updated;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      for (const f of PF_FIELDS) {
        (updated as Record<string, string | undefined>)[f.key] = '';
      }
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateRepairInspections(repairKey, data);
      message.success('Inspections saved');
    } catch {
      message.error('Failed to save inspections');
    } finally {
      setSaving(false);
    }
  }, [data, repairKey]);

  if (loading) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 12 }}>Loading inspections...</div>;
  if (!data) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 12 }}>No inspection data</div>;

  const passCount = PF_FIELDS.filter(f => data[f.key] === 'P').length;
  const totalPF = PF_FIELDS.length;

  const angKey = (prefix: 'angIn' | 'angOut', dir: string) =>
    `${prefix}${dir}` as keyof RepairInspections;

  return (
    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      {/* Top row: Angulation + D&I */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SectionCard title="Incoming D&I">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Scope Repairable</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  <PFButton value={data.scopeRepairable ?? ''} target="P" onClick={() => update('scopeRepairable', data.scopeRepairable === 'Y' ? '' : 'Y')} />
                  <PFButton value={data.scopeRepairable === 'N' ? 'F' : ''} target="F" onClick={() => update('scopeRepairable', data.scopeRepairable === 'N' ? '' : 'N')} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Scope Usable</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  <PFButton value={data.scopeUsable ?? ''} target="P" onClick={() => update('scopeUsable', data.scopeUsable === 'Y' ? '' : 'Y')} />
                  <PFButton value={data.scopeUsable === 'N' ? 'F' : ''} target="F" onClick={() => update('scopeUsable', data.scopeUsable === 'N' ? '' : 'N')} />
                </div>
              </div>
            </div>

            {/* Angulation grid */}
            <div>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Angulation</span>
              <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 9, color: 'var(--muted)', padding: '2px 4px' }}></th>
                    <th style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', padding: '2px 4px' }}>In</th>
                    <th style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', padding: '2px 4px' }}>Out</th>
                  </tr>
                </thead>
                <tbody>
                  {ANG_DIRS.map(dir => (
                    <tr key={dir}>
                      <td style={{ padding: '2px 4px', fontWeight: 500 }}>{dir}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        <input
                          value={data[angKey('angIn', dir)] ?? ''}
                          onChange={e => update(angKey('angIn', dir), e.target.value)}
                          style={{ width: 50, fontSize: 11, textAlign: 'center', border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '1px 3px', fontFamily: 'inherit' }}
                        />
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        <input
                          value={data[angKey('angOut', dir)] ?? ''}
                          onChange={e => update(angKey('angOut', dir), e.target.value)}
                          style={{ width: 50, fontSize: 11, textAlign: 'center', border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '1px 3px', fontFamily: 'inherit' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fiber */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>Broken Fibers In</span>
                <input value={data.brokenFibersIn ?? ''} onChange={e => update('brokenFibersIn', e.target.value)}
                  style={{ width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>Broken Fibers Out</span>
                <input value={data.brokenFibersOut ?? ''} onChange={e => update('brokenFibersOut', e.target.value)}
                  style={{ width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>Fiber Angle</span>
                <input value={data.fiberAngle ?? ''} onChange={e => update('fiberAngle', e.target.value)}
                  style={{ width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>Light Transmission</span>
                <input value={data.fiberLightTrans ?? ''} onChange={e => update('fiberLightTrans', e.target.value)}
                  style={{ width: '100%', fontSize: 11, border: '1px solid var(--neutral-200)', borderRadius: 3, padding: '2px 4px', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Post-Repair Verification">
          <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
            Post-repair values are captured in the angulation grid (Out columns) and P/F grid below.
          </div>
        </SectionCard>
      </div>

      {/* P/F Grid */}
      <SectionCard
        title="Pass / Fail Checkpoints"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              {passCount}/{totalPF} Pass
            </span>
            <button onClick={handleMarkAllPass} style={{
              fontSize: 10, padding: '2px 8px', border: '1px solid var(--success)', borderRadius: 4,
              background: 'var(--card)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            }}>Mark All Pass</button>
            <button onClick={handleClearAll} style={{
              fontSize: 10, padding: '2px 8px', border: '1px solid var(--neutral-200)', borderRadius: 4,
              background: 'var(--card)', color: 'var(--muted)', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
            }}>Clear All</button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 16px' }}>
          {PF_FIELDS.map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text)' }}>{f.label}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <PFButton value={data[f.key]} target="P" onClick={() => togglePF(f.key, 'P')} />
                <PFButton value={data[f.key]} target="F" onClick={() => togglePF(f.key, 'F')} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 8px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            height: 30, padding: '0 20px', border: 'none', borderRadius: 5,
            background: 'var(--primary)', color: 'var(--card)',
            fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving...' : 'Save Inspections'}
        </button>
      </div>
    </div>
  );
};
