import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { StatStrip, TabBar } from '../../components/shared';
import type { StatChipDef, TabDef } from '../../components/shared';
import { RepairTable } from './RepairTable';
import { getDashboardStats, getDashboardRepairs } from '../../api/dashboard';
import type { DashboardStats, DashboardRepair, DashboardFilters } from './types';

const TasksTab = lazy(() => import('./tabs/TasksTab').then(m => ({ default: m.TasksTab })));
const EmailsTab = lazy(() => import('./tabs/EmailsTab').then(m => ({ default: m.EmailsTab })));
const ShippingTab = lazy(() => import('./tabs/ShippingTab').then(m => ({ default: m.ShippingTab })));
const InventoryTab = lazy(() => import('./tabs/InventoryTab').then(m => ({ default: m.InventoryTab })));
const PurchaseOrdersTab = lazy(() => import('./tabs/PurchaseOrdersTab').then(m => ({ default: m.PurchaseOrdersTab })));
const InvoicesTab = lazy(() => import('./tabs/InvoicesTab').then(m => ({ default: m.InvoicesTab })));
const FlagsTab = lazy(() => import('./tabs/FlagsTab').then(m => ({ default: m.FlagsTab })));
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const TechBenchTab = lazy(() => import('./tabs/TechBenchTab').then(m => ({ default: m.TechBenchTab })));
const BriefingTab = lazy(() => import('./tabs/BriefingTab').then(m => ({ default: m.BriefingTab })));

const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  page: 1,
  pageSize: 50,
  statusFilter: 'all',
};

const LazyWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>}>
    {children}
  </Suspense>
);

const TABS: TabDef[] = [
  { key: 'repairs', label: 'Repairs' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'emails', label: 'Emails' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchaseorders', label: 'Purchase Orders' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'flags', label: 'Flags' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'techbench', label: 'Tech Bench' },
  { key: 'briefing', label: 'Briefing' },
];

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [repairs, setRepairs] = useState<DashboardRepair[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState('repairs');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  const loadRepairs = useCallback(async (f: DashboardFilters) => {
    setTableLoading(true);
    try {
      const result = await getDashboardRepairs(f);
      setRepairs(result.repairs);
      setTotalCount(result.totalCount);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'repairs') return;
    const timer = setTimeout(() => loadRepairs(filters), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters, loadRepairs, activeTab]);

  const handleChipClick = (chipId: string) => {
    const statusMap: Record<string, string> = {
      urgent: 'all',
      pendingQC: 'Pending QC',
      pendingShip: 'Pending Ship',
      completedToday: 'Shipped',
    };
    setFilters(f => ({
      ...f,
      statusFilter: statusMap[chipId] ?? 'all',
      page: 1,
    }));
    setActiveTab('repairs');
  };

  const handleFiltersChange = (partial: Partial<DashboardFilters>) => {
    setFilters(f => ({ ...f, ...partial }));
  };

  const chips: StatChipDef[] = stats ? [
    { id: 'open', label: 'OPEN REPAIRS', value: stats.openRepairs, color: 'navy' },
    { id: 'urgent', label: 'URGENT', value: stats.urgentRepairs, color: 'red',
      state: (stats.urgentRepairs ?? 0) > 0 ? 'alert' : 'normal',
      tooltip: (stats.urgentRepairs ?? 0) > 0 ? `${stats.urgentRepairs} urgent repairs need attention` : undefined },
    { id: 'pendingQC', label: 'PENDING QC', value: stats.pendingQC, color: 'amber',
      state: (stats.pendingQC ?? 0) > 20 ? 'warn' : 'normal' },
    { id: 'pendingShip', label: 'PENDING SHIP', value: stats.pendingShip, color: 'navy',
      state: (stats.pendingShip ?? 0) > 20 ? 'warn' : 'normal' },
    { id: 'completedToday', label: 'SHIPPED TODAY', value: stats.completedToday, color: 'green' },
    { id: 'receivedToday', label: 'RECEIVED TODAY', value: stats.receivedToday, color: 'muted' },
  ] : [];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'repairs':
        return (
          <RepairTable
            repairs={repairs}
            totalCount={totalCount}
            loading={tableLoading}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        );
      case 'tasks': return <LazyWrap><TasksTab /></LazyWrap>;
      case 'emails': return <LazyWrap><EmailsTab /></LazyWrap>;
      case 'shipping': return <LazyWrap><ShippingTab /></LazyWrap>;
      case 'inventory': return <LazyWrap><InventoryTab /></LazyWrap>;
      case 'purchaseorders': return <LazyWrap><PurchaseOrdersTab /></LazyWrap>;
      case 'invoices': return <LazyWrap><InvoicesTab /></LazyWrap>;
      case 'flags': return <LazyWrap><FlagsTab /></LazyWrap>;
      case 'analytics': return <LazyWrap><AnalyticsTab /></LazyWrap>;
      case 'techbench': return <LazyWrap><TechBenchTab /></LazyWrap>;
      case 'briefing': return <LazyWrap><BriefingTab /></LazyWrap>;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Stat strip — always visible */}
      <StatStrip
        chips={chips}
        loading={statsLoading}
        activeChip={filters.statusFilter}
        onChipClick={handleChipClick}
      />

      {/* Sub-nav tabs */}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};
