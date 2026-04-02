import { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, message } from 'antd';
import { getOutsourceVendors, sendToVendor } from '../../api/outsource-validation';
import type { OutsourceListItem } from './types';

interface SendToVendorModalProps {
  open: boolean;
  item: OutsourceListItem | null;
  onClose: () => void;
  onSent: () => void;
}

export const SendToVendorModal = ({ open, item, onClose, onSent }: SendToVendorModalProps) => {
  const [form] = Form.useForm();
  const [vendors, setVendors] = useState<{ vendorKey: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getOutsourceVendors().then(setVendors);
  }, [open]);

  if (!item) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await sendToVendor(item.repairKey, values.vendorKey, values.outsourceCost, values.trackingNumber, values.notes);
      message.success(`WO# ${item.wo} sent to vendor`);
      form.resetFields();
      onSent();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Failed to send to vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Send to Vendor"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="Send to Vendor"
      width={520}
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
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Serial#</span><div>{item.serial}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Scope Type</span><div>{item.scopeType}</div></div>
          <div><span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Client</span><div>{item.clientName}</div></div>
        </div>
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item name="vendorKey" label="Vendor" rules={[{ required: true, message: 'Required' }]}>
          <Select
            showSearch
            placeholder="Select Vendor"
            optionFilterProp="label"
            options={vendors.map(v => ({ value: v.vendorKey, label: v.name }))}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="outsourceCost" label="Vendor Cost ($)" rules={[{ required: true, message: 'Required' }]}>
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="trackingNumber" label="Tracking # (out)">
            <Input placeholder="Optional" />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Outsource notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
