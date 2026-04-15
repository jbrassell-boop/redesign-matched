import { useCallback, useEffect, useState } from 'react';
import { Table, Badge, Button, Spin, message, Tag } from 'antd';
import type { DiQueueItem, LoadedRepair } from './types';
import { getDiQueue, getDiDetail } from '../../api/diReview';
import { DiReviewPanel } from './DiReviewPanel';

export const DiReviewPage = () => {
  const [queue, setQueue]             = useState<DiQueueItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [detail, setDetail]           = useState<LoadedRepair[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadQueue = useCallback(() => {
    setLoading(true);
    getDiQueue()
      .then(setQueue)
      .catch(() => message.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const handleExpand = async (repairKey: number) => {
    if (expanded === repairKey) { setExpanded(null); setDetail(null); return; }
    setExpanded(repairKey);
    setDetailLoading(true);
    try {
      const items = await getDiDetail(repairKey);
      setDetail(items);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: 'Work Order', dataIndex: 'woNumber', key: 'woNumber',
      render: (v: string) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { title: 'Client',       dataIndex: 'client',    key: 'client' },
    { title: 'Scope',        dataIndex: 'scopeType', key: 'scopeType' },
    { title: 'Scanned',      dataIndex: 'scannedAt', key: 'scannedAt',
      render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Failures', dataIndex: 'failureCount', key: 'failureCount', align: 'center' as const,
      render: (v: number, row: DiQueueItem) =>
        row.scanStatus !== 'Success'
          ? <Tag color="warning">⚠ Scan Error</Tag>
          : <Tag color="error">{v} Fails</Tag>
    },
    { title: 'Items Loaded', dataIndex: 'itemsLoaded', key: 'itemsLoaded', align: 'center' as const,
      render: (v: number, row: DiQueueItem) =>
        row.scanStatus !== 'Success' ? '—' : <Tag color="success">{v} Items</Tag>
    },
    { title: '', key: 'action',
      render: (_: unknown, row: DiQueueItem) => (
        <Button size="small" type="primary" onClick={() => handleExpand(row.repairKey)}>
          {expanded === row.repairKey ? 'Close' : row.scanStatus !== 'Success' ? 'Fix' : 'Review'}
        </Button>
      )
    },
  ];

  const pendingCount = queue.filter(q => q.scanStatus === 'Success').length;

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>D&amp;I Scan Review Queue</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            Work orders auto-loaded from scanned D&amp;I forms — review before sending for approval
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge count={pendingCount} color="red" />
        )}
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={queue}
          columns={columns}
          rowKey="repairKey"
          size="small"
          pagination={false}
          expandable={{
            expandedRowKeys: expanded ? [expanded] : [],
            expandedRowRender: (row: DiQueueItem) =>
              detailLoading ? <Spin /> : detail ? (
                <DiReviewPanel
                  repairKey={row.repairKey}
                  woNumber={row.woNumber}
                  client={row.client}
                  items={detail}
                  scannedAt={row.scannedAt}
                  failureCount={row.failureCount}
                  onDone={() => { setExpanded(null); loadQueue(); }}
                  onRefresh={loadQueue}
                />
              ) : null,
            showExpandColumn: false,
          }}
        />
      </Spin>
    </div>
  );
};
