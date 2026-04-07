import { useState, useEffect, useCallback } from 'react';
import { Input, Select, Modal, Button, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { getProductSales, getProductSaleDetail, getProductSaleStats, createProductSale } from '../../api/product-sales';
import { ProductSaleDetailPane } from './ProductSaleDetailPane';
import { StatusBadge } from '../../components/shared';
import type { ProductSaleListItem, ProductSaleDetail, ProductSaleStats } from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

// ── Extracted static styles ──
const pageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const statStripStyle: React.CSSProperties = { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' };
const statIconStyle: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 };
const statLabelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' };
const splitPaneStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex' };
const listToolbarStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 };
const listToolbarTopStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const listToolbarTitleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const listTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--navy)' };
const listCountBadgeStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' };
const listScrollStyle: React.CSSProperties = { flex: 1, overflow: 'auto' };
const loadingTextStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 };
const listItemInvoiceStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const listItemNameStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--navy)' };
const listItemClientStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 };
const listItemBottomStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--muted)' };
const listItemTotalStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--navy)' };
const paginationBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 };
const paginationCountStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)' };
const paginationBtnsStyle: React.CSSProperties = { display: 'flex', gap: 3 };
const rightPanelStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' };
const modalFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
const modalBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' };
const modalLabelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 };
const modalHintStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', margin: 0 };

const STAT_CHIPS: {
  key: string;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  icon: string;
  filter?: string;
}[] = [
  { key: 'total', label: 'Total Orders', iconBg: 'rgba(var(--navy-rgb), 0.13)', iconColor: 'var(--navy)', valueColor: 'var(--navy)', icon: '\u2630' },
  { key: 'open', label: 'Open', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2751', filter: 'Open' },
  { key: 'invoiced', label: 'Invoiced', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2713', filter: 'Invoiced' },
  { key: 'draft', label: 'Draft', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u270F', filter: 'Draft' },
  { key: 'quoted', label: 'Quoted', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2709', filter: 'Quote Sent' },
  { key: 'cancelled', label: 'Cancelled', iconBg: 'rgba(var(--danger-rgb), 0.13)', iconColor: 'var(--danger)', valueColor: 'var(--danger)', icon: '\u2715', filter: 'Cancelled' },
  { key: 'revenue', label: 'Total Revenue', iconBg: 'rgba(var(--navy-rgb), 0.13)', iconColor: 'var(--navy)', valueColor: 'var(--navy)', icon: '$' },
];

export const ProductSalePage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductSaleStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const [sales, setSales] = useState<ProductSaleListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Inline detail state
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProductSaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Sale modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [_createClientKey, setCreateClientKey] = useState<string>('');
  const [createPO, setCreatePO] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProductSaleStats().then(d => { if (!cancelled) setStats(d); }).catch(() => { if (!cancelled) message.error('Failed to load product sale stats'); });
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductSales({
        search: search || undefined,
        statusFilter: statusFilter || undefined,
        page,
        pageSize,
      });
      setSales(res.items);
      setTotalCount(res.totalCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const handleView = async (key: number) => {
    setSelectedKey(key);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await getProductSaleDetail(key);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedKey(null);
    setDetail(null);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createProductSale({
        purchaseOrder: createPO || null,
        note: createNotes || null,
      });
      message.success('Product sale created');
      setCreateModalOpen(false);
      setCreateClientKey('');
      setCreatePO('');
      setCreateNotes('');
      loadData();
      // Open the new record in the detail pane
      if (res?.productSaleKey) {
        handleView(res.productSaleKey);
      }
    } catch {
      message.error('Failed to create product sale');
    } finally {
      setCreating(false);
    }
  };

  const handleChipClick = (filter?: string) => {
    setStatusFilter(filter ?? '');
    setPage(1);
  };

  const getStatValue = (key: string): string => {
    if (!stats) return '\u2014';
    switch (key) {
      case 'total': return String(stats.totalOrders);
      case 'open': return String(stats.openCount);
      case 'invoiced': return String(stats.invoicedCount);
      case 'draft': return String(stats.draftCount);
      case 'quoted': return String(stats.quotedCount);
      case 'cancelled': return String(stats.cancelledCount);
      case 'revenue': return fmt$(stats.totalRevenue);
      default: return '\u2014';
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={pageContainerStyle}>
      {/* Stat strip */}
      <div style={statStripStyle}>
        {STAT_CHIPS.map((chip, i) => (
          <div
            key={chip.key}
            onClick={() => handleChipClick(chip.filter)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              cursor: chip.filter !== undefined ? 'pointer' : 'default',
              borderRight: i < STAT_CHIPS.length - 1 ? '1px solid var(--border)' : undefined,
              background: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? 'var(--primary-light)' : undefined,
              outline: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? '2.5px solid var(--navy)' : undefined,
              outlineOffset: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? -2 : undefined,
              transition: 'background 0.12s',
              minWidth: 100,
            }}
          >
            <div style={{
              ...statIconStyle,
              background: chip.iconBg, color: chip.iconColor,
            }}>
              {chip.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: chip.valueColor, lineHeight: 1.2 }}>{getStatValue(chip.key)}</div>
              <div style={statLabelStyle}>{chip.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Split pane */}
      <div style={splitPaneStyle}>
        {/* Left panel — list */}
        <aside aria-label="Product sales list" style={{
          width: selectedKey ? 340 : '100%',
          minWidth: selectedKey ? 340 : undefined,
          borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}>
          {/* List toolbar */}
          <div style={listToolbarStyle}>
            <div style={listToolbarTopStyle}>
              <div style={listToolbarTitleRowStyle}>
                <span style={listTitleStyle}>Product Sales</span>
                <span style={listCountBadgeStyle}>{totalCount.toLocaleString()}</span>
              </div>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                size="small"
                style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 11, height: 28 }}
                onClick={() => setCreateModalOpen(true)}
              >
                {selectedKey ? '' : 'New Sale'}
              </Button>
            </div>
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
              placeholder="Search invoice#, client, PO#..."
              aria-label="Search product sales"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: 28, fontSize: 11 }}
              allowClear
            />
            {!selectedKey && (
              <Select
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                style={{ width: '100%' }}
                size="small"
                aria-label="Filter by status"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Open', label: 'Open' },
                  { value: 'Invoiced', label: 'Invoiced' },
                  { value: 'Cancelled', label: 'Cancelled' },
                  { value: 'Quote Sent', label: 'Quote Sent' },
                ]}
              />
            )}
          </div>

          {/* List rows */}
          <div style={listScrollStyle}>
            {loading && <div style={loadingTextStyle}>Loading...</div>}
            {!loading && sales.length === 0 && <div style={loadingTextStyle}>No records found</div>}
            {sales.map(item => {
              const isSelected = item.productSaleKey === selectedKey;
              return (
                <div
                  key={item.productSaleKey}
                  onClick={() => handleView(item.productSaleKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleView(item.productSaleKey); } }}
                  style={{
                    padding: '9px 12px',
                    borderBottom: '1px solid var(--neutral-100)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--primary-light)' : 'var(--card)',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--card)'; }}
                >
                  <div style={listItemInvoiceStyle}>
                    <div style={listItemNameStyle}>{item.invoiceNumber || '\u2014'}</div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div style={listItemClientStyle}>{item.clientName}</div>
                  <div style={listItemBottomStyle}>
                    <span>{fmtDate(item.orderDate)}</span>
                    <span style={listItemTotalStyle}>{fmt$(item.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={paginationBarStyle}>
            <span style={paginationCountStyle}>{sales.length} of {totalCount}</span>
            {totalPages > 1 && (
              <div style={paginationBtnsStyle}>
                <PgBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{'\u2039'}</PgBtn>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? <PgBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PgBtn> : null;
                })}
                <PgBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{'\u203A'}</PgBtn>
              </div>
            )}
          </div>
        </aside>

        {/* Right panel — detail */}
        {selectedKey && (
          <section aria-label="Product sale details" style={rightPanelStyle}>
            <ProductSaleDetailPane
              detail={detail}
              loading={detailLoading}
              open={true}
              onClose={handleCloseDetail}
            />
          </section>
        )}
      </div>

      {/* New Product Sale Modal */}
      <Modal
        title="New Product Sale"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={
          <div style={modalFooterStyle}>
            <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={creating}
              onClick={handleCreate}
              style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              Create
            </Button>
          </div>
        }
        width={440}
      >
        <div style={modalBodyStyle}>
          <div>
            <label style={modalLabelStyle}>Purchase Order #</label>
            <Input
              aria-label="Purchase Order #"
              value={createPO}
              onChange={e => setCreatePO(e.target.value)}
              placeholder="Optional PO number"
              style={{ fontSize: 12 }}
            />
          </div>
          <div>
            <label style={modalLabelStyle}>Notes</label>
            <Input.TextArea
              aria-label="Notes"
              rows={3}
              value={createNotes}
              onChange={e => setCreateNotes(e.target.value)}
              placeholder="Optional notes for this order"
              style={{ fontSize: 12 }}
            />
          </div>
          <p style={modalHintStyle}>
            Client, department, and line items can be added after creation in the detail view.
          </p>
        </div>
      </Modal>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} style={{
    height: 22, minWidth: 22, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 10, fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 600 : 400,
    background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--card)' : 'var(--muted)', opacity: disabled ? 0.4 : 1,
  }}>{children}</button>
);
