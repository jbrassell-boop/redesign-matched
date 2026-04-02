import { Drawer, Spin, Table, Tag } from 'antd';
import type { InstrumentRepairDetail, InstrumentCatalogDetail } from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

interface FieldProps { label: string; value: string | number | null | undefined }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>{value ?? '\u2014'}</div>
  </div>
);

const STATUS_COLORS: Record<string, string> = {
  'Received': 'blue',
  'In Progress': 'gold',
  'Outsourced': 'purple',
  'On Hold': 'orange',
  'Complete': 'green',
  'Completed': 'green',
  'Invoiced': 'green',
};

interface RepairDrawerProps {
  detail: InstrumentRepairDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export const RepairDrawer = ({ detail, loading, open, onClose }: RepairDrawerProps) => {
  const itemColumns = [
    { title: 'Item', dataIndex: 'itemDescription', key: 'itemDescription' },
    {
      title: 'Price',
      dataIndex: 'repairPrice',
      key: 'repairPrice',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt$(v)}</span>,
    },
    {
      title: 'Approved',
      dataIndex: 'approved',
      key: 'approved',
      render: (v: string | null) => {
        if (v === 'Y') return <Tag color="success">Yes</Tag>;
        if (v === 'N') return <Tag color="error">No</Tag>;
        if (v === 'P') return <Tag color="warning">Pending</Tag>;
        return <span style={{ color: 'var(--muted)' }}>\u2014</span>;
      },
    },
    { title: 'Fix', dataIndex: 'fixType', key: 'fixType', render: (v: string | null) => v || '\u2014' },
    { title: 'Comments', dataIndex: 'comments', key: 'comments', render: (v: string | null) => v || '\u2014' },
  ];

  return (
    <Drawer
      title={
        detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Order {detail.orderNumber}</span>
            <Tag color={STATUS_COLORS[detail.status] ?? 'default'} style={{ color: '#fff', border: 'none' }}>{detail.status}</Tag>
          </div>
        ) : 'Repair Detail'
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      styles={{
        header: { background: 'var(--primary-dark)', borderBottom: 'none' },
        body: { padding: '16px 20px' },
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : !detail ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No repair selected</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Items</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{detail.items.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Days Open</div>
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: detail.daysOpen > 14 ? 'var(--danger)' : detail.daysOpen > 7 ? 'var(--amber)' : 'var(--muted)',
              }}>
                {detail.daysOpen}d
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Total Value</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>
                {fmt$(detail.items.reduce((s, i) => s + i.repairPrice, 0))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Client" value={detail.clientName} />
            <Field label="Department" value={detail.departmentName} />
            <Field label="PO #" value={detail.purchaseOrder} />
            <Field label="Technician" value={detail.technicianName} />
            <Field label="Received" value={fmtDate(detail.dateReceived)} />
            <Field label="Due" value={fmtDate(detail.dateDue)} />
            <Field label="Completed" value={fmtDate(detail.dateCompleted)} />
          </div>

          {detail.notes && (
            <div style={{ marginTop: 8 }}>
              <Field label="Notes" value={detail.notes} />
            </div>
          )}

          {detail.items.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Line Items ({detail.items.length})
              </div>
              <Table
                dataSource={detail.items}
                columns={itemColumns}
                rowKey="tranKey"
                size="small"
                pagination={false}
                style={{ fontSize: 12 }}
              />
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

interface CatalogDrawerProps {
  detail: InstrumentCatalogDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export const CatalogDrawer = ({ detail, loading, open, onClose }: CatalogDrawerProps) => (
  <Drawer
    title={
      detail ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{detail.itemDescription}</span>
          <Tag color={detail.isActive ? 'success' : 'default'} style={{ color: '#fff', border: 'none' }}>
            {detail.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </div>
      ) : 'Instrument Detail'
    }
    placement="right"
    width={600}
    open={open}
    onClose={onClose}
    styles={{
      header: { background: 'var(--primary-dark)', borderBottom: 'none' },
      body: { padding: '16px 20px' },
    }}
  >
    {loading ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
    ) : !detail ? (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No instrument selected</div>
    ) : (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Description" value={detail.itemDescription} />
          <Field label="TSI Code" value={detail.tsiCode} />
          <Field label="Type" value={detail.rigidOrFlexible === 'R' ? 'Rigid' : detail.rigidOrFlexible === 'F' ? 'Flexible' : detail.rigidOrFlexible} />
          <Field label="Part/Labor" value={detail.partOrLabor === 'P' ? 'Part' : detail.partOrLabor === 'L' ? 'Labor' : detail.partOrLabor} />
          <Field label="Product ID" value={detail.productId} />
          <Field label="Problem ID" value={detail.problemId} />
          <Field label="HPG Product ID" value={detail.productIdHPG} />
          <Field label="Premier Product ID" value={detail.productIdPremier} />
          <Field label="Diameter Type" value={detail.diameterType} />
          <Field label="Major Repair" value={detail.isMajorRepair ? 'Yes' : 'No'} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Costs & Time
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Avg Material', value: fmt$(detail.avgCostMaterial), color: 'var(--navy)' },
            { label: 'Avg Labor', value: fmt$(detail.avgCostLabor), color: 'var(--navy)' },
            { label: 'Unit Cost', value: detail.unitCost != null ? fmt$(detail.unitCost) : '\u2014', color: 'var(--navy)' },
            { label: 'TAT', value: detail.turnAroundTime + 'd', color: 'var(--amber)' },
            { label: 'Tech 1 Hrs', value: String(detail.hoursTech1), color: 'var(--muted)' },
            { label: 'Tech 2 Hrs', value: String(detail.hoursTech2), color: 'var(--muted)' },
          ].map((card) => (
            <div key={card.label} style={{ background: 'var(--neutral-50)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>
      </>
    )}
  </Drawer>
);
