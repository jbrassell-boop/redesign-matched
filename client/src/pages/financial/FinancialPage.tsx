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
import { TabBar, StatusBadge } from '../../components/shared';
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

const STAT_CHIPS: {
  key: string;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  icon: string;
  tab?: FinancialTab;
}[] = [
  { key: 'ar', label: 'Outstanding A/R', iconBg: 'rgba(var(--muted-rgb), 0.13)', iconColor: 'var(--muted)', valueColor: 'var(--navy)', icon: '$', tab: 'outstanding' },
  { key: 'overdue', label: 'Overdue', iconBg: 'rgba(var(--danger-rgb), 0.13)', iconColor: 'var(--danger)', valueColor: 'var(--danger)', icon: '!', tab: 'outstanding' },
  { key: 'aging', label: 'Avg Days to Pay', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u23F1' },
  { key: 'drafts', label: 'Drafts', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u270F', tab: 'drafts' },
  { key: 'hold', label: 'On Hold', iconBg: 'rgba(var(--danger-rgb), 0.13)', iconColor: 'var(--danger)', valueColor: 'var(--danger)', icon: '\u2212', tab: 'hold' },
  { key: 'paid', label: 'Paid MTD', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2713', tab: 'payments' },
  { key: 'dso', label: 'DSO', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u23F0' },
  { key: 'rev', label: 'Revenue MTD', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2191' },
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
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [holds, setHolds] = useState<ClientOnHold[]>([]);
  const [holdTotal, setHoldTotal] = useState(0);
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

  // Detail drawer
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
  };

  const handleViewInvoice = async (key: number) => {
    setDetailLoading(true);
    setDrawerOpen(true);
    try {
      const d = await getInvoiceDetail(key);
      setSelectedInvoice(d);
    } finally {
      setDetailLoading(false);
    }
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

  const outstandingColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string) => <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: number, r: InvoiceListItem) => (
        <span style={{ fontWeight: 700, color: r.status.toLowerCase().includes('overdue') ? 'var(--danger)' : r.status === 'Paid' ? 'var(--success)' : 'var(--navy)' }}>
          {fmt$(v)}
        </span>
      ),
      sorter: (a: InvoiceListItem, b: InvoiceListItem) => a.amount - b.amount,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      align: 'right' as const,
      render: (v: number) => <span style={{ color: 'var(--muted)' }}>{v ? fmt$(v) : '\u2014'}</span>,
    },
    { title: 'Terms', dataIndex: 'paymentTerms', key: 'paymentTerms', render: (v: string) => v || '\u2014' },
    {
      title: 'Issued',
      dataIndex: 'issuedDate',
      key: 'issuedDate',
      render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v: string | null, r: InvoiceListItem) => (
        <span style={{ color: r.agingDays > 90 ? 'var(--danger)' : undefined, fontWeight: r.agingDays > 90 ? 600 : undefined }}>
          {fmtDate(v)}
        </span>
      ),
    },
    {
      title: 'Aging',
      dataIndex: 'agingDays',
      key: 'agingDays',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: v > 30 ? 'var(--danger)' : v > 14 ? 'var(--amber)' : 'var(--muted)', fontWeight: v > 30 ? 700 : v > 14 ? 600 : 400 }}>
          {v}d
        </span>
      ),
      sorter: (a: InvoiceListItem, b: InvoiceListItem) => a.agingDays - b.agingDays,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, r: InvoiceListItem) => (
        <button
          onClick={() => handleViewInvoice(r.invoiceKey)}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--card)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          View
        </button>
      ),
    },
  ];

  const draftsColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string) => <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt$(v)}</span>,
    },
    {
      title: 'Created',
      dataIndex: 'issuedDate',
      key: 'issuedDate',
      render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span>,
    },
    { title: 'Delivery', dataIndex: 'deliveryMethod', key: 'deliveryMethod', render: (v: string) => v || '\u2014' },
    {
      title: 'Status',
      key: 'status',
      render: () => <StatusBadge status="Draft" />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, r: InvoiceListItem) => (
        <button
          onClick={() => handleViewInvoice(r.invoiceKey)}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--card)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
      ),
    },
  ];

  const paymentsColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string) => <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
    {
      title: 'Amount',
      dataIndex: 'paymentAmount',
      key: 'paymentAmount',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt$(v)}</span>,
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span>,
    },
  ];

  const holdColumns = [
    { title: 'Client', dataIndex: 'clientName', key: 'clientName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'On Hold Since', dataIndex: 'onHoldDate', key: 'onHoldDate', render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span> },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
  ];

  const glColumns = [
    { title: 'Account #', dataIndex: 'accountNumber', key: 'accountNumber', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Batch Number', dataIndex: 'batchNumber', key: 'batchNumber', render: (v: string) => v || '\u2014' },
  ];

  const showFilters = activeTab === 'outstanding' || activeTab === 'drafts' || activeTab === 'payments';

  const INVOICE_EXPORT_COLS = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'clientName', label: 'Client' },
    { key: 'amount', label: 'Amount' },
    { key: 'paymentTerms', label: 'Payment Terms' },
    { key: 'issuedDate', label: 'Issued Date' },
    { key: 'dueDate', label: 'Due Date' },
  ];

  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto', background: 'var(--bg)' }}>
      {/* Subnav tabs */}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />

      <div style={{ padding: '16px 20px' }}>
        {/* Stat strip */}
        <div style={{
          display: 'flex',
          marginBottom: 20,
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
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: chip.iconBg,
                color: chip.iconColor,
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {chip.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: chip.valueColor, lineHeight: 1.2 }}>
                  {getStatValue(chip.key)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{chip.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter row */}
        {showFilters && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260, height: 32, fontSize: 12 }}
                allowClear
              />
              {activeTab === 'outstanding' && (
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
            <ExportButton
              data={invoices as unknown as Record<string, unknown>[]}
              columns={INVOICE_EXPORT_COLS}
              filename="invoices"
            />
          </div>
        )}

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
                  { title: 'Client', dataIndex: 'clientName', key: 'clientName', render: (v: string) => <span style={{ color: 'var(--muted)' }}>{v || '—'}</span> },
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
                  { label: 'Avg Margin %', value: trendingItems.length > 0 ? Math.round(trendingItems.reduce((s, t) => s + Number(t.marginPct), 0) / trendingItems.length) + '%' : '—', color: 'var(--warning)' },
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

        {/* Tables */}
        {activeTab === 'outstanding' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={invoices}
              columns={outstandingColumns}
              rowKey="invoiceKey"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: invoiceTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        {activeTab === 'drafts' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={invoices}
              columns={draftsColumns}
              rowKey="invoiceKey"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: invoiceTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={payments}
              columns={paymentsColumns}
              rowKey="paymentId"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: paymentTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        {activeTab === 'hold' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={holds}
              columns={holdColumns}
              rowKey="clientKey"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: holdTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}
      </div>

      {/* Invoice detail drawer */}
      <FinancialDetailPane
        detail={selectedInvoice}
        loading={detailLoading}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedInvoice(null); }}
      />
    </div>
  );
};
