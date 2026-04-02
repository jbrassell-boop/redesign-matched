import { useState, useEffect, useCallback } from 'react';
import { Typography } from 'antd';
import { StatStrip } from './StatStrip';
import { RepairTable } from './RepairTable';
import { getDashboardStats, getDashboardRepairs } from '../../api/dashboard';
import type { DashboardStats, DashboardRepair, DashboardFilters } from './types';

const { Title } = Typography;

const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  page: 1,
  pageSize: 50,
  statusFilter: 'all',
};

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [repairs, setRepairs] = useState<DashboardRepair[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

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
    const timer = setTimeout(() => loadRepairs(filters), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters, loadRepairs]);

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
  };

  const handleFiltersChange = (partial: Partial<DashboardFilters>) => {
    setFilters(f => ({ ...f, ...partial }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Page header */}
      <div style={{ padding: '12px 16px 8px', background: '#fff', borderBottom: '1px solid var(--neutral-200)' }}>
        <Title level={5} style={{ margin: 0, color: 'var(--primary-dark)' }}>Dashboard</Title>
      </div>

      {/* Stat strip */}
      <StatStrip
        stats={stats}
        loading={statsLoading}
        activeChip={filters.statusFilter}
        onChipClick={handleChipClick}
      />

      {/* Repair table */}
      <RepairTable
        repairs={repairs}
        totalCount={totalCount}
        loading={tableLoading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
};
