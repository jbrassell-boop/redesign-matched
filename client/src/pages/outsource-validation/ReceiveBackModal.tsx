import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { receiveBack } from '../../api/outsource-validation';
import type { OutsourceListItem } from './types';

interface ReceiveBackModalProps {
  open: boolean;
  item: OutsourceListItem | null;
  onClose: () => void;
  onReceived: () => void;
}

export const ReceiveBackModal = ({ open, item, onClose, onReceived }: ReceiveBackModalProps) => {
  const [trackingReturn, setTrackingReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await receiveBack(item.repairKey, trackingReturn || undefined, notes || undefined);
      message.success(`WO# ${item.wo} marked as returned`);
      setTrackingReturn('');
      setNotes('');
      onReceived();
    } catch {
      message.error('Failed to mark as returned');
    } finally {
      setSaving(false);
    }
  };

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <Modal
      title="Receive Back from Vendor"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="Mark Returned"
      width={480}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>WO#</span><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.wo}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Vendor</span><div>{item.vendorName}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Days Out</span><div style={{ fontWeight: 600, color: item.daysOut > 30 ? 'var(--danger)' : item.daysOut > 14 ? 'var(--warning)' : 'var(--muted)' }}>{item.daysOut}d</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Vendor Cost</span><div>{fmtMoney(item.vendorCost)}</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Return Tracking #
          </div>
          <Input
            value={trackingReturn}
            onChange={e => setTrackingReturn(e.target.value)}
            placeholder="Optional return tracking number"
            size="small"
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Notes (optional)
          </div>
          <Input.TextArea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Return notes..."
            style={{ fontSize: 12 }}
          />
        </div>
      </div>
    </Modal>
  );
};
