import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Input, Select, Drawer, Button, Modal, Switch, message } from 'antd';
import {
  UserOutlined, DollarOutlined, SettingOutlined,
  AuditOutlined, CarOutlined, CreditCardOutlined, GlobalOutlined,
  ShopOutlined, BankOutlined, ToolOutlined, OrderedListOutlined,
  AppstoreOutlined, CalendarOutlined, PercentageOutlined,
  SearchOutlined, SafetyOutlined, TagsOutlined, SwapOutlined,
  ExperimentOutlined, FileTextOutlined, TeamOutlined, TrophyOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { StatStrip, TabBar, StatusBadge } from '../../components/shared';
import type { StatChipDef, TabDef as SharedTabDef } from '../../components/shared';
import {
  getAdminUsers, getSecurityGroups, getDeliveryMethods, getPaymentTerms,
  getScopeCategories, getDistributors, getCompanies, getRepairReasons,
  getRepairStatuses, getHolidays, getSalesTax, getPricingLists, getAdminStats,
  getSettings, getAuditLog, getCreditLimits, getReportingGroups,
  getStandardDepts, getCleaningSystems, getCountries, getSalesReps,
  getSalesRepAssignments, getBonusPools,
  createRepairReason, updateRepairReason, deleteRepairReason,
  createRepairStatus, updateRepairStatus, deleteRepairStatus,
  patchAdminUser,
} from '../../api/administration';
import type {
  AdminUserItem, SecurityGroupItem, DeliveryMethodItem, PaymentTermsItem,
  ScopeCategoryItem, DistributorItem, CompanyItem, RepairReasonItem,
  RepairStatusItem, HolidayItem, SalesTaxItem, PricingListItem, AdminStats,
  SystemSettingItem, AuditLogItem, CreditLimitItem, ReportingGroupItem,
  StandardDeptItem, CleaningSystemItem, CountryItem, SalesRepOption,
  SalesRepAssignment, BonusPoolItem
} from './types';

const categories = [
  { key: 'users-security', label: 'Users & Security', color: 'var(--primary)' },
  { key: 'business-config', label: 'Business Config', color: 'var(--navy)' },
  { key: 'product-repair', label: 'Product & Repair', color: 'var(--success)' },
  { key: 'hr-finance', label: 'HR & Finance', color: 'var(--warning)' },
];

interface AdminTabDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  category: string;
}

const tabs: AdminTabDef[] = [
  { key: 'users', label: 'Staff & Users', icon: <UserOutlined />, category: 'users-security' },
  { key: 'security', label: 'Security Groups', icon: <SafetyOutlined />, category: 'users-security' },
  { key: 'pricing', label: 'Pricing Lists', icon: <TagsOutlined />, category: 'users-security' },
  { key: 'settings', label: 'System Settings', icon: <SettingOutlined />, category: 'users-security' },
  { key: 'audit', label: 'Audit Log', icon: <AuditOutlined />, category: 'users-security' },
  { key: 'delivery', label: 'Delivery Methods', icon: <CarOutlined />, category: 'business-config' },
  { key: 'payterms', label: 'Payment Terms', icon: <CreditCardOutlined />, category: 'business-config' },
  { key: 'distributors', label: 'Distributors', icon: <ShopOutlined />, category: 'business-config' },
  { key: 'companies', label: 'Companies', icon: <BankOutlined />, category: 'business-config' },
  { key: 'creditlimits', label: 'Credit Limits', icon: <DollarOutlined />, category: 'business-config' },
  { key: 'countries', label: 'Countries', icon: <GlobalOutlined />, category: 'business-config' },
  { key: 'scopecat', label: 'Scope Categories', icon: <AppstoreOutlined />, category: 'product-repair' },
  { key: 'reasons', label: 'Repair Reasons', icon: <ToolOutlined />, category: 'product-repair' },
  { key: 'statuses', label: 'Repair Statuses', icon: <OrderedListOutlined />, category: 'product-repair' },
  { key: 'reportgroups', label: 'Reporting Groups', icon: <TeamOutlined />, category: 'product-repair' },
  { key: 'stddepts', label: 'Standard Depts', icon: <FileTextOutlined />, category: 'product-repair' },
  { key: 'cleaningsys', label: 'Cleaning Systems', icon: <ExperimentOutlined />, category: 'product-repair' },
  { key: 'salesreassign', label: 'Sales Rep Reassignment', icon: <SwapOutlined />, category: 'hr-finance' },
  { key: 'holidays', label: 'Holidays', icon: <CalendarOutlined />, category: 'hr-finance' },
  { key: 'bonuspools', label: 'Bonus Pools', icon: <TrophyOutlined />, category: 'hr-finance' },
  { key: 'salestax', label: 'Sales Tax Config', icon: <PercentageOutlined />, category: 'hr-finance' },
];

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const adminPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const adminCategoryPillsStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' };
const adminToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, flexWrap: 'wrap' };
const adminTableAreaStyle: React.CSSProperties = { flex: 1, overflow: 'auto', padding: '0 16px 16px' };
const adminFormLabelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 };
const adminInlineLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' };
const adminDrawerFieldLabelStyle: React.CSSProperties = { width: 160, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const adminDrawerRowStyle: React.CSSProperties = { display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)' };
const adminUserInfoRowStyle: React.CSSProperties = { display: 'flex', padding: '5px 0', borderBottom: '1px solid var(--border)' };
const adminUserInfoLabelStyle: React.CSSProperties = { width: 100, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' };
const adminModalFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
const adminModalBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' };

export function AdministrationPage() {
  const [activeCategory, setActiveCategory] = useState('users-security');
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState('');

  // Data states
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroupItem[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethodItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermsItem[]>([]);
  const [scopeCategories, setScopeCategories] = useState<ScopeCategoryItem[]>([]);
  const [scopeTypeFilter, setScopeTypeFilter] = useState('');
  const [distributors, setDistributors] = useState<DistributorItem[]>([]);
  const [distribActiveFilter, setDistribActiveFilter] = useState<string>('');
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [repairReasons, setRepairReasons] = useState<RepairReasonItem[]>([]);
  const [repairStatuses, setRepairStatuses] = useState<RepairStatusItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [salesTax, setSalesTax] = useState<SalesTaxItem[]>([]);
  const [pricingLists, setPricingLists] = useState<PricingListItem[]>([]);
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('');
  const [creditLimits, setCreditLimits] = useState<CreditLimitItem[]>([]);
  const [reportingGroups, setReportingGroups] = useState<ReportingGroupItem[]>([]);
  const [standardDepts, setStandardDepts] = useState<StandardDeptItem[]>([]);
  const [cleaningSystems, setCleaningSystems] = useState<CleaningSystemItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [selectedFromRep, setSelectedFromRep] = useState<number | undefined>();
  const [reassignments, setReassignments] = useState<SalesRepAssignment[]>([]);
  const [bonusPools, setBonusPools] = useState<BonusPoolItem[]>([]);
  const [bonusPoolType, setBonusPoolType] = useState('tech');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerRecord, setDrawerRecord] = useState<any>(null);

  // Repair Reason edit modal
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<RepairReasonItem | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonActive, setReasonActive] = useState(true);
  const [reasonSaving, setReasonSaving] = useState(false);

  // Repair Status edit modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<RepairStatusItem | null>(null);
  const [statusText, setStatusText] = useState('');
  const [statusSortOrder, setStatusSortOrder] = useState<string>('');
  const [statusSaving, setStatusSaving] = useState(false);

  // User edit drawer state
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [userEditName, setUserEditName] = useState('');
  const [userEditEmail, setUserEditEmail] = useState('');
  const [userEditActive, setUserEditActive] = useState(true);
  const [userSaving, setUserSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminStats().then(d => { if (!cancelled) setStats(d); }).catch(() => { if (!cancelled) message.error('Failed to load admin stats'); });
    return () => { cancelled = true; };
  }, []);

  const loadTabData = useCallback((tab: string) => {
    switch (tab) {
      case 'users':
        getAdminUsers({ search: search || undefined, page: userPage, pageSize: 50 })
          .then((r: any) => { setUsers(r.items); setUserTotal(r.totalCount); })
          .catch(() => { message.error('Failed to load users'); });
        break;
      case 'security':
        getSecurityGroups().then(setSecurityGroups).catch(() => { message.error('Failed to load security groups'); });
        break;
      case 'pricing':
        getPricingLists().then(setPricingLists).catch(() => { message.error('Failed to load pricing lists'); });
        break;
      case 'delivery':
        getDeliveryMethods().then(setDeliveryMethods).catch(() => { message.error('Failed to load delivery methods'); });
        break;
      case 'payterms':
        getPaymentTerms().then(setPaymentTerms).catch(() => { message.error('Failed to load payment terms'); });
        break;
      case 'distributors':
        getDistributors(distribActiveFilter === '' ? undefined : distribActiveFilter === '1')
          .then(setDistributors).catch(() => { message.error('Failed to load distributors'); });
        break;
      case 'companies':
        getCompanies().then(setCompanies).catch(() => { message.error('Failed to load companies'); });
        break;
      case 'scopecat':
        getScopeCategories(scopeTypeFilter || undefined).then(setScopeCategories).catch(() => { message.error('Failed to load scope categories'); });
        break;
      case 'reasons':
        getRepairReasons().then(setRepairReasons).catch(() => { message.error('Failed to load repair reasons'); });
        break;
      case 'statuses':
        getRepairStatuses().then(setRepairStatuses).catch(() => { message.error('Failed to load repair statuses'); });
        break;
      case 'holidays':
        getHolidays().then(setHolidays).catch(() => { message.error('Failed to load holidays'); });
        break;
      case 'salestax':
        getSalesTax().then(setSalesTax).catch(() => { message.error('Failed to load sales tax'); });
        break;
      case 'settings':
        getSettings().then(setSettings).catch(() => { message.error('Failed to load settings'); });
        break;
      case 'audit':
        getAuditLog({ search: search || undefined, action: auditAction || undefined, page: auditPage, pageSize: 50 })
          .then((r: any) => { setAuditItems(r.items); setAuditTotal(r.totalCount); })
          .catch(() => { message.error('Failed to load audit log'); });
        break;
      case 'creditlimits':
        getCreditLimits().then(setCreditLimits).catch(() => { message.error('Failed to load credit limits'); });
        break;
      case 'reportgroups':
        getReportingGroups().then(setReportingGroups).catch(() => { message.error('Failed to load reporting groups'); });
        break;
      case 'stddepts':
        getStandardDepts().then(setStandardDepts).catch(() => { message.error('Failed to load standard departments'); });
        break;
      case 'cleaningsys':
        getCleaningSystems().then(setCleaningSystems).catch(() => { message.error('Failed to load cleaning systems'); });
        break;
      case 'countries':
        getCountries().then(setCountries).catch(() => { message.error('Failed to load countries'); });
        break;
      case 'salesreassign':
        getSalesReps().then(setSalesReps).catch(() => { message.error('Failed to load sales reps'); });
        if (selectedFromRep) {
          getSalesRepAssignments(selectedFromRep).then(setReassignments).catch(() => { message.error('Failed to load reassignments'); });
        }
        break;
      case 'bonuspools':
        getBonusPools(bonusPoolType).then(setBonusPools).catch(() => { message.error('Failed to load bonus pools'); });
        break;
    }
  }, [search, userPage, scopeTypeFilter, distribActiveFilter, auditPage, auditAction, selectedFromRep, bonusPoolType]);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) loadTabData(activeTab);
    return () => { cancelled = true; };
  }, [activeTab, loadTabData]);

  const visibleTabs = useMemo(() => tabs.filter(t => t.category === activeCategory), [activeCategory]);

  useEffect(() => {
    const first = visibleTabs[0];
    if (first && !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(first.key);
    }
  }, [activeCategory, visibleTabs]);

  const openDrawer = (title: string, record: any) => {
    if (activeTab === 'users') {
      setEditingUser(record);
      setUserEditName(record.name || '');
      setUserEditEmail(record.email || '');
      setUserEditActive(record.isActive ?? true);
      setDrawerTitle(title);
      setDrawerRecord(record);
      setDrawerOpen(true);
    } else {
      setEditingUser(null);
      setDrawerTitle(title);
      setDrawerRecord(record);
      setDrawerOpen(true);
    }
  };

  const openReasonModal = (reason: RepairReasonItem | null) => {
    setEditingReason(reason);
    setReasonText(reason?.reason ?? '');
    setReasonActive(reason?.isActive ?? true);
    setReasonModalOpen(true);
  };

  const saveReason = async () => {
    if (!reasonText.trim()) { message.error('Reason text is required'); return; }
    setReasonSaving(true);
    try {
      if (editingReason) {
        await updateRepairReason(editingReason.reasonKey, reasonText.trim(), reasonActive);
        message.success('Repair reason updated');
      } else {
        await createRepairReason(reasonText.trim(), reasonActive);
        message.success('Repair reason created');
      }
      setReasonModalOpen(false);
      getRepairReasons().then(setRepairReasons).catch(() => message.error('Failed to reload reasons'));
    } catch {
      message.error('Failed to save repair reason');
    } finally {
      setReasonSaving(false);
    }
  };

  const deleteReason = async (key: number) => {
    try {
      await deleteRepairReason(key);
      message.success('Deleted');
      getRepairReasons().then(setRepairReasons).catch(() => message.error('Failed to reload reasons'));
    } catch {
      message.error('Failed to delete repair reason');
    }
  };

  const openStatusModal = (status: RepairStatusItem | null) => {
    setEditingStatus(status);
    setStatusText(status?.statusName ?? '');
    setStatusSortOrder(status?.sortOrder != null ? String(status.sortOrder) : '');
    setStatusModalOpen(true);
  };

  const saveStatus = async () => {
    if (!statusText.trim()) { message.error('Status name is required'); return; }
    setStatusSaving(true);
    try {
      const sortOrder = statusSortOrder ? parseInt(statusSortOrder) : undefined;
      if (editingStatus) {
        await updateRepairStatus(editingStatus.statusId, statusText.trim(), sortOrder);
        message.success('Repair status updated');
      } else {
        await createRepairStatus(statusText.trim(), sortOrder);
        message.success('Repair status created');
      }
      setStatusModalOpen(false);
      getRepairStatuses().then(setRepairStatuses).catch(() => message.error('Failed to reload statuses'));
    } catch {
      message.error('Failed to save repair status');
    } finally {
      setStatusSaving(false);
    }
  };

  const deleteStatus = async (id: number) => {
    try {
      await deleteRepairStatus(id);
      message.success('Deleted');
      getRepairStatuses().then(setRepairStatuses).catch(() => message.error('Failed to reload statuses'));
    } catch {
      message.error('Failed to delete (read-only statuses cannot be deleted)');
    }
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setUserSaving(true);
    try {
      await patchAdminUser(editingUser.userKey, {
        fullName: userEditName || undefined,
        emailAddress: userEditEmail || undefined,
        active: userEditActive,
      });
      message.success('User updated');
      setDrawerOpen(false);
      getAdminUsers({ search: search || undefined, page: userPage, pageSize: 50 })
        .then((r: any) => { setUsers(r.items || r); setUserTotal(r.totalCount || r.length || 0); })
        .catch(() => message.error('Failed to reload users'));
    } catch {
      message.error('Failed to save user');
    } finally {
      setUserSaving(false);
    }
  };

  const statusBadge = (active: boolean) => (
    <StatusBadge status={active ? 'Active' : 'Inactive'} />
  );

  const defaultBadge = (isDefault: boolean) =>
    isDefault ? <StatusBadge status="Default" variant="blue" /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;

  // ── Column definitions ──
  const userColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 220 },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 150, render: (v: string | null) => v || '—' },
    { title: 'Location', dataIndex: 'location', key: 'location', width: 130, render: (v: string | null) => v || '—' },
    { title: 'Last Login', dataIndex: 'lastLogin', key: 'lastLogin', width: 140, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const securityColumns = [
    { title: 'Group Name', dataIndex: 'groupName', key: 'groupName', width: 220 },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '—' },
    { title: 'Members', dataIndex: 'memberCount', key: 'memberCount', width: 90 },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const pricingColumns = [
    { title: 'List Name', dataIndex: 'listName', key: 'listName', width: 220 },
    { title: 'Clients', dataIndex: 'clientCount', key: 'clientCount', width: 90 },
    { title: 'Items', dataIndex: 'itemCount', key: 'itemCount', width: 90 },
    { title: 'Last Updated', dataIndex: 'lastUpdated', key: 'lastUpdated', width: 140, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const deliveryColumns = [
    { title: 'Method Name', dataIndex: 'methodName', key: 'methodName', width: 260 },
    { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 100, render: (v: number | null) => v != null ? `$${v.toFixed(2)}` : '—' },
    { title: 'Default', dataIndex: 'isDefault', key: 'isDefault', width: 100, render: defaultBadge },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const paytermsColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description', width: 240 },
    { title: 'Great Plains ID', dataIndex: 'greatPlainsId', key: 'greatPlainsId', width: 140, render: (v: string | null) => v || '—' },
    { title: 'Due Days', dataIndex: 'dueDays', key: 'dueDays', width: 100, render: (v: number | null) => v ?? '—' },
    { title: 'Due Date Mode', dataIndex: 'dueDateMode', key: 'dueDateMode', width: 180, render: (v: string | null) => v || '—' },
    { title: 'Default', dataIndex: 'isDefault', key: 'isDefault', width: 120, render: defaultBadge },
  ];

  const scopecatColumns = [
    { title: 'Category Name', dataIndex: 'categoryName', key: 'categoryName', width: 220 },
    { title: 'Instrument Type', dataIndex: 'instrumentType', key: 'instrumentType', width: 140,
      render: (v: string | null) => {
        const map: Record<string, string> = { F: 'Flexible', R: 'Rigid', C: 'Camera', I: 'Instrument' };
        return v ? (map[v] || v) : '—';
      }
    },
    { title: 'Size', dataIndex: 'size', key: 'size', width: 100, render: (v: string | null) => v || '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const distribColumns = [
    { title: 'Distributor Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Contact', dataIndex: 'contact', key: 'contact', width: 160, render: (v: string | null) => v || '—' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 130, render: (v: string | null) => v || '—' },
    { title: 'TSI Company', dataIndex: 'companyName', key: 'companyName', width: 140, render: (v: string | null) => v || '—' },
    { title: 'City, State', key: 'cityState', width: 160, render: (_: any, r: DistributorItem) => [r.city, r.state].filter(Boolean).join(', ') || '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 80, render: statusBadge },
  ];

  const companyColumns = [
    { title: 'Company Name', dataIndex: 'companyName', key: 'companyName', width: 220 },
    { title: 'Abbreviation', dataIndex: 'abbreviation', key: 'abbreviation', width: 100, render: (v: string | null) => v || '—' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 130, render: (v: string | null) => v || '—' },
    { title: 'City, State', key: 'cityState', width: 160, render: (_: any, r: CompanyItem) => [r.city, r.state].filter(Boolean).join(', ') || '—' },
    { title: 'PeachTree ID', dataIndex: 'peachTreeId', key: 'peachTreeId', width: 120, render: (v: string | null) => v || '—' },
    { title: 'Distributors', dataIndex: 'distributorCount', key: 'distributorCount', width: 100 },
  ];

  const reasonColumns = [
    { title: 'Repair Reason', dataIndex: 'reason', key: 'reason', width: 240 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 180, render: (v: string | null) => v || '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: RepairReasonItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" aria-label="Edit reason" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); openReasonModal(r); }} />
          <Button size="small" danger aria-label="Delete reason" icon={<DeleteOutlined />} onClick={e => { e.stopPropagation(); deleteReason(r.reasonKey); }} />
        </div>
      ),
    },
  ];

  const statusColumns = [
    { title: 'Order', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, render: (v: number | null) => v ?? '—' },
    { title: 'Status Name', dataIndex: 'statusName', key: 'statusName', width: 240 },
    {
      title: 'Read-Only', dataIndex: 'isReadOnly', key: 'isReadOnly', width: 90,
      render: (v: boolean) => v ? <StatusBadge status="Read-Only" variant="blue" /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: RepairStatusItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" aria-label="Edit status" icon={<EditOutlined />} disabled={r.isReadOnly} onClick={e => { e.stopPropagation(); openStatusModal(r); }} />
          <Button size="small" danger aria-label="Delete status" icon={<DeleteOutlined />} disabled={r.isReadOnly} onClick={e => { e.stopPropagation(); deleteStatus(r.statusId); }} />
        </div>
      ),
    },
  ];

  const holidayColumns = [
    { title: 'Holiday Name', dataIndex: 'holidayName', key: 'holidayName', width: 200 },
    { title: 'Date', dataIndex: 'holidayDate', key: 'holidayDate', width: 120, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Day', dataIndex: 'dayOfWeek', key: 'dayOfWeek', width: 80, render: (v: string | null) => v || '—' },
    { title: 'Recurring', dataIndex: 'isRecurring', key: 'isRecurring', width: 90, render: (v: boolean) => v ? <StatusBadge status="Yes" /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No</span> },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const taxColumns = [
    { title: 'Code', dataIndex: 'stateCode', key: 'stateCode', width: 60, render: (v: string | null) => v || '—' },
    { title: 'State', dataIndex: 'stateName', key: 'stateName', width: 200 },
    { title: 'Rate %', dataIndex: 'rate', key: 'rate', width: 100, render: (v: number | null) => v != null ? `${v.toFixed(3)}%` : '—' },
    { title: 'Effective Date', dataIndex: 'effectiveDate', key: 'effectiveDate', width: 140, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Taxable', dataIndex: 'isTaxable', key: 'isTaxable', width: 90, render: (v: boolean) => v ? <StatusBadge status="Yes" /> : <StatusBadge status="No" /> },
  ];

  const settingsColumns = [
    { title: 'Setting', dataIndex: 'name', key: 'name', width: 260 },
    { title: 'Value', key: 'value', render: (_: any, r: SystemSettingItem) => {
      if (r.boolValue !== null) return r.boolValue ? <StatusBadge status="Active" /> : <StatusBadge status="Inactive" />;
      if (r.stringValue) return r.stringValue;
      if (r.intValue !== null) return r.intValue;
      if (r.decimalValue !== null) return r.decimalValue;
      return '—';
    }},
  ];

  const auditColumns = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', width: 150, render: (v: string) => new Date(v).toLocaleString() },
    { title: 'User', dataIndex: 'userName', key: 'userName', width: 140 },
    { title: 'Action', dataIndex: 'action', key: 'action', width: 80, render: (v: string) => {
      const variantMap: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = { Login: 'blue', Create: 'green', Update: 'amber', Delete: 'red' };
      return <StatusBadge status={v} variant={variantMap[v] ?? 'gray'} />;
    }},
    { title: 'Module', dataIndex: 'module', key: 'module', width: 110 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 280 },
    { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', width: 120, render: (v: string | null) => v || '—' },
  ];

  const creditColumns = [
    { title: '#', key: 'idx', width: 80, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Credit Limit Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => `$${v.toLocaleString()}` },
  ];

  const reportGroupColumns = [
    { title: '#', key: 'idx', width: 80, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Group Name', dataIndex: 'groupName', key: 'groupName' },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const stdDeptColumns = [
    { title: '#', key: 'idx', width: 80, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Department Name', dataIndex: 'deptName', key: 'deptName' },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const cleanSysColumns = [
    { title: '#', key: 'idx', width: 80, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'System Name', dataIndex: 'systemName', key: 'systemName' },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const countryColumns = [
    { title: '#', dataIndex: 'countryKey', key: 'countryKey', width: 80 },
    { title: 'Country Name', dataIndex: 'countryName', key: 'countryName' },
  ];

  const reassignColumns = [
    { title: 'Client', dataIndex: 'clientName', key: 'clientName', width: 180 },
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName', width: 180 },
    { title: 'City', dataIndex: 'city', key: 'city', width: 180, render: (v: string | null) => v || '—' },
    { title: 'State', dataIndex: 'state', key: 'state', width: 60, render: (v: string | null) => v || '—' },
    { title: 'Zip', dataIndex: 'zip', key: 'zip', width: 80, render: (v: string | null) => v || '—' },
    { title: 'Current Rep', dataIndex: 'currentRep', key: 'currentRep', width: 140 },
  ];

  const bonusPoolColumns = [
    { title: '#', dataIndex: 'poolKey', key: 'poolKey', width: 80 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Period', dataIndex: 'period', key: 'period', width: 120, render: (v: string | null) => v || '—' },
    { title: 'Target', dataIndex: 'target', key: 'target', width: 120, render: (v: number | null) => v != null ? `$${v.toLocaleString()}` : '—' },
    { title: 'Actual', dataIndex: 'actual', key: 'actual', width: 120, render: (v: number | null) => v != null ? `$${v.toLocaleString()}` : '—' },
    { title: 'Payout %', dataIndex: 'payoutPct', key: 'payoutPct', width: 100, render: (v: number | null) => v != null ? `${v}%` : '—' },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <Table dataSource={users} columns={userColumns} rowKey="userKey" size="small"
            pagination={{ current: userPage, total: userTotal, pageSize: 50, onChange: setUserPage, showSizeChanger: false, size: 'small' }}
            onRow={(r) => ({ onClick: () => openDrawer(`User: ${r.name}`, r), style: { cursor: 'pointer' } })}
          />
        );
      case 'security':
        return <Table dataSource={securityGroups} columns={securityColumns} rowKey="groupKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Security Group: ${r.groupName}`, r), style: { cursor: 'pointer' } })} />;
      case 'pricing':
        return <Table dataSource={pricingLists} columns={pricingColumns} rowKey="listKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Pricing List: ${r.listName}`, r), style: { cursor: 'pointer' } })} />;
      case 'delivery':
        return <Table dataSource={deliveryMethods} columns={deliveryColumns} rowKey="methodKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Delivery: ${r.methodName}`, r), style: { cursor: 'pointer' } })} />;
      case 'payterms':
        return <Table dataSource={paymentTerms} columns={paytermsColumns} rowKey="termsKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Payment Terms: ${r.description}`, r), style: { cursor: 'pointer' } })} />;
      case 'scopecat':
        return <Table dataSource={scopeCategories} columns={scopecatColumns} rowKey="categoryKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Category: ${r.categoryName}`, r), style: { cursor: 'pointer' } })} />;
      case 'distributors':
        return <Table dataSource={distributors} columns={distribColumns} rowKey="distributorKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Distributor: ${r.name}`, r), style: { cursor: 'pointer' } })} />;
      case 'companies':
        return <Table dataSource={companies} columns={companyColumns} rowKey="companyKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Company: ${r.companyName}`, r), style: { cursor: 'pointer' } })} />;
      case 'reasons':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Button icon={<PlusOutlined />} type="primary" size="small" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => openReasonModal(null)}>
                New Reason
              </Button>
            </div>
            <Table dataSource={repairReasons} columns={reasonColumns} rowKey="reasonKey" size="small" pagination={false} />
          </div>
        );
      case 'statuses':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Button icon={<PlusOutlined />} type="primary" size="small" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => openStatusModal(null)}>
                New Status
              </Button>
            </div>
            <Table dataSource={repairStatuses} columns={statusColumns} rowKey="statusId" size="small" pagination={false} />
          </div>
        );
      case 'holidays':
        return <Table dataSource={holidays} columns={holidayColumns} rowKey="holidayKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Holiday: ${r.holidayName}`, r), style: { cursor: 'pointer' } })} />;
      case 'salestax':
        return <Table dataSource={salesTax} columns={taxColumns} rowKey="taxKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Tax: ${r.stateName || r.stateCode}`, r), style: { cursor: 'pointer' } })} />;
      case 'settings':
        return <Table dataSource={settings} columns={settingsColumns} rowKey="configKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Setting: ${r.name}`, r), style: { cursor: 'pointer' } })} />;
      case 'audit':
        return <Table dataSource={auditItems} columns={auditColumns} rowKey="auditKey" size="small"
          pagination={{ current: auditPage, total: auditTotal, pageSize: 50, onChange: setAuditPage, showSizeChanger: false, size: 'small' }}
          onRow={(r) => ({ onClick: () => openDrawer(`Audit: ${r.action} — ${r.module}`, r), style: { cursor: 'pointer' } })} />;
      case 'creditlimits':
        return <Table dataSource={creditLimits} columns={creditColumns} rowKey="limitKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Credit Limit: $${r.amount.toLocaleString()}`, r), style: { cursor: 'pointer' } })} />;
      case 'reportgroups':
        return <Table dataSource={reportingGroups} columns={reportGroupColumns} rowKey="groupKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Reporting Group: ${r.groupName}`, r), style: { cursor: 'pointer' } })} />;
      case 'stddepts':
        return <Table dataSource={standardDepts} columns={stdDeptColumns} rowKey="deptKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Standard Dept: ${r.deptName}`, r), style: { cursor: 'pointer' } })} />;
      case 'cleaningsys':
        return <Table dataSource={cleaningSystems} columns={cleanSysColumns} rowKey="systemKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Cleaning System: ${r.systemName}`, r), style: { cursor: 'pointer' } })} />;
      case 'countries':
        return <Table dataSource={countries} columns={countryColumns} rowKey="countryKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Country: ${r.countryName}`, r), style: { cursor: 'pointer' } })} />;
      case 'salesreassign':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label)' }}>Previous Rep</span>
              <Select
                value={selectedFromRep}
                onChange={(v) => { setSelectedFromRep(v); if (v) getSalesRepAssignments(v).then(setReassignments).catch(() => { message.error('Failed to load reassignments'); }); else setReassignments([]); }}
                style={{ width: 200 }}
                placeholder="Select Rep..."
                allowClear
                aria-label="Previous Sales Rep"
                options={salesReps.map(r => ({ value: r.salesRepKey, label: r.name }))}
              />
            </div>
            <Table dataSource={reassignments} columns={reassignColumns} rowKey="departmentKey" size="small" pagination={false} />
          </div>
        );
      case 'bonuspools':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ padding: '10px 0' }}>
              <Select
                value={bonusPoolType}
                onChange={(v) => { setBonusPoolType(v); }}
                style={{ width: 200 }}
                aria-label="Bonus Pool Type"
                options={[
                  { value: 'tech', label: 'Tech Bonus Pool' },
                  { value: 'ops', label: 'Ops Bonus Pool' },
                ]}
              />
            </div>
            <Table dataSource={bonusPools} columns={bonusPoolColumns} rowKey="poolKey" size="small" pagination={false}
              onRow={(r) => ({ onClick: () => openDrawer(`Bonus Pool: ${r.name}`, r), style: { cursor: 'pointer' } })} />
          </div>
        );
      default:
        return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Select a tab</div>;
    }
  };

  const statChips: StatChipDef[] = stats ? [
    { id: 'users', label: 'Active Users', value: stats.activeUsers, color: 'blue' },
    { id: 'groups', label: 'Security Groups', value: stats.securityGroups, color: 'navy' },
    { id: 'pricing', label: 'Pricing Lists', value: stats.pricingLists, color: 'green' },
    { id: 'audit', label: 'Audit 24h', value: stats.auditEntries24h, color: 'amber' },
    { id: 'locked', label: 'Locked', value: stats.lockedAccounts, color: 'red', state: stats.lockedAccounts > 0 ? 'alert' : 'normal' },
  ] : [];

  return (
    <div style={adminPageContainerStyle}>
      {/* Stat Strip */}
      <StatStrip chips={statChips} loading={!stats} />

      {/* Category Pills */}
      <div style={adminCategoryPillsStyle}>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 9999,
              border: activeCategory === c.key ? `2px solid ${c.color}` : '1px solid var(--border)',
              background: activeCategory === c.key ? `rgba(var(--primary-rgb), 0.06)` : 'var(--card)',
              color: activeCategory === c.key ? c.color : 'var(--muted)',
              fontSize: 12,
              fontWeight: activeCategory === c.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Tab Bar */}
      <TabBar
        tabs={visibleTabs.map((t): SharedTabDef => ({ key: t.key, label: t.label }))}
        activeKey={activeTab}
        onChange={(key) => { setActiveTab(key); setSearch(''); }}
      />

      {/* Toolbar */}
      <div style={adminToolbarStyle}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
          placeholder={`Search ${visibleTabs.find(t => t.key === activeTab)?.label || ''}...`}
          aria-label={`Search ${visibleTabs.find(t => t.key === activeTab)?.label ?? ''}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onPressEnter={() => loadTabData(activeTab)}
          style={{ width: 260, height: 30 }}
          allowClear
        />
        {activeTab === 'scopecat' && (
          <Select
            value={scopeTypeFilter}
            onChange={v => { setScopeTypeFilter(v); }}
            style={{ width: 140, height: 30 }}
            aria-label="Filter by type"
            options={[
              { value: '', label: 'All Types' },
              { value: 'F', label: 'Flexible' },
              { value: 'R', label: 'Rigid' },
              { value: 'C', label: 'Camera' },
              { value: 'I', label: 'Instrument' },
            ]}
          />
        )}
        {activeTab === 'distributors' && (
          <Select
            value={distribActiveFilter}
            onChange={v => { setDistribActiveFilter(v); }}
            style={{ width: 120, height: 30 }}
            aria-label="Filter by status"
            options={[
              { value: '', label: 'All' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]}
          />
        )}
        {activeTab === 'audit' && (
          <Select
            value={auditAction}
            onChange={v => { setAuditAction(v); }}
            style={{ width: 140, height: 30 }}
            aria-label="Filter by action"
            options={[
              { value: '', label: 'All Actions' },
              { value: 'Login', label: 'Login' },
              { value: 'Create', label: 'Create' },
              { value: 'Update', label: 'Update' },
              { value: 'Delete', label: 'Delete' },
            ]}
          />
        )}
      </div>

      {/* Table Area */}
      <div style={adminTableAreaStyle}>
        {renderTabContent()}
      </div>

      {/* Detail Drawer */}
      <Drawer
        title={drawerTitle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
        styles={{ header: { background: 'var(--primary-dark)', color: 'var(--card)' }, body: { padding: 0 } }}
        footer={editingUser ? (
          <div style={adminModalFooterStyle}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={userSaving} onClick={saveUser} style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>
              Save Changes
            </Button>
          </div>
        ) : undefined}
      >
        {drawerRecord && editingUser ? (
          /* User edit form */
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={adminFormLabelStyle}>Full Name</label>
              <Input aria-label="Full Name" value={userEditName} onChange={e => setUserEditName(e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div>
              <label style={adminFormLabelStyle}>Email Address</label>
              <Input aria-label="Email Address" value={userEditEmail} onChange={e => setUserEditEmail(e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={adminInlineLabelStyle}>Active</label>
              <Switch aria-label="Active" checked={userEditActive} onChange={setUserEditActive} />
            </div>
            {/* Read-only info */}
            <div style={{ marginTop: 8, padding: '12px', background: 'var(--neutral-50)', borderRadius: 6, border: '1px solid var(--border)' }}>
              {[
                { label: 'Role', value: editingUser.role },
                { label: 'Location', value: editingUser.location },
                { label: 'Last Login', value: editingUser.lastLogin ? new Date(editingUser.lastLogin).toLocaleDateString() : '—' },
              ].map(f => (
                <div key={f.label} style={adminUserInfoRowStyle}>
                  <span style={adminUserInfoLabelStyle}>{f.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--neutral-900)' }}>{f.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : drawerRecord ? (
          /* Generic JSON drawer for non-user records */
          <div style={{ padding: 20 }}>
            {Object.entries(drawerRecord).map(([k, v]) => (
              <div key={k} style={adminDrawerRowStyle}>
                <span style={adminDrawerFieldLabelStyle}>
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--neutral-900)' }}>
                  {v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </Drawer>

      {/* Repair Reason Add/Edit Modal */}
      <Modal
        title={editingReason ? 'Edit Repair Reason' : 'New Repair Reason'}
        open={reasonModalOpen}
        onCancel={() => setReasonModalOpen(false)}
        footer={
          <div style={adminModalFooterStyle}>
            <Button onClick={() => setReasonModalOpen(false)}>Cancel</Button>
            <Button type="primary" loading={reasonSaving} onClick={saveReason} style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>Save</Button>
          </div>
        }
        width={420}
      >
        <div style={adminModalBodyStyle}>
          <div>
            <label style={adminFormLabelStyle}>Reason Text</label>
            <Input aria-label="Reason Text" value={reasonText} onChange={e => setReasonText(e.target.value)} placeholder="Enter repair reason..." style={{ fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={adminInlineLabelStyle}>Active</label>
            <Switch aria-label="Active" checked={reasonActive} onChange={setReasonActive} />
          </div>
        </div>
      </Modal>

      {/* Repair Status Add/Edit Modal */}
      <Modal
        title={editingStatus ? 'Edit Repair Status' : 'New Repair Status'}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        footer={
          <div style={adminModalFooterStyle}>
            <Button onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button type="primary" loading={statusSaving} onClick={saveStatus} style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>Save</Button>
          </div>
        }
        width={420}
      >
        <div style={adminModalBodyStyle}>
          <div>
            <label style={adminFormLabelStyle}>Status Name</label>
            <Input aria-label="Status Name" value={statusText} onChange={e => setStatusText(e.target.value)} placeholder="Enter status name..." style={{ fontSize: 12 }} />
          </div>
          <div>
            <label style={adminFormLabelStyle}>Sort Order</label>
            <Input aria-label="Sort Order" type="number" value={statusSortOrder} onChange={e => setStatusSortOrder(e.target.value)} placeholder="e.g. 10" style={{ width: 120, fontSize: 12 }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
