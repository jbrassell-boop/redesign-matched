import { useState } from 'react';
import { Button, Input, Table, Popconfirm, Tag, message } from 'antd';
import type { LoadedRepair } from './types';
import { removeDiItem, approveDiReview, holdDiReview } from '../../api/diReview';

interface Props {
  repairKey: number;
  woNumber:  string;
  client:    string;
  items:     LoadedRepair[];
  scannedAt: string;
  failureCount: number;
  onDone: () => void;
  onRefresh: () => void;
}

export const DiReviewPanel = ({
  repairKey, woNumber, client, items: initialItems,
  scannedAt, failureCount, onDone, onRefresh
}: Props) => {
  const [items, setItems]           = useState(initialItems);
  const [comments, setComments]     = useState('');
  const [holdNote, setHoldNote]     = useState('');
  const [showHold, setShowHold]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleRemove = async (tranKey: number) => {
    await removeDiItem(repairKey, tranKey);
    setItems(prev => prev.filter(i => i.tranKey !== tranKey));
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveDiReview(repairKey, comments);
      message.success(`WO ${woNumber} approved — open to generate requisition`);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const handleHold = async () => {
    if (!holdNote.trim()) { message.warning('Enter a hold reason'); return; }
    await holdDiReview(repairKey, holdNote);
    message.info(`WO ${woNumber} held`);
    setShowHold(false);
    onRefresh();
  };

  const columns = [
    { title: 'D&I Finding', dataIndex: 'finding', key: 'finding',
      render: (v: string) => <Tag color="error">{v || '—'}</Tag> },
    { title: 'Repair Item', dataIndex: 'description', key: 'description' },
    { title: '', key: 'action', width: 80,
      render: (_: unknown, row: LoadedRepair) => (
        <Popconfirm title="Remove this item?" onConfirm={() => handleRemove(row.tranKey)}>
          <Button size="small" danger type="link">Remove</Button>
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 6 }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--muted)' }}>
        {client} · Scanned {new Date(scannedAt).toLocaleString()} · {failureCount} failures
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="tranKey"
        size="small"
        pagination={false}
        style={{ marginBottom: 12 }}
      />

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
          Tech Comments (transcribe from paper)
        </div>
        <Input.TextArea
          value={comments}
          onChange={e => setComments(e.target.value)}
          placeholder="Type tech's handwritten notes here..."
          rows={2}
        />
      </div>

      {showHold && (
        <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
          <Input
            value={holdNote}
            onChange={e => setHoldNote(e.target.value)}
            placeholder="Hold reason..."
            style={{ flex: 1 }}
          />
          <Button onClick={handleHold}>Save Hold</Button>
          <Button onClick={() => setShowHold(false)}>Cancel</Button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={() => setShowHold(true)}>Hold</Button>
        <Button
          type="primary"
          loading={saving}
          onClick={handleApprove}
          style={{ background: 'var(--success)' }}
        >
          Approve &amp; Generate Requisition
        </Button>
      </div>
    </div>
  );
};
