import { Input, Select } from 'antd';
import type { RepairItemDetail, RepairItemUpdate } from '../types';

interface OverviewTabProps {
  item: RepairItemDetail;
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

const bodyStyle: React.CSSProperties = { padding: '10px 12px' };

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 3,
};

const reqStyle: React.CSSProperties = { color: 'var(--danger)' };

export const OverviewTab = ({ draft, onChange }: OverviewTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {/* Identification */}
    <div style={cardStyle}>
      <div style={headStyle}>Identification</div>
      <div style={bodyStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Description <span style={reqStyle}>*</span></label>
            <Input
              value={draft.itemDescription ?? ''}
              onChange={e => onChange({ itemDescription: e.target.value })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
          <div>
            <label style={labelStyle}>TSI Code</label>
            <Input
              value={draft.tsiCode ?? ''}
              onChange={e => onChange({ tsiCode: e.target.value || null })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Product ID</label>
            <Input
              value={draft.productId ?? ''}
              onChange={e => onChange({ productId: e.target.value || null })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Classification */}
    <div style={cardStyle}>
      <div style={headStyle}>Classification</div>
      <div style={bodyStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Type <span style={reqStyle}>*</span></label>
            <Select
              value={draft.rigidOrFlexible ?? 'F'}
              onChange={v => onChange({ rigidOrFlexible: v })}
              style={{ width: '100%', fontSize: 12 }}
              size="small"
              options={[
                { value: 'F', label: 'Flexible' },
                { value: 'R', label: 'Rigid' },
              ]}
            />
          </div>
          <div>
            <label style={labelStyle}>Part / Labor <span style={reqStyle}>*</span></label>
            <Select
              value={draft.partOrLabor ?? 'L'}
              onChange={v => onChange({ partOrLabor: v })}
              style={{ width: '100%', fontSize: 12 }}
              size="small"
              options={[
                { value: 'L', label: 'Labor' },
                { value: 'P', label: 'Part' },
              ]}
            />
          </div>
          <div>
            <label style={labelStyle}>Problem ID (Legacy)</label>
            <Input
              value={draft.problemId ?? ''}
              onChange={e => onChange({ problemId: e.target.value || null })}
              style={{ fontSize: 12, height: 30 }}
              maxLength={5}
            />
          </div>
          <div>
            <label style={labelStyle}>Turnaround (days)</label>
            <Input
              type="number"
              min={0}
              value={draft.turnaroundTime ?? ''}
              onChange={e => onChange({ turnaroundTime: e.target.value !== '' ? Number(e.target.value) : null })}
              style={{ fontSize: 12, height: 30 }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);
