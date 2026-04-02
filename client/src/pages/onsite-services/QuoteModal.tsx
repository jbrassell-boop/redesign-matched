import { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, message } from 'antd';
import { getClients, getClientDepartments } from '../../api/clients';
import { createOnsiteVisit } from '../../api/onsite-services';
import apiClient from '../../api/client';
import type { ClientListItem } from '../clients/types';
import type { CreateOnsiteVisitRequest } from './types';

interface TechLookup {
  technicianKey: number;
  name: string;
}

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const QuoteModal = ({ open, onClose, onCreated }: QuoteModalProps) => {
  const [form] = Form.useForm();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [departments, setDepartments] = useState<{ departmentKey: number; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<TechLookup[]>([]);
  const [saving, setSaving] = useState(false);
  const [deptsLoading, setDeptsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getClients({ pageSize: 500 }).then(r => setClients(r.clients));
    apiClient.get<TechLookup[]>('/onsite-services/technicians').then(r => setTechnicians(r.data));
  }, [open]);

  const handleClientChange = async (clientKey: number) => {
    form.setFieldValue('departmentKey', undefined);
    setDeptsLoading(true);
    try {
      const depts = await getClientDepartments(clientKey);
      setDepartments(depts.map(d => ({ departmentKey: d.departmentKey, name: d.name })));
    } finally {
      setDeptsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const req: CreateOnsiteVisitRequest = {
        clientKey: values.clientKey,
        departmentKey: values.departmentKey,
        technicianKey: values.technicianKey,
        visitDate: values.visitDate.format('YYYY-MM-DD'),
        location: values.location,
        po: values.po,
        truckNum: values.truckNum,
        priceClass: values.priceClass,
        notes: values.notes,
      };
      await createOnsiteVisit(req);
      message.success('Visit created');
      form.resetFields();
      onCreated();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.error('Failed to create visit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New Onsite Visit"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="Create Visit"
      width={600}
      destroyOnClose
      styles={{
        header: { background: 'var(--primary-dark)', color: 'var(--card)', padding: '14px 20px', borderRadius: 0 },
      }}
    >
      <Form form={form} layout="vertical" size="small" initialValues={{ location: 'Upper Chichester', priceClass: 'Standard' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="clientKey" label="Client" rules={[{ required: true, message: 'Required' }]}>
            <Select
              showSearch
              placeholder="Select Client"
              optionFilterProp="label"
              onChange={handleClientChange}
              options={clients.map(c => ({ value: c.clientKey, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="departmentKey" label="Department" rules={[{ required: true, message: 'Required' }]}>
            <Select
              showSearch
              placeholder="Select Department"
              optionFilterProp="label"
              loading={deptsLoading}
              options={departments.map(d => ({ value: d.departmentKey, label: d.name }))}
            />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="technicianKey" label="Technician" rules={[{ required: true, message: 'Required' }]}>
            <Select
              showSearch
              placeholder="Select Technician"
              optionFilterProp="label"
              options={technicians.map(t => ({ value: t.technicianKey, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="visitDate" label="Visit Date" rules={[{ required: true, message: 'Required' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="location" label="Location">
            <Select options={[
              { value: 'Upper Chichester', label: 'Upper Chichester' },
              { value: 'Nashville', label: 'Nashville' },
            ]} />
          </Form.Item>
          <Form.Item name="po" label="PO #">
            <Input placeholder="Optional" />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="truckNum" label="Truck #">
            <Input placeholder="V-000" />
          </Form.Item>
          <Form.Item name="priceClass" label="Price Class">
            <Select options={[
              { value: 'Standard', label: 'Standard' },
              { value: 'Premium', label: 'Premium' },
              { value: 'Economy', label: 'Economy' },
              { value: 'Contract', label: 'Contract' },
            ]} />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="Visit notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
