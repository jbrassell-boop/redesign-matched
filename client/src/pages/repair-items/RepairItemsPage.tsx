import { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getRepairItems, getRepairItemStats, createRepairItem } from '../../api/repair-items';
import { RepairItemsList } from './RepairItemsList';
import { RepairItemDetailPane } from './RepairItemDetailPane';
import type { RepairItemListItem, RepairItemStats } from './types';

const CHIP_STYLE = (color: 'info' | 'active' | 'neutral'): React.CSSProperties => {
  const bg: Record<string, string> = {
    info: 'rgba(var(--primary-rgb), 0.10)',
    active: 'rgba(var(--success-rgb), 0.12)',
    neutral: 'var(--neutral-100)',
  };
  const col: Record<string, string> = {
    info: 'var(--primary)',
    active: 'var(--success)',
    neutral: 'var(--muted)',
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: bg[color],
    color: col[color],
    whiteSpace: 'nowrap',
  };
};

export const RepairItemsPage = () => {
  const [items, setItems] = useState<RepairItemListItem[]>([]);
  const [stats, setStats] = useState<RepairItemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [adding, setAdding] = useState(false);

  const loadItems = useCallback(async (s: string, tf: string, sf: string) => {
    setLoading(true);
    try {
      const result = await getRepairItems({ search: s, typeFilter: tf, statusFilter: sf, pageSize: 300 });
      setItems(result.items);
    } catch {
      message.error('Failed to load repair items');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await getRepairItemStats();
      setStats(s);
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadItems(search, typeFilter, statusFilter), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, typeFilter, statusFilter, loadItems]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSelect = useCallback((item: RepairItemListItem) => {
    setSelectedKey(item.repairItemKey);
  }, []);

  const handleItemDeleted = useCallback(() => {
    setSelectedKey(null);
    loadItems(search, typeFilter, statusFilter);
    loadStats();
  }, [search, typeFilter, statusFilter, loadItems, loadStats]);

  const handleItemSaved = useCallback(() => {
    loadItems(search, typeFilter, statusFilter);
    loadStats();
  }, [search, typeFilter, statusFilter, loadItems, loadStats]);

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      setAdding(true);
      const result = await createRepairItem({
        itemDescription: values.itemDescription,
        tsiCode: values.tsiCode || null,
        productId: values.productId || null,
        rigidOrFlexible: values.rigidOrFlexible,
        partOrLabor: values.partOrLabor,
        turnaroundTime: values.turnaroundTime ? Number(values.turnaroundTime) : null,
      });
      setAddModalOpen(false);
      addForm.resetFields();
      message.success('Repair item created');
      await loadItems(search, typeFilter, statusFilter);
      loadStats();
      setSelectedKey(result.repairItemKey);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // validation error
      message.error('Failed to create repair item');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Stat Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 14px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--neutral-200)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={CHIP_STYLE('info')}>
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Items</span>
          <span style={{ fontWeight: 800 }}>{stats?.total ?? '—'}</span>
        </span>
        <span style={CHIP_STYLE('active')}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Active</span>
          <span style={{ fontWeight: 800 }}>{stats?.active ?? '—'}</span>
        </span>
        <span style={CHIP_STYLE('neutral')}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Inactive</span>
          <span style={{ fontWeight: 800 }}>{stats?.inactive ?? '—'}</span>
        </span>
        <span style={CHIP_STYLE('info')}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Flexible</span>
          <span style={{ fontWeight: 800 }}>{stats?.flexible ?? '—'}</span>
        </span>
        <span style={CHIP_STYLE('info')}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Rigid</span>
          <span style={{ fontWeight: 800 }}>{stats?.rigid ?? '—'}</span>
        </span>
        <span style={CHIP_STYLE('neutral')}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Showing</span>
          <span style={{ fontWeight: 800 }}>{items.length}</span>
        </span>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setAddModalOpen(true)}
          style={{ fontSize: 12, background: 'var(--navy)', borderColor: 'var(--navy)' }}
        >
          Add Item
        </Button>
      </div>

      {/* Split Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <aside aria-label="Repair items list" style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <RepairItemsList
            items={items}
            loading={loading}
            selectedKey={selectedKey}
            search={search}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onTypeFilterChange={setTypeFilter}
            onStatusFilterChange={setStatusFilter}
            onSelect={handleSelect}
          />
        </aside>

        {/* Right panel */}
        <section aria-label="Repair item details" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          <RepairItemDetailPane
            itemKey={selectedKey}
            onItemDeleted={handleItemDeleted}
            onItemSaved={handleItemSaved}
          />
        </section>
      </div>

      {/* Add Item Modal */}
      <Modal
        open={addModalOpen}
        title="Add Repair Item"
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        footer={[
          <Button key="cancel" size="small" onClick={() => { setAddModalOpen(false); addForm.resetFields(); }}>Cancel</Button>,
          <Button key="add" size="small" type="primary" loading={adding} onClick={handleAdd}
            style={{ background: 'var(--navy)', borderColor: 'var(--navy)' }}>
            + Add Item
          </Button>,
        ]}
        width={480}
      >
        <Form form={addForm} layout="vertical" size="small" style={{ marginTop: 8 }}>
          <Form.Item
            name="itemDescription"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input style={{ height: 30, fontSize: 12 }} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="tsiCode" label="TSI Code">
              <Input style={{ height: 30, fontSize: 12 }} />
            </Form.Item>
            <Form.Item name="productId" label="Product ID">
              <Input style={{ height: 30, fontSize: 12 }} />
            </Form.Item>
            <Form.Item
              name="rigidOrFlexible"
              label="Type"
              initialValue="F"
              rules={[{ required: true }]}
            >
              <Select
                style={{ fontSize: 12 }}
                options={[
                  { value: 'F', label: 'Flexible' },
                  { value: 'R', label: 'Rigid' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="partOrLabor"
              label="Part / Labor"
              initialValue="L"
              rules={[{ required: true }]}
            >
              <Select
                style={{ fontSize: 12 }}
                options={[
                  { value: 'L', label: 'Labor' },
                  { value: 'P', label: 'Part' },
                ]}
              />
            </Form.Item>
            <Form.Item name="turnaroundTime" label="Turnaround (days)">
              <Input type="number" min={0} style={{ height: 30, fontSize: 12 }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
