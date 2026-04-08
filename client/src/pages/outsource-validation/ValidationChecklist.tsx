import { useState } from 'react';
import { Modal, Radio, Input, Checkbox, message } from 'antd';
import { validateOutsource } from '../../api/outsource-validation';
import type { OutsourceListItem } from './types';

interface ValidationChecklistProps {
  open: boolean;
  item: OutsourceListItem | null;
  onClose: () => void;
  onValidated: () => void;
}

const CHECKLIST_ITEMS = [
  'Repair completed as quoted',
  'No additional charges beyond estimate',
  'Scope/instrument functional — passes QC',
  'Packaging and shipping acceptable',
  'Turnaround time within SLA',
];

export const ValidationChecklist = ({ open, item, onClose, onValidated }: ValidationChecklistProps) => {
  const [status, setStatus] = useState<string>('Validated');
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const allChecked = checks.every(Boolean);
  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const toggleCheck = (idx: number) => {
    const next = [...checks];
    next[idx] = !next[idx];
    setChecks(next);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const checklistSummary = CHECKLIST_ITEMS
        .map((label, i) => `${checks[i] ? 'PASS' : 'FAIL'}: ${label}`)
        .join('; ');
      const fullNotes = `${checklistSummary}${notes ? ' | ' + notes : ''}`;
      await validateOutsource(item.repairKey, status, fullNotes);
      message.success(`WO# ${item.wo} marked as ${status}`);
      setNotes('');
      setChecks(CHECKLIST_ITEMS.map(() => false));
      setStatus('Validated');
      onValidated();
    } catch {
      message.error('Failed to update validation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Outsource Validation"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText={`Mark as ${status}`}
      width={560}
      destroyOnClose
      styles={{
        header: { background: 'var(--primary-dark)', color: 'var(--card)', padding: '14px 20px', borderRadius: 0 },
      }}
    >
      <div style={{
        background: 'rgba(var(--primary-rgb), 0.06)',
        border: '1px solid rgba(var(--primary-rgb), 0.15)',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 12,
        marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>WO#</span><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.wo}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Vendor</span><div>{item.vendorName}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Status</span><div style={{ fontWeight: 700 }}>{item.status}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Vendor Cost</span><div>{fmtMoney(item.vendorCost)}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>TSI Charge</span><div>{fmtMoney(item.tsiCharge)}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Margin</span><div style={{ fontWeight: 700, color: item.marginDollar >= 0 ? 'var(--success)' : 'var(--danger)' }}>{item.marginPct}%</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Validation Checklist
          </div>
          <div style={{
            border: '1px solid var(--border-dk)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {CHECKLIST_ITEMS.map((label, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  borderBottom: i < CHECKLIST_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
                  background: checks[i] ? 'rgba(var(--success-rgb), 0.05)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => toggleCheck(i)}
              >
                <Checkbox checked={checks[i]} onChange={() => toggleCheck(i)} />
                <span style={{ color: checks[i] ? 'var(--success)' : 'var(--text)', fontWeight: checks[i] ? 600 : 400 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {checks.filter(Boolean).length}/{CHECKLIST_ITEMS.length} items checked
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Validation Result
          </div>
          <Radio.Group value={status} onChange={e => setStatus(e.target.value)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Radio value="Validated" style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Validated</span>
                <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>Repair meets quality standards{!allChecked ? ' (not all checks passed)' : ''}</span>
              </Radio>
              <Radio value="Flagged" style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Flagged</span>
                <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>Issue found — needs review</span>
              </Radio>
            </div>
          </Radio.Group>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Notes (optional)
          </div>
          <Input.TextArea
            aria-label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Validation notes..."
            style={{ fontSize: 12 }}
          />
        </div>
      </div>
    </Modal>
  );
};
