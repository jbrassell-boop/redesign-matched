import { useState, useEffect, useCallback } from 'react';
import { Input, Select, Table, DatePicker, Switch, message } from 'antd';
import { ExportButton } from '../../components/common/ExportButton';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getInvoices,
  getInvoiceDetail,
  getPayments,
  getClientsOnHold,
  getGLAccounts,
  getFinancialStats,
  getAtRisk,
  getTrending,
} from '../../api/financial';
import { FinancialDetailPane } from './FinancialDetailPane';
import { TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type {
  InvoiceListItem,
  InvoicePaymentItem,
  ClientOnHold,
  InvoiceDetail,
  FinancialStats,
  FinancialTab,
  GLAccountItem,
  AtRiskItem,
  TrendingItem,
} from './types';

const fmt$ = (v: number) =>
  '$' +
  v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? '\u2014'
    : dt.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
};

const TABS: TabDef[] = [
  { key: 'outstanding', label: 'Outstanding Invoices' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'hold', label: 'Clients on Hold' },
  { key: 'payments', label: 'Invoice Payments' },
  { key: 'gl', label: 'GL Accounts' },
  { key: 'atrisk', label: 'At Risk' },
  { key: 'trending', label: 'Trending' },
];

// Stat strip config — colored dot squares replace emoji icons
const STAT_CHIPS: {
  key: string;
  label: string;
  dotColor: string;
  valueColor: string;
  tab?: FinancialTab;
}[] = [
  { key: 'ar',      label: 'Outstanding A/R',  dotColor: 'var(--muted)',    valueColor: 'var(--navy)',    tab: 'outstanding' },
  { key: 'overdue', label: 'Overdue',           dotColor: 'var(--danger)',   valueColor: 'var(--danger)',  tab: 'outstanding' },
  { key: 'aging',   label: 'Avg Days to Pay',   dotColor: 'var(--amber)',    valueColor: 'var(--amber)'   },
  { key: 'drafts',  label: 'Drafts',            dotColor: 'var(--amber)',    valueColor: 'var(--amber)',   tab: 'drafts' },
  { key: 'hold',    label: 'On Hold',           dotColor: 'var(--danger)',   valueColor: 'var(--danger)',  tab: 'hold' },
  { key: 'paid',    label: 'Paid MTD',          dotColor: 'var(--success)',  valueColor: 'var(--success)', tab: 'payments' },
  { key: 'dso',     label: 'DSO',              dotColor: 'var(--primary)',  valueColor: 'var(--primary)'  },
  { key: 'rev',     label: 'Revenue MTD',       dotColor: 'var(--success)',  valueColor: 'var(--success)'  },
];

export const FinancialPage = () => {
  const [activeTab, setActiveTab] = useState<FinancialTab>('outstanding');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats | null>(null);

  // Data per tab
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [payments, setPayments] = useState<InvoicePaymentItem[]>([]);
  const [, setPaymentTotal] = useState(0);
  const [holds, setHolds] = useState<ClientOnHold[]>([]);
  const [, setHoldTotal] = useState(0);
  const [glAccounts, setGlAccounts] = useState<GLAccountItem[]>([]);

  // At Risk
  const [atRiskItems, setAtRiskItems] = useState<AtRiskItem[]>([]);
  const [atRiskDateFrom, setAtRiskDateFrom] = useState(dayjs().subtract(12, 'month').format('YYYY-MM-DD'));
  const [atRiskDateTo, setAtRiskDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [atRiskMinInvoices, setAtRiskMinInvoices] = useState(1);
  const [atRiskFilters, setAtRiskFilters] = useState({
    includeLabor: true,
    includeMaterial: true,
    includeOutsource: true,
    includeShipping: true,
    includeCommissions: true,
  });

  // Trending
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [trendDateFrom, setTrendDateFrom] = useState(dayjs().subtract(12, 'month').format('YYYY-MM-DD'));
  const [trendDateTo, setTrendDateTo] = useState(dayjs().format('YYYY-MM-DD'));

  // Inline split-pane detail (replaces Drawer)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Load stats once
  useEffect(() => {
    getFinancialStats().then(setStats).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'outstanding' || activeTab === 'drafts') {
        const res = await getInvoices({
          search: search || undefined,
          statusFilter: statusFilter || undefined,
          tab: activeTab,
          page,
          pageSize,
        });
        setInvoices(res.items);
        setInvoiceTotal(res.totalCount);
      } else if (activeTab === 'payments') {
        const res = await getPayments({ search: search || undefined, page, pageSize });
        setPayments(res.items);
        setPaymentTotal(res.totalCount);
      } else if (activeTab === 'hold') {
        const res = await getClientsOnHold({ page, pageSize });
        setHolds(res.items);
        setHoldTotal(res.totalCount);
      } else if (activeTab === 'gl') {
        const res = await getGLAccounts();
        setGlAccounts(res);
      } else if (activeTab === 'atrisk') {
        const res = await getAtRisk({
          from: atRiskDateFrom,
          to: atRiskDateTo,
          minInvoices: atRiskMinInvoices,
          ...atRiskFilters,
        });
        setAtRiskItems(res);
      } else if (activeTab === 'trending') {
        const res = await getTrending({ from: trendDateFrom, to: trendDateTo });
        setTrendingItems(res);
      }
    } catch {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, statusFilter, page, pageSize, atRiskDateFrom, atRiskDateTo, atRiskMinInvoices, atRiskFilters, trendDateFrom, trendDateTo]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as FinancialTab);
    setSearch('');
    setStatusFilter('');
    setPage(1);
    // Close detail pane when switching tabs
    setDetailOpen(false);
    setSelectedInvoice(null);
  };

  const handleViewInvoice = async (key: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const d = await getInvoiceDetail(key);
      setSelectedInvoice(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedInvoice(null);
  };

  const getStatValue = (key: string): string => {
    if (!stats) return '\u2014';
    switch (key) {
      case 'ar': return fmt$(stats.outstandingAR);
      case 'overdue': return String(stats.overdueCount);
      case 'aging': return stats.avgDaysToPay + 'd';
      case 'drafts': return String(stats.draftsCount);
      case 'hold': return String(stats.onHoldCount);
      case 'paid': return fmt$(stats.paidMTD);
      case 'dso': return stats.dso + 'd';
      case 'rev': return fmt$(stats.revenueMTD);
      default: return '\u2014';
    }
  };

  const showFilters = activeTab === 'outstanding' || activeTab === 'drafts' || activeTab === 'payments';

  const INVOICE_EXPORT_COLS = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'clientName', label: 'Client' },
    { key: 'amount', label: 'Amount' },
    { key: 'paymentTerms', label: 'Payment Terms' },
    { key: 'issuedDate', label: 'Issued Date' },
    { key: 'dueDate', label: 'Due Date' },
  ];





  const glColumns = [
    { title: 'Account #', dataIndex: 'accountNumber', key: 'accountNumber', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Batch Number', dataIndex: 'batchNumber', key: 'batchNumber', render: (v: string) => v || '\u2014' },
  ];

  // ─── Executive summary banner ───────────────────────────────────────────────
  const ExecBanner = () => (
    <div style={{
      padding: '12px 20px',
      background: 'linear-gradient(135deg, var(--navy) 0%, #1a365d 100%)',
      borderBottom: '2px solid var(--primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Financial Overview
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Outstanding A/R */}
        <div style={{
          background: 'var(--card)', borderRadius: 8,
          padding: '14px 16px', flex: 1, minWidth: 140,
          border: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Outstanding A/R</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1 }}>
            {stats ? fmt$(stats.outstandingAR) : '\u2014'}
          </div>
        </div>
        {/* Revenue MTD */}
        <div style={{
          background: 'var(--card)', borderRadius: 8,
          padding: '14px 16px', flex: 1, minWidth: 140,
          border: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Revenue MTD</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--success)', lineHeight: 1.1 }}>
            {stats ? fmt$(stats.revenueMTD) : '\u2014'}
          </div>
        </div>
        {/* DSO */}
        <div style={{
          background: 'var(--card)', borderRadius: 8,
          padding: '14px 16px', flex: 1, minWidth: 140,
          border: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Days Sales Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
            {stats ? stats.dso + 'd' : '\u2014'}
          </div>
          {stats && <div style={{ fontSize: 10, color: 'var(--muted)' }}>Avg {stats.avgDaysToPay}d to pay</div>}
        </div>
        {/* Overdue */}
        <div style={{
          background: 'var(--card)', borderRadius: 8,
          padding: '14px 16px', flex: 1, minWidth: 140,
          border: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 2,
          cursor: 'pointer',
        }}
          onClick={() => handleTabChange('outstanding')}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Overdue Invoices</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--danger)', lineHeight: 1.1 }}>
            {stats ? stats.overdueCount : '\u2014'}
          </div>
          {stats && stats.overdueCount > 0 && (
            <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>Requires attention</div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Stat strip (colored dot squares) ───────────────────────────────────────
  const StatStrip = () => (
    <div style={{
      display: 'flex',
      marginBottom: 16,
      borderRadius: 10,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'var(--card)',
    }}>
      {STAT_CHIPS.map((chip, i) => (
        <div
          key={chip.key}
          onClick={() => chip.tab && handleTabChange(chip.tab)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            cursor: chip.tab ? 'pointer' : 'default',
            borderRight: i < STAT_CHIPS.length - 1 ? '1px solid var(--border)' : undefined,
            background: chip.tab === activeTab ? 'var(--primary-light)' : undefined,
            outline: chip.tab === activeTab ? '2.5px solid var(--navy)' : undefined,
            outlineOffset: chip.tab === activeTab ? -2 : undefined,
            transition: 'background 0.12s',
          }}
        >
          {/* Colored dot square replacing emoji icon */}
          <div style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: chip.dotColor,
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: chip.valueColor, lineHeight: 1.2 }}>
              {getStatValue(chip.key)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{chip.label}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Main content area (list + optional inline detail) ─────────────────────
  const isListTab = activeTab === 'outstanding' || activeTab === 'drafts' || activeTab === 'payments' || activeTab === 'hold';

  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Subnav tabs */}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />

      {/* Executive summary banner */}
      <ExecBanner />

      {/* Body: scrollable for non-split tabs, split-pane for list tabs */}
      {isListTab ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: list panel */}
          <div style={{
            width: detailOpen ? 340 : '100%',
            minWidth: detailOpen ? 340 : undefined,
            borderRight: detailOpen ? '1px solid var(--neutral-200)' : undefined,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}>
            {/* Toolbar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--neutral-200)', background: 'var(--card)', flexShrink: 0 }}>
              {/* Stat strip — only in list tabs */}
              <StatStrip />

              {/* Filter row */}
              {showFilters && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                      prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: detailOpen ? 160 : 260, height: 32, fontSize: 12 }}
                      allowClear
                    />
                    {activeTab === 'outstanding' && !detailOpen && (
                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 150 }}
                        options={[
                          { value: '', label: 'All Statuses' },
                          { value: 'current', label: 'Current' },
                          { value: 'unpaid', label: 'Unpaid' },
                          { value: 'overdue', label: 'Overdue' },
                          { value: 'paid', label: 'Paid' },
                        ]}
                      />
                    )}
                  </div>
                  {!detailOpen && (
                    <ExportButton
                      data={invoices as unknown as Record<string, unknown>[]}
                      columns={INVOICE_EXPORT_COLS}
                      filename="invoices"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Invoice/payment/hold rows */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'outstanding' && renderInvoiceRows(invoices, loading, detailOpen, selectedInvoice, handleViewInvoice, false)}
              {activeTab === 'drafts' && renderInvoiceRows(invoices, loading, detailOpen, selectedInvoice, handleViewInvoice, true)}
              {activeTab === 'payments' && renderPaymentRows(payments, loading)}
              {activeTab === 'hold' && renderHoldRows(holds, loading)}
            </div>

            {/* Pagination for paginated tabs */}
            {(activeTab === 'outstanding' || activeTab === 'drafts') && invoiceTotal > pageSize && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--neutral-200)', background: 'var(--card)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {invoiceTotal.toLocaleString()} total invoices
                </span>
              </div>
            )}
          </div>

          {/* Right: inline detail pane */}
          {detailOpen && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
              <FinancialDetailPane
                detail={selectedInvoice}
                loading={detailLoading}
                open={detailOpen}
                onClose={handleCloseDetail}
              />
            </div>
          )}
        </div>
      ) : (
        /* Non-split tabs: scrollable full-width */
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* Stat strip for non-list tabs */}
          <StatStrip />

          {/* GL Accounts */}
          {activeTab === 'gl' && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
              <Table
                dataSource={glAccounts}
                columns={glColumns}
                rowKey="accountNumber"
                loading={loading}
                size="small"
                pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'] }}
                style={{ fontSize: 12 }}
              />
            </div>
          )}

          {/* At Risk Tab */}
          {activeTab === 'atrisk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Filter bar */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>From</span>
                  <DatePicker
                    value={dayjs(atRiskDateFrom)}
                    onChange={(d) => d && setAtRiskDateFrom(d.format('YYYY-MM-DD'))}
                    picker="month" style={{ width: 130 }} size="small"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>To</span>
                  <DatePicker
                    value={dayjs(atRiskDateTo)}
                    onChange={(d) => d && setAtRiskDateTo(d.format('YYYY-MM-DD'))}
                    picker="month" style={{ width: 130 }} size="small"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Min Repairs</span>
                  <Select
                    value={atRiskMinInvoices}
                    onChange={setAtRiskMinInvoices}
                    options={[1, 3, 5, 10, 20].map(v => ({ value: v, label: v }))}
                    style={{ width: 70 }}
                    size="small"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { key: 'includeLabor' as const, label: 'Labor' },
                    { key: 'includeMaterial' as const, label: 'Material' },
                    { key: 'includeOutsource' as const, label: 'Outsource' },
                    { key: 'includeShipping' as const, label: 'Shipping' },
                    { key: 'includeCommissions' as const, label: 'Commissions' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <Switch
                        size="small"
                        checked={atRiskFilters[f.key]}
                        onChange={(v) => setAtRiskFilters(prev => ({ ...prev, [f.key]: v }))}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text)' }}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Summary stats */}
              {atRiskItems.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Departments', value: atRiskItems.length, color: 'var(--navy)' },
                    { label: 'Total Revenue', value: '$' + atRiskItems.reduce((s, r) => s + r.revenue, 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'var(--success)' },
                    { label: 'Total Expenses', value: '$' + atRiskItems.reduce((s, r) => s + r.totalExpenses, 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'var(--warning)' },
                    { label: 'At Risk (< 40%)', value: atRiskItems.filter(r => r.marginPct < 40).length, color: 'var(--danger)' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Table */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <Table<AtRiskItem>
                  dataSource={atRiskItems}
                  rowKey="departmentKey"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'] }}
                  style={{ fontSize: 12 }}
                  rowClassName={(r) => r.marginPct < 40 ? 'at-risk-row' : ''}
                  columns={[
                    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                    { title: 'Client', dataIndex: 'clientName', key: 'clientName', render: (v: string) => <span style={{ color: 'var(--muted)' }}>{v || '\u2014'}</span> },
                    { title: 'Repairs', dataIndex: 'repairCount', key: 'repairCount', align: 'right' as const },
                    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', align: 'right' as const, sorter: (a: AtRiskItem, b: AtRiskItem) => a.revenue - b.revenue, defaultSortOrder: 'descend' as const, render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--navy)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Expenses', dataIndex: 'totalExpenses', key: 'totalExpenses', align: 'right' as const, render: (v: number) => <span style={{ color: 'var(--warning)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Margin', dataIndex: 'margin', key: 'margin', align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 600 }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Margin %', dataIndex: 'marginPct', key: 'marginPct', align: 'right' as const, sorter: (a: AtRiskItem, b: AtRiskItem) => a.marginPct - b.marginPct, render: (v: number) => (
                      <span style={{ fontWeight: 700, color: v < 40 ? 'var(--danger)' : v < 60 ? 'var(--warning)' : 'var(--success)' }}>{v}%</span>
                    )},
                    { title: 'Labor', dataIndex: 'laborCost', key: 'laborCost', align: 'right' as const, render: (v: number) => <span style={{ fontSize: 11, color: 'var(--muted)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Outsource', dataIndex: 'outsourceCost', key: 'outsourceCost', align: 'right' as const, render: (v: number) => <span style={{ fontSize: 11, color: 'var(--muted)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Filter bar */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>From</span>
                  <DatePicker
                    value={dayjs(trendDateFrom)}
                    onChange={(d) => d && setTrendDateFrom(d.format('YYYY-MM-DD'))}
                    picker="month" style={{ width: 130 }} size="small"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>To</span>
                  <DatePicker
                    value={dayjs(trendDateTo)}
                    onChange={(d) => d && setTrendDateTo(d.format('YYYY-MM-DD'))}
                    picker="month" style={{ width: 130 }} size="small"
                  />
                </div>
              </div>
              {/* Summary stats */}
              {trendingItems.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Months', value: trendingItems.length, color: 'var(--navy)' },
                    { label: 'Total Revenue', value: '$' + trendingItems.reduce((s, t) => s + Number(t.revenue), 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'var(--success)' },
                    { label: 'Total Repairs', value: trendingItems.reduce((s, t) => s + t.repairCount, 0), color: 'var(--primary)' },
                    { label: 'Avg Margin %', value: trendingItems.length > 0 ? Math.round(trendingItems.reduce((s, t) => s + Number(t.marginPct), 0) / trendingItems.length) + '%' : '\u2014', color: 'var(--warning)' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Table */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <Table<TrendingItem>
                  dataSource={trendingItems}
                  rowKey="month"
                  loading={loading}
                  size="small"
                  pagination={false}
                  style={{ fontSize: 12 }}
                  columns={[
                    { title: 'Month', dataIndex: 'month', key: 'month', render: (v: string) => <span style={{ fontWeight: 700 }}>{v}</span> },
                    { title: 'Repairs', dataIndex: 'repairCount', key: 'repairCount', align: 'right' as const },
                    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--navy)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Labor', dataIndex: 'laborCost', key: 'laborCost', align: 'right' as const, render: (v: number) => <span style={{ color: 'var(--muted)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Material', dataIndex: 'materialCost', key: 'materialCost', align: 'right' as const, render: (v: number) => <span style={{ color: 'var(--muted)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Outsource', dataIndex: 'outsourceCost', key: 'outsourceCost', align: 'right' as const, render: (v: number) => <span style={{ color: 'var(--muted)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Total Expenses', dataIndex: 'totalExpenses', key: 'totalExpenses', align: 'right' as const, render: (v: number) => <span style={{ color: 'var(--warning)' }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Margin', dataIndex: 'margin', key: 'margin', align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 600 }}>${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> },
                    { title: 'Margin %', dataIndex: 'marginPct', key: 'marginPct', align: 'right' as const, render: (v: number) => (
                      <span style={{ fontWeight: 700, color: v < 40 ? 'var(--danger)' : v < 60 ? 'var(--warning)' : 'var(--success)' }}>{v}%</span>
                    )},
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Row renderers (styled cards replacing Ant Design Table for list tabs) ────

function renderInvoiceRows(
  invoices: InvoiceListItem[],
  loading: boolean,
  detailOpen: boolean,
  selectedInvoice: InvoiceDetail | null,
  onView: (key: number) => void,
  isDraft: boolean,
) {
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>;
  }
  if (invoices.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No invoices found</div>;
  }
  return (
    <>
      {invoices.map(inv => {
        const isSelected = selectedInvoice?.invoiceKey === inv.invoiceKey;
        const isOverdue = inv.status.toLowerCase().includes('overdue');
        const amtColor = isOverdue ? 'var(--danger)' : inv.status === 'Paid' ? 'var(--success)' : 'var(--navy)';
        return (
          <div
            key={inv.invoiceKey}
            onClick={() => onView(inv.invoiceKey)}
            style={{
              padding: detailOpen ? '10px 14px' : '10px 16px',
              borderBottom: '1px solid var(--neutral-100)',
              cursor: 'pointer',
              background: isSelected ? 'var(--primary-light, #dbeafe)' : 'var(--card)',
              borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--card)'; }}
          >
            {detailOpen ? (
              /* Compact layout when pane is open */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{inv.invoiceNumber}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: amtColor }}>{fmt$(inv.amount)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{inv.clientName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <StatusBadgeInline status={isDraft ? 'Draft' : inv.status} />
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDate(inv.issuedDate)}</span>
                </div>
              </div>
            ) : (
              /* Full layout when no pane open */
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{inv.invoiceNumber}</span>
                    <StatusBadgeInline status={isDraft ? 'Draft' : inv.status} />
                    {inv.agingDays > 30 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)' }}>{inv.agingDays}d overdue</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{inv.clientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                    {inv.paymentTerms || '\u2014'} · Due {fmtDate(inv.dueDate)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: amtColor }}>{fmt$(inv.amount)}</div>
                  {inv.taxAmount > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>+{fmt$(inv.taxAmount)} tax</div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    Issued {fmtDate(inv.issuedDate)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function renderPaymentRows(payments: InvoicePaymentItem[], loading: boolean) {
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>;
  }
  if (payments.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No payments found</div>;
  }
  return (
    <>
      {payments.map(p => (
        <div
          key={p.paymentId}
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--neutral-100)',
            background: 'var(--card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{p.invoiceNumber}</span>
              <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{p.clientName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                Paid {fmtDate(p.paymentDate)}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt$(p.paymentAmount)}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function renderHoldRows(holds: ClientOnHold[], loading: boolean) {
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>;
  }
  if (holds.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No clients on hold</div>;
  }
  return (
    <>
      {holds.map(h => (
        <div
          key={h.clientKey}
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--neutral-100)',
            background: 'var(--card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{h.clientName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h.departmentName}</div>
              {h.reason && (
                <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{h.reason}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>On Hold</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Since {fmtDate(h.onHoldDate)}</div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Inline helpers used inside row renderers (module scope, no hooks)
function StatusBadgeInline({ status }: { status: string }) {
  const s = status.toLowerCase();
  const bg = s.includes('overdue') ? 'rgba(var(--danger-rgb),0.1)' :
             s === 'paid' ? 'rgba(var(--success-rgb),0.1)' :
             s === 'draft' ? 'rgba(var(--amber-rgb),0.1)' :
             'var(--neutral-100)';
  const color = s.includes('overdue') ? 'var(--danger)' :
                s === 'paid' ? 'var(--success)' :
                s === 'draft' ? 'var(--amber)' :
                'var(--muted)';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
      background: bg, color,
    }}>
      {status}
    </span>
  );
}

