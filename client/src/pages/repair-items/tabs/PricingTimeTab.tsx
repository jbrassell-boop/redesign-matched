import { Input } from 'antd';
import type { RepairItemUpdate } from '../types';

interface PricingTimeTabProps {
  draft: RepairItemUpdate;
  onChange: (patch: RepairItemUpdate) => void;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  overflow: 'hidden',
};

const headStyle: React.CSSProperties = {
  background: 'var(--neutral-50)',
  padding: '5px 12px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--navy)',
  borderBottom: '1px solid var(--border)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 3,
};

const tgHeadStyle: React.CSSProperties = {
  background: 'var(--navy)',
  color: 'var(--card)',
  fontSize: 9.5,
  fontWeight: 700,
  padding: '5px 10px',
  textAlign: 'center',
  letterSpacing: '0.04em',
};

const tgSubStyle: React.CSSProperties = {
  background: 'var(--neutral-50)',
  color: 'var(--navy)',
  fontSize: 9,
  fontWeight: 700,
  padding: '3px 10px',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border)',
};

const tgLblStyle: React.CSSProperties = {
  width: 60,
  flexShrink: 0,
  background: 'var(--neutral-50)',
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--navy)',
  borderRight: '1px solid var(--border)',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const numInput = (
  value: number | null | undefined,
  onChange: (v: number | null) => void,
  label?: string
) => (
  <Input
    type="number"
    min={0}
    value={value ?? ''}
    onChange={e => onChange(e.target.value !== '' ? Number(e.target.value) : null)}
    style={{ height: 24, fontSize: 11 }}
    aria-label={label}
  />
);

export const PricingTimeTab = ({ draft, onChange }: PricingTimeTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {/* Avg Costs */}
    <div style={cardStyle}>
      <div style={headStyle}>Average Costs</div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Avg Cost — Material ($)</label>
            <Input
              aria-label="Avg Cost — Material ($)"
              type="number"
              min={0}
              step={0.01}
              value={draft.avgCostMaterial ?? ''}
              onChange={e => onChange({ avgCostMaterial: e.target.value !== '' ? Number(e.target.value) : null })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Avg Cost — Labor ($)</label>
            <Input
              aria-label="Avg Cost — Labor ($)"
              type="number"
              min={0}
              step={0.01}
              value={draft.avgCostLabor ?? ''}
              onChange={e => onChange({ avgCostLabor: e.target.value !== '' ? Number(e.target.value) : null })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Technician Time Grid */}
    <div style={cardStyle}>
      <div style={headStyle}>Technician Time (minutes)</div>
      <div style={{ padding: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          border: '1px solid var(--border)',
          borderRadius: 0,
          overflow: 'hidden',
          margin: 0,
        }}>
          {/* Headers row */}
          <div style={{ ...tgHeadStyle, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Standard</div>
          <div style={tgHeadStyle}>Small Diameter</div>

          {/* Sub-header row — Standard */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 1fr',
            borderBottom: '1px solid var(--border)',
            borderRight: '2px solid var(--border-dk)',
          }}>
            <div style={{ background: 'var(--neutral-50)', borderRight: '1px solid var(--border)' }} />
            <div style={tgSubStyle}>Tech 1</div>
            <div style={tgSubStyle}>Tech 2</div>
            <div style={tgSubStyle}>Tech 3</div>
          </div>
          {/* Sub-header row — Small Diameter */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 1fr',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ background: 'var(--neutral-50)', borderRight: '1px solid var(--border)' }} />
            <div style={tgSubStyle}>Tech 1</div>
            <div style={tgSubStyle}>Tech 2</div>
            <div style={tgSubStyle}>Tech 3</div>
          </div>

          {/* Input row — Standard */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 1fr',
            borderRight: '2px solid var(--border-dk)',
            padding: '4px 0',
          }}>
            <div style={tgLblStyle}>Mins</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech1, v => onChange({ minutesTech1: v }), 'Standard Tech 1 minutes')}</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech2, v => onChange({ minutesTech2: v }), 'Standard Tech 2 minutes')}</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech3, v => onChange({ minutesTech3: v }), 'Standard Tech 3 minutes')}</div>
          </div>
          {/* Input row — Small Diameter */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 1fr',
            padding: '4px 0',
          }}>
            <div style={tgLblStyle}>Mins</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech1SmallDiameter, v => onChange({ minutesTech1SmallDiameter: v }), 'Small Diameter Tech 1 minutes')}</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech2SmallDiameter, v => onChange({ minutesTech2SmallDiameter: v }), 'Small Diameter Tech 2 minutes')}</div>
            <div style={{ padding: '2px 6px' }}>{numInput(draft.minutesTech3SmallDiameter, v => onChange({ minutesTech3SmallDiameter: v }), 'Small Diameter Tech 3 minutes')}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
