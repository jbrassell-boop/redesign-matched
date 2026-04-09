import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { StatStrip } from '../../components/shared';
import type { StatChipDef } from '../../components/shared';
import { DashboardToolbar } from './DashboardToolbar';
import { UnifiedTable } from './UnifiedTable';
import { QuickEditModal } from './QuickEditModal';
import { ExecutiveKpi } from './ExecutiveKpi';
import { OpsBriefing } from './OpsBriefing';
import {
  getDashboardStats, getDashboardRepairs, getDashboardShipping,
  getDashboardInvoices, getDashboardFlags, getDashboardEmails,
  getDashboardTasks, getDashboardTechBench,
} from '../../api/dashboard';
import type { DashboardStats, DashboardToolbarState, DashboardRepair } from './types';

const DEFAULT_STATE: DashboardToolbarState = {
  view: 'repairs',
  type: 'all',
  location: 'all',
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

  // Quick-edit modal
  const [quickEditRecord, setQuickEditRecord] = useState<DashboardRepair | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDashboardStats()
      .then(s => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) message.error('Failed to load dashboard stats'); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const fetchData = useCallback(async (s: DashboardToolbarState, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const params = { search: s.search, page: s.page, pageSize: s.pageSize };
      switch (s.view) {
        case 'repairs': {
          const r = await getDashboardRepairs(s);
          if (!cancelled()) { setData(r.repairs); setTotalCount(r.totalCount); }
          break;
        }
        case 'shipping': {
          const r = await getDashboardShipping(params);
          if (!cancelled()) { setData(r.shipments); setTotalCount(r.totalCount); }
          break;
        }
        case 'invoices': {
          const r = await getDashboardInvoices(params);
          if (!cancelled()) { setData(r.invoices); setTotalCount(r.totalCount); }
          break;
        }
        case 'flags': {
          const r = await getDashboardFlags(params);
          if (!cancelled()) { setData(r.flags); setTotalCount(r.totalCount); }
          break;
        }
        case 'emails': {
          const r = await getDashboardEmails(params);
          if (!cancelled()) { setData(r.emails); setTotalCount(r.totalCount); }
          break;
        }
        case 'tasks': {
          const r = await getDashboardTasks(params);
          if (!cancelled()) { setData(r.tasks); setTotalCount(r.totalCount); }
          break;
        }
        case 'techbench': {
          const r = await getDashboardTechBench(params);
          if (!cancelled()) { setData(r.items); setTotalCount(r.totalCount); }
          break;
        }
      }
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => fetchData(toolbarState, () => cancelled), toolbarState.search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
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
    if (chipId === 'expiringContracts') {
      navigate('/contracts');
      return;
    }
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

  // Repairs view: row click opens quick-edit modal instead of navigate
  const handleRowClick = (repairKey: number) => {
    if (toolbarState.view === 'repairs') {
      const rec = (data as DashboardRepair[]).find(r => r.repairKey === repairKey);
      if (rec) {
        setQuickEditRecord(rec);
        setQuickEditOpen(true);
        return;
      }
    }
    navigate(`/repairs/${repairKey}`);
  };

  const handleQuickEditSaved = () => {
    setQuickEditOpen(false);
    setQuickEditRecord(null);
    // Refresh the repairs list
    fetchData(toolbarState, () => false);
    getDashboardStats().then(setStats).catch(() =>
      message.error('Failed to refresh stats')
    );
  };

  // CSV export for any view
  const handleExport = () => {
    if (data.length === 0) { message.info('No data to export'); return; }
    const VIEW_EXPORT: Record<string, { headers: string[]; row: (r: any) => string[] }> = {
      repairs: {
        headers: ['WO', 'Date In', 'Client', 'Dept', 'Scope Type', 'Serial', 'Days In', 'Status', 'Tech', 'Date Approved', 'Est Delivery', 'Amount'],
        row: (r) => [r.wo, r.dateIn, r.client, r.dept, r.scopeType, r.serial, r.daysIn, r.status, r.tech ?? '', r.dateApproved ?? '', r.estDelivery ?? '', r.amountApproved?.toFixed(2) ?? ''],
      },
      shipping: {
        headers: ['WO', 'Client', 'Status', 'Ship Date', 'Tracking #', 'Charge'],
        row: (r) => [r.wo, r.client, r.status, r.shipDate ?? '', r.trackingNumber ?? '', r.shipCharge?.toFixed(2) ?? ''],
      },
      invoices: {
        headers: ['Invoice #', 'WO', 'Client', 'Status', 'Amount', 'Date'],
        row: (r) => [r.invoiceNumber, r.wo, r.client, r.status, r.amount?.toFixed(2) ?? '', r.date],
      },
      tasks: {
        headers: ['Title', 'Client', 'Dept', 'Type', 'Priority', 'Status', 'Date'],
        row: (r) => [r.title, r.client, r.dept, r.taskType, r.priority, r.status, r.date],
      },
      emails: {
        headers: ['Date', 'Type', 'From', 'To', 'Subject', 'Status'],
        row: (r) => [r.date, r.emailType, r.from, r.to, r.subject, r.status],
      },
      flags: {
        headers: ['Flag', 'Type', 'Owner'],
        row: (r) => [r.flagText, r.flagType, r.ownerName],
      },
      techbench: {
        headers: ['WO', 'Serial', 'Scope Type', 'Client', 'Days In', 'Status', 'Tech'],
        row: (r) => [r.wo, r.serial, r.scopeType, r.client, r.daysIn, r.status, r.tech ?? ''],
      },
    };
    const def = VIEW_EXPORT[toolbarState.view];
    if (!def) { message.info('Export not available for this view'); return; }
    const rows = data.map(def.row);
    const csv = [def.headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolbarState.view}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    ...((stats as any).expiringContracts > 0 ? [{
      id: 'expiringContracts', label: 'CONTRACTS EXPIRING', value: (stats as any).expiringContracts as number, color: 'amber' as const,
      state: 'warn' as const, tooltip: `${(stats as any).expiringContracts} contracts expiring within 90 days`,
    }] : []),
  ] : [];

  return (
    <section aria-label="Dashboard" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <ExecutiveKpi />
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
        onExport={handleExport}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: toolbarState.view === 'briefing' ? 'auto' : 'hidden' }}>
        {toolbarState.view === 'briefing' ? (
          <OpsBriefing stats={stats} />
        ) : (
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
        )}
      </div>

      <QuickEditModal
        open={quickEditOpen}
        record={quickEditRecord}
        onClose={() => { setQuickEditOpen(false); setQuickEditRecord(null); }}
        onSaved={handleQuickEditSaved}
      />
    </section>
  );
};
