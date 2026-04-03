import { useState, useEffect } from 'react';
import { Modal, Select, Input, Button, message } from 'antd';
import apiClient from '../../api/client';
import type { DashboardRepair } from './types';

interface RepairStatusOption {
  statusId: number;
  statusName: string;
}

interface TechnicianOption {
  techKey: number;
  techName: string;
}

interface QuickEditModalProps {
  open: boolean;
  record: DashboardRepair | null;
  onClose: () => void;
  onSaved: () => void;
}

export const QuickEditModal = ({ open, record, onClose, onSaved }: QuickEditModalProps) => {
  const [statuses, setStatuses] = useState<RepairStatusOption[]>([]);
  const [techs, setTechs] = useState<TechnicianOption[]>([]);
  const [statusId, setStatusId] = useState<number | undefined>();
  const [techKey, setTechKey] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<RepairStatusOption[]>('/repairs/statuses')
      .then(r => setStatuses(r.data))
      .catch(() => message.error('Failed to load repair statuses'));
    apiClient.get<TechnicianOption[]>('/repairs/technicians')
      .then(r => setTechs(r.data))
      .catch(() => message.error('Failed to load technicians'));
  }, []);

  useEffect(() => {
    if (record) {
      const matched = statuses.find(s => s.statusName === record.status) ?? statuses.find(s => s.statusId === record.statusId);
      setStatusId(matched?.statusId ?? undefined);
      setNotes('');
      // Find tech by name
      const matchedTech = techs.find(t => t.techName === record.tech);
      setTechKey(matchedTech?.techKey ?? undefined);
    }
  }, [record, statuses, techs]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await apiClient.patch(`/repairs/${record.repairKey}/quick-edit`, {
        statusId: statusId ?? null,
        technicianKey: techKey ?? null,
        notes: notes.trim() || null,
      });
      message.success('Repair updated');
      onSaved();
    } catch {
      message.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Quick Edit</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{record.wo}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{record.client} — {record.scopeType}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={480}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            Save
          </Button>
          <Button
            style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}
            onClick={() => {
              onClose();
              window.location.href = `/repairs/${record.repairKey}`;
            }}
          >
            Open Full Cockpit
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Status
          </label>
          <Select
            style={{ width: '100%' }}
            value={statusId}
            onChange={setStatusId}
            options={statuses.map(s => ({ value: s.statusId, label: s.statusName }))}
            placeholder="Select status..."
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Technician
          </label>
          <Select
            style={{ width: '100%' }}
            value={techKey}
            onChange={setTechKey}
            allowClear
            options={techs.map(t => ({ value: t.techKey, label: t.techName }))}
            placeholder="Assign technician..."
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Add Note
          </label>
          <Input.TextArea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional note to append to repair comments..."
            style={{ fontSize: 12 }}
          />
        </div>
      </div>
    </Modal>
  );
};
