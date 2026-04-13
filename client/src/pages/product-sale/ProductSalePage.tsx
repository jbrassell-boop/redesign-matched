import { useState, useEffect, useCallback } from 'react';
import { Input, Button, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { StatStrip, StatusBadge, DevNotice } from '../../components/shared';
import type { StatChipDef } from '../../components/shared';
import { getProductSales, getProductSaleStats } from '../../api/product-sales';
import { ProductSaleDrawer } from './ProductSaleDrawer';
import type { ProductSaleListItem, ProductSaleStats } from './types';
import './ProductSalePage.css';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

function buildChips(stats: ProductSaleStats | null): StatChipDef[] {
  return [
    { id: 'total', label: 'Total Orders', value: stats?.total ?? null, color: 'navy' },
    { id: 'draft', label: 'Draft', value: stats?.draft ?? null, color: 'amber' },
    { id: 'quoted', label: 'Quoted', value: stats?.quoted ?? null, color: 'blue' },
    { id: 'approved', label: 'Approved', value: stats?.approved ?? null, color: 'green' },
    { id: 'invoiced', label: 'Invoiced', value: stats?.invoiced ?? null, color: 'green' },
    { id: 'cancelled', label: 'Cancelled', value: stats?.cancelled ?? null, color: 'red' },
    { id: 'revenue', label: 'Revenue', value: stats ? fmt$(stats.revenue) : null, color: 'navy' },
  ];
}

const STATUS_FILTER_MAP: Record<string, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  approved: 'Approved',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
};

export const ProductSalePage = () => {
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductSaleStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sales, setSales] = useState<ProductSaleListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Drawer
  const [drawerKey, setDrawerKey] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadStats = useCallback(() => {
    getProductSaleStats()
      .then(setStats)
      .catch(() => message.error('Failed to load stats'));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statusFilter = STATUS_FILTER_MAP[activeChip] ?? undefined;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductSales({
        search: search || undefined,
        status: statusFilter,
        page,
        pageSize,
      });
      setSales(res.items);
      setTotalCount(res.totalCount);
    } catch {
      message.error('Failed to load product sales');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const handleRowClick = (key: number) => {
    setDrawerKey(key);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setDrawerKey(null);
  };

  const handleUpdated = () => {
    loadData();
    loadStats();
  };

  const handleChipClick = (id: string) => {
    setActiveChip(id);
    setPage(1);
  };

  const chips = buildChips(stats);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="ps-page">
      {/* Stat strip */}
      <StatStrip
        chips={chips}
        loading={!stats}
        activeChip={activeChip === 'all' ? undefined : activeChip}
        onChipClick={handleChipClick}
      />

      {/* Controls row */}
      <div className="ps-controls">
        <DevNotice
          title="New Order"
          requirement="Build a create-order modal with Client dropdown (search tblClient), Department dropdown (filtered by client from tblDepartment), and Sales Rep dropdown. POST /api/product-sales endpoint exists but needs clientKey + departmentKey."
          sql={'-- Lookups needed:\nGET /api/clients?search=&pageSize=50 (exists)\nGET /api/departments?clientKey=@key (needs filter param)\nGET /api/lookups/sales-reps (new endpoint)'}
        >
          <Button
            icon={<PlusOutlined />}
            type="primary"
            size="small"
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 12, height: 30 }}
          >
            + New Order
          </Button>
        </DevNotice>
        <div className="ps-controls__search">
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder="Search invoice#, client, PO..."
            aria-label="Search product sales"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: 30, fontSize: 12 }}
            allowClear
          />
        </div>
      </div>

      {/* Table */}
      <div className="ps-table-wrap">
        {loading ? (
          <div className="ps-loading">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="ps-loading">No records found</div>
        ) : (
          <table className="ps-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Department</th>
                <th>Status</th>
                <th>Source</th>
                <th>Sales Rep</th>
                <th>Order Date</th>
                <th className="ps-col-right">Total</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(item => (
                <tr
                  key={item.productSaleKey}
                  onClick={() => handleRowClick(item.productSaleKey)}
                  className={item.productSaleKey === drawerKey ? 'ps-row--selected' : ''}
                >
                  <td className="ps-col-bold">{item.invoiceNumber || '\u2014'}</td>
                  <td>{item.clientName}</td>
                  <td>{item.departmentName || '\u2014'}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    {item.source ? (
                      <span className="ps-source-badge">{item.source}</span>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                  <td>{item.salesRep || '\u2014'}</td>
                  <td>{fmtDate(item.orderDate)}</td>
                  <td className="ps-col-right ps-col-bold">{fmt$(item.total)}</td>
                  <td className="ps-items-col">
                    {item.itemCount}
                    {item.backorderedCount > 0 && (
                      <span className="ps-items-bo">({item.backorderedCount} BO)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="ps-pagination">
          <span className="ps-pagination__info">{sales.length} of {totalCount}</span>
          <div className="ps-pagination__btns">
            <button
              className="ps-pg-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >{'\u2039'}</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <button
                  key={p}
                  className={`ps-pg-btn${p === page ? ' ps-pg-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >{p}</button>
              ) : null;
            })}
            <button
              className="ps-pg-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >{'\u203A'}</button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <ProductSaleDrawer
        productSaleKey={drawerKey}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onUpdated={handleUpdated}
      />

      {/* New Product Sale Modal — placeholder until client/dept picker is built */}
    </div>
  );
};
