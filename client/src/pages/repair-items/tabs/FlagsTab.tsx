import { Switch } from 'antd';
import type { RepairItemUpdate } from '../types';

interface FlagsTabProps {
  draft: RepairItemUpdate;
  onChange: (patch: RepairItemUpdate) => void;
}

interface FlagRowProps {
  label: string;
  sub: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}

const FlagRow = ({ label, sub, checked, onToggle }: FlagRowProps) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>
    </div>
    <Switch
      checked={checked}
      onChange={onToggle}
      size="small"
      aria-label={label}
      style={{ background: checked ? 'var(--navy)' : undefined }}
    />
  </div>
);

export const FlagsTab = ({ draft, onChange }: FlagsTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        background: 'var(--neutral-50)',
        padding: '5px 12px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--navy)',
        borderBottom: '1px solid var(--border)',
      }}>
        Behavior Flags
      </div>
      <div style={{ padding: '4px 12px' }}>
        <FlagRow
          label="Active"
          sub="Available for use on work orders"
          checked={draft.isActive ?? true}
          onToggle={v => onChange({ isActive: v })}
        />
        <FlagRow
          label="Okay to Skip"
          sub="Can be bypassed during repair flow"
          checked={draft.okayToSkip ?? false}
          onToggle={v => onChange({ okayToSkip: v })}
        />
        <FlagRow
          label="Is Adjustment"
          sub="Represents a price adjustment line"
          checked={draft.isAdjustment ?? false}
          onToggle={v => onChange({ isAdjustment: v })}
        />
        <FlagRow
          label="Skip Pick List"
          sub="Do not include in technician pick lists"
          checked={draft.skipPickList ?? false}
          onToggle={v => onChange({ skipPickList: v })}
        />
        <FlagRow
          label="Profit Item (+)"
          sub="Positive profit line item marker"
          checked={draft.profitItemPlus ?? false}
          onToggle={v => onChange({ profitItemPlus: v })}
        />
        <FlagRow
          label="Profit Item (−)"
          sub="Negative profit line item marker"
          checked={draft.profitItemMinus ?? false}
          onToggle={v => onChange({ profitItemMinus: v })}
        />
        <div style={{ borderBottom: 'none' }}>
          <FlagRow
            label="Locked"
            sub="Prevents editing outside administration"
            checked={draft.isLocked ?? false}
            onToggle={v => onChange({ isLocked: v })}
          />
        </div>
      </div>
    </div>
  </div>
);
