import { useState, useEffect, useCallback } from 'react';
import { Button, Modal, message } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { getRepairItemDetail, updateRepairItem, deleteRepairItem } from '../../api/repair-items';
import type { RepairItemDetail, RepairItemUpdate } from './types';
import { OverviewTab } from './tabs/OverviewTab';
import { PricingTimeTab } from './tabs/PricingTimeTab';
import { FlagsTab } from './tabs/FlagsTab';

interface RepairItemDetailPaneProps {
  itemKey: number | null;
  onItemDeleted: () => void;
  onItemSaved: () => void;
}

type TabKey = 'overview' | 'pricing' | 'flags';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pricing', label: 'Pricing & Time' },
  { key: 'flags', label: 'Flags' },
];

const typeBadgeStyle = (type: string | null): React.CSSProperties => ({
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 3,
  fontSize: 11.5,
  fontWeight: 700,
  background: type === 'F' ? 'var(--primary-light)' : 'rgba(var(--success-rgb), 0.15)',
  color: type === 'F' ? 'var(--primary)' : 'var(--success)',
  border: `1px solid ${type === 'F' ? 'var(--border-dk)' : 'rgba(var(--success-rgb), 0.3)'}`,
});

const plBadgeStyle = (pl: string | null): React.CSSProperties => ({
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 3,
  fontSize: 11.5,
  fontWeight: 700,
  background: pl === 'P' ? 'var(--primary-light)' : 'rgba(var(--amber-rgb), 0.15)',
  color: pl === 'P' ? 'var(--primary)' : 'var(--warning)',
  border: `1px solid ${pl === 'P' ? 'var(--border-dk)' : 'rgba(var(--amber-rgb), 0.3)'}`,
});

function detailToUpdate(d: RepairItemDetail): RepairItemUpdate {
  return {
    itemDescription: d.itemDescription,
    problemId: d.problemId,
    tsiCode: d.tsiCode,
    productId: d.productId,
    rigidOrFlexible: d.rigidOrFlexible ?? 'F',
    partOrLabor: d.partOrLabor ?? 'L',
    isActive: d.isActive,
    turnaroundTime: d.turnaroundTime,
    avgCostMaterial: d.avgCostMaterial,
    avgCostLabor: d.avgCostLabor,
    minutesTech1: d.minutesTech1,
    minutesTech2: d.minutesTech2,
    minutesTech3: d.minutesTech3,
    minutesTech1SmallDiameter: d.minutesTech1SmallDiameter,
    minutesTech2SmallDiameter: d.minutesTech2SmallDiameter,
    minutesTech3SmallDiameter: d.minutesTech3SmallDiameter,
    okayToSkip: d.okayToSkip,
    isAdjustment: d.isAdjustment,
    skipPickList: d.skipPickList,
    profitItemPlus: d.profitItemPlus,
    profitItemMinus: d.profitItemMinus,
    isLocked: d.isLocked,
  };
}

export const RepairItemDetailPane = ({ itemKey, onItemDeleted, onItemSaved }: RepairItemDetailPaneProps) => {
  const [detail, setDetail] = useState<RepairItemDetail | null>(null);
  const [draft, setDraft] = useState<RepairItemUpdate>({});
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const loadDetail = useCallback(async (key: number) => {
    try {
      const d = await getRepairItemDetail(key);
      setDetail(d);
      setDraft(detailToUpdate(d));
      setDirty(false);
    } catch {
      message.error('Failed to load repair item details');
    }
  }, []);

  useEffect(() => {
    if (itemKey != null) {
      setActiveTab('overview');
      loadDetail(itemKey);
    } else {
      setDetail(null);
      setDraft({});
      setDirty(false);
    }
  }, [itemKey, loadDetail]);

  const handleChange = useCallback((patch: RepairItemUpdate) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!itemKey) return;
    setSaving(true);
    try {
      await updateRepairItem(itemKey, draft);
      setDirty(false);
      message.success('Repair item saved');
      onItemSaved();
      if (itemKey) loadDetail(itemKey);
    } catch {
      message.error('Failed to save repair item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemKey) return;
    try {
      await deleteRepairItem(itemKey);
      setDeleteModalOpen(false);
      message.success('Repair item deleted');
      onItemDeleted();
    } catch {
      message.error('Failed to delete repair item');
    }
  };

  if (!itemKey || !detail) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        gap: 8,
        background: 'var(--bg)',
      }}>
        <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25 }}>
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
          <line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
        <p style={{ fontSize: 13, margin: 0 }}>Select a repair item to view details</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 14px',
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, margin: 0 }}>
          {detail.itemDescription}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{
            background: 'var(--bg)',
            border: '1px solid var(--border-dk)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--muted)',
            fontFamily: 'monospace',
          }}>
            {detail.tsiCode || detail.problemId || '—'}
          </span>
          {detail.productId && (
            <span style={{
              background: 'var(--primary-light)',
              border: '1px solid var(--border-dk)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--primary)',
            }}>
              {detail.productId}
            </span>
          )}
          {detail.rigidOrFlexible && (
            <span style={typeBadgeStyle(detail.rigidOrFlexible)}>
              {detail.rigidOrFlexible === 'F' ? 'Flexible' : 'Rigid'}
            </span>
          )}
          {detail.partOrLabor && (
            <span style={plBadgeStyle(detail.partOrLabor)}>
              {detail.partOrLabor === 'P' ? 'Part' : 'Labor'}
            </span>
          )}
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: detail.isActive ? 'var(--success)' : 'var(--muted)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: detail.isActive ? 'var(--success)' : 'var(--muted)' }}>
            {detail.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--neutral-200)',
        flexShrink: 0,
        padding: '0 10px',
      }}>
        {TABS.map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--primary)' : 'transparent'}`,
              marginBottom: -2,
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', background: 'var(--bg)' }}>
        {activeTab === 'overview' && (
          <OverviewTab item={detail} draft={draft} onChange={handleChange} />
        )}
        {activeTab === 'pricing' && (
          <PricingTimeTab draft={draft} onChange={handleChange} />
        )}
        {activeTab === 'flags' && (
          <FlagsTab draft={draft} onChange={handleChange} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => setDeleteModalOpen(true)}
          style={{ fontSize: 12 }}
        >
          Delete
        </Button>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: dirty ? 'var(--warning)' : 'var(--muted)',
        }}>
          <span style={{ fontSize: 11 }}>&#9679;</span>
          {dirty ? 'Unsaved changes' : 'Ready'}
        </span>
        <Button
          icon={<SaveOutlined />}
          size="small"
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
          style={{ fontSize: 12 }}
        >
          Save
        </Button>
      </div>

      {/* Delete modal */}
      <Modal
        open={deleteModalOpen}
        title="Delete Repair Item"
        onCancel={() => setDeleteModalOpen(false)}
        footer={[
          <Button key="cancel" size="small" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>,
          <Button key="delete" size="small" danger type="primary" onClick={handleDelete}>Delete</Button>,
        ]}
      >
        <p style={{ fontSize: 12, lineHeight: 1.6 }}>
          Delete <strong>{detail.itemDescription}</strong>? This will deactivate the item and it will no longer appear in work orders.
        </p>
      </Modal>
    </div>
  );
};
