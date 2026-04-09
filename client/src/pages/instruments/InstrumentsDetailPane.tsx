import { Spin, Table } from 'antd';
import type { InstrumentRepairDetail, InstrumentCatalogDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader } from '../../components/shared';
import './InstrumentsDetailPane.css';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

/* ── Shared inline header ──────────────────────────────────────── */
const InlineHeader = ({ title, badge, onClose }: { title: React.ReactNode; badge?: React.ReactNode; onClose: () => void }) => (
  <div className="indp-header">
    <div className="indp-header-left">
      <h2 className="indp-header-title">{title}</h2>
      {badge}
    </div>
    <button onClick={onClose} className="indp-close-btn">&times;</button>
  </div>
);

/* ── Repair Detail Pane (inline) ───────────────────────────── */
interface RepairPaneProps {
  detail: InstrumentRepairDetail | null;
  loading: boolean;
  onClose: () => void;
}

export const RepairDetailPane = ({ detail, loading, onClose }: RepairPaneProps) => {
  const itemColumns = [
    { title: 'Item', dataIndex: 'itemDescription', key: 'itemDescription' },
    {
      title: 'Price',
      dataIndex: 'repairPrice',
      key: 'repairPrice',
      align: 'right' as const,
      render: (v: number) => <span className="indp-price-bold">{fmt$(v)}</span>,
    },
    {
      title: 'Approved',
      dataIndex: 'approved',
      key: 'approved',
      render: (v: string | null) => {
        if (v === 'Y') return <StatusBadge status="Yes" variant="green" />;
        if (v === 'N') return <StatusBadge status="No" variant="red" />;
        if (v === 'P') return <StatusBadge status="Pending" variant="amber" />;
        return <span className="indp-muted-dash">\u2014</span>;
      },
    },
    { title: 'Fix', dataIndex: 'fixType', key: 'fixType', render: (v: string | null) => v || '\u2014' },
    { title: 'Comments', dataIndex: 'comments', key: 'comments', render: (v: string | null) => v || '\u2014' },
  ];

  return (
    <div className="indp-container">
      <InlineHeader
        title={detail ? `Order ${detail.orderNumber}` : 'Repair Detail'}
        badge={detail ? <StatusBadge status={detail.status} /> : undefined}
        onClose={onClose}
      />
      <div className="indp-body">
        {loading ? (
          <div className="indp-loading"><Spin /></div>
        ) : !detail ? (
          <div className="indp-empty">No repair selected</div>
        ) : (
          <>
            <div className="indp-stat-strip">
              <div className="indp-stat-item">
                <div className="indp-stat-label">Items</div>
                <div className="indp-stat-value">{detail.items.length}</div>
              </div>
              <div>
                <div className="indp-stat-label">Days Open</div>
                <div className="indp-stat-value" style={{
                  color: detail.daysOpen > 14 ? 'var(--danger)' : detail.daysOpen > 7 ? 'var(--amber)' : 'var(--muted)',
                }}>
                  {detail.daysOpen}d
                </div>
              </div>
              <div>
                <div className="indp-stat-label">Total Value</div>
                <div className="indp-stat-value">
                  {fmt$(detail.items.reduce((s, i) => s + i.repairPrice, 0))}
                </div>
              </div>
            </div>

            <FormGrid cols={2}>
              <Field label="Client" value={detail.clientName} />
              <Field label="Department" value={detail.departmentName} />
              <Field label="PO #" value={detail.purchaseOrder} />
              <Field label="Technician" value={detail.technicianName} />
              <Field label="Received" value={fmtDate(detail.dateReceived)} />
              <Field label="Due" value={fmtDate(detail.dateDue)} />
              <Field label="Completed" value={fmtDate(detail.dateCompleted)} />
            </FormGrid>

            {detail.notes && (
              <div className="indp-notes-spacer">
                <Field label="Notes" value={detail.notes} />
              </div>
            )}

            {detail.items.length > 0 && (
              <div className="indp-table-spacer">
                <div className="indp-section-head">
                  Line Items ({detail.items.length})
                </div>
                <Table
                  dataSource={detail.items}
                  columns={itemColumns}
                  rowKey="tranKey"
                  size="small"
                  pagination={false}
                  className="indp-table-wrap"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Catalog Detail Pane (inline) ──────────────────────────── */
interface CatalogPaneProps {
  detail: InstrumentCatalogDetail | null;
  loading: boolean;
  onClose: () => void;
}

export const CatalogDetailPane = ({ detail, loading, onClose }: CatalogPaneProps) => (
  <div className="indp-container">
    <InlineHeader
      title={detail ? detail.itemDescription : 'Instrument Detail'}
      badge={detail ? <StatusBadge status={detail.isActive ? 'Active' : 'Inactive'} /> : undefined}
      onClose={onClose}
    />
    <div className="indp-body">
      {loading ? (
        <div className="indp-loading"><Spin /></div>
      ) : !detail ? (
        <div className="indp-empty">No instrument selected</div>
      ) : (
        <>
          <FormGrid cols={2}>
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
          </FormGrid>

          <div className="indp-costs-label">
            Costs &amp; Time
          </div>
          <FormGrid cols={3}>
            {[
              { label: 'Avg Material', value: fmt$(detail.avgCostMaterial), color: 'var(--navy)' },
              { label: 'Avg Labor', value: fmt$(detail.avgCostLabor), color: 'var(--navy)' },
              { label: 'Unit Cost', value: detail.unitCost != null ? fmt$(detail.unitCost) : '\u2014', color: 'var(--navy)' },
              { label: 'TAT', value: detail.turnAroundTime + 'd', color: 'var(--amber)' },
              { label: 'Tech 1 Hrs', value: String(detail.hoursTech1), color: 'var(--muted)' },
              { label: 'Tech 2 Hrs', value: String(detail.hoursTech2), color: 'var(--muted)' },
            ].map((card) => (
              <div key={card.label} className="indp-cost-card">
                <div className="indp-cost-value" style={{ color: card.color }}>{card.value}</div>
                <div className="indp-cost-label">{card.label}</div>
              </div>
            ))}
          </FormGrid>
        </>
      )}
    </div>
  </div>
);

/* ── Legacy Drawer exports (kept for backwards compat) ──────── */
// These are no longer used but kept to avoid breaking any other imports
export { RepairDetailPane as RepairDrawer, CatalogDetailPane as CatalogDrawer };

// Re-export DetailHeader so any callers that imported it from here still work
export { DetailHeader };
