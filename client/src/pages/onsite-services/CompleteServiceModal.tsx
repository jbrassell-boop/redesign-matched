import { useState } from 'react';
import { Modal, Input, Radio, message } from 'antd';
import { updateOnsiteStatus } from '../../api/onsite-services';
import type { OnsiteServiceListItem } from './types';

interface CompleteServiceModalProps {
  open: boolean;
  visit: OnsiteServiceListItem | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const CompleteServiceModal = ({ open, visit, onClose, onUpdated }: CompleteServiceModalProps) => {
  const [status, setStatus] = useState<string>('Submitted');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!visit) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateOnsiteStatus(visit.onsiteServiceKey, status, notes || undefined);
      message.success(`Visit ${visit.invoiceNum} marked as ${status}`);
      setNotes('');
      setStatus('Submitted');
      onUpdated();
    } catch {
      message.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = visit.status === 'Draft';
  const canInvoice = visit.status === 'Draft' || visit.status === 'Submitted';
  const canVoid = visit.status !== 'Void';

  return (
    <Modal
      title={`Update Visit: ${visit.invoiceNum}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText={`Mark as ${status}`}
      width={480}
      destroyOnClose
      styles={{
        header: { background: 'var(--primary-dark)', color: 'var(--card)', padding: '14px 20px', borderRadius: 0 },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <div style={{
          background: 'rgba(var(--primary-rgb), 0.06)',
          border: '1px solid rgba(var(--primary-rgb), 0.15)',
          borderRadius: 6,
          padding: '10px 14px',
          fontSize: 12,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Client</span><div>{visit.clientName}</div></div>
            <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Department</span><div>{visit.deptName}</div></div>
            <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Date</span><div>{visit.visitDate ?? '\u2014'}</div></div>
            <div><span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Current Status</span><div style={{ fontWeight: 700 }}>{visit.status}</div></div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            New Status
          </div>
          <Radio.Group value={status} onChange={e => setStatus(e.target.value)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {canSubmit && (
                <Radio value="Submitted" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>Submitted</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>Mark visit as submitted for review</span>
                </Radio>
              )}
              {canInvoice && (
                <Radio value="Invoiced" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Invoiced</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>Complete and mark as invoiced</span>
                </Radio>
              )}
              {canVoid && (
                <Radio value="Void" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Void</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>Cancel this visit</span>
                </Radio>
              )}
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
            placeholder="Add a note about this status change..."
            style={{ fontSize: 12 }}
          />
        </div>
      </div>
    </Modal>
  );
};
