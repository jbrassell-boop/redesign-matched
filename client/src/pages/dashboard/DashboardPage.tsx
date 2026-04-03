import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatStrip } from '../../components/shared';
import type { StatChipDef } from '../../components/shared';
import { DashboardToolbar } from './DashboardToolbar';
import { UnifiedTable } from './UnifiedTable';
import {
  getDashboardStats, getDashboardRepairs, getDashboardShipping,
  getDashboardInvoices, getDashboardFlags, getDashboardEmails,
  getDashboardTasks, getDashboardTechBench,
} from '../../api/dashboard';
import type { DashboardStats, DashboardToolbarState } from './types';

const DEFAULT_STATE: DashboardToolbarState = {
  view: 'repairs',
  type: 'all',
  groupBy: 'none',
  search: '',
  page: 1,
  pageSize: 50,
  statusFilter: 'all',
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [toolbarState, setToolbarState] = useState<DashboardToolbarState>(DEFAULT_STATE);
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchData = useCallback(async (s: DashboardToolbarState) => {
    setLoading(true);
    try {
      const params = { search: s.search, page: s.page, pageSize: s.pageSize };
      switch (s.view) {
        case 'repairs': {
          const r = await getDashboardRepairs(s);
          setData(r.repairs);
          setTotalCount(r.totalCount);
          break;
        }
        case 'shipping': {
          const r = await getDashboardShipping(params);
          setData(r.shipments);
          setTotalCount(r.totalCount);
          break;
        }
        case 'invoices': {
          const r = await getDashboardInvoices(params);
          setData(r.invoices);
          setTotalCount(r.totalCount);
          break;
        }
        case 'flags': {
          const r = await getDashboardFlags(params);
          setData(r.flags);
          setTotalCount(r.totalCount);
          break;
        }
        case 'emails': {
          const r = await getDashboardEmails(params);
          setData(r.emails);
          setTotalCount(r.totalCount);
          break;
        }
        case 'tasks': {
          const r = await getDashboardTasks(params);
          setData(r.tasks);
          setTotalCount(r.totalCount);
          break;
        }
        case 'techbench': {
          const r = await getDashboardTechBench(params);
          setData(r.items);
          setTotalCount(r.totalCount);
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(toolbarState), toolbarState.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [toolbarState, fetchData]);

  const handleToolbarChange = (partial: Partial<DashboardToolbarState>) => {
    setToolbarState(prev => {
      const next = { ...prev, ...partial };
      if (partial.view && partial.view !== prev.view) {
        setSelectedKeys([]);
      }
      return next;
    });
  };

  const handleChipClick = (chipId: string) => {
    const statusMap: Record<string, string> = {
      urgent: 'all',
      pendingQC: 'Pending QC',
      pendingShip: 'Pending Ship',
      completedToday: 'Shipped',
    };
    setToolbarState(prev => ({
      ...prev,
      view: 'repairs',
      statusFilter: statusMap[chipId] ?? 'all',
      page: 1,
    }));
  };

  const handleRowClick = (repairKey: number) => {
    navigate(`/repairs/${repairKey}`);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <StatStrip
        chips={chips}
        loading={statsLoading}
        activeChip={toolbarState.statusFilter}
        onChipClick={handleChipClick}
      />
      <DashboardToolbar
        state={toolbarState}
        onChange={handleToolbarChange}
        selectedCount={selectedKeys.length}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <UnifiedTable
          view={toolbarState.view}
          data={data}
          loading={loading}
          totalCount={totalCount}
          page={toolbarState.page}
          pageSize={toolbarState.pageSize}
          onPageChange={(page, pageSize) => handleToolbarChange({ page, pageSize })}
          onRowClick={handleRowClick}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
        />
      </div>
    </div>
  );
};
