import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Input, Select, Drawer, Tag } from 'antd';
import {
  UserOutlined, LockOutlined, DollarOutlined, SettingOutlined,
  AuditOutlined, CarOutlined, CreditCardOutlined, GlobalOutlined,
  ShopOutlined, BankOutlined, ToolOutlined, OrderedListOutlined,
  AppstoreOutlined, CalendarOutlined, PercentageOutlined,
  SearchOutlined, SafetyOutlined, TagsOutlined
} from '@ant-design/icons';
import {
  getAdminUsers, getSecurityGroups, getDeliveryMethods, getPaymentTerms,
  getScopeCategories, getDistributors, getCompanies, getRepairReasons,
  getRepairStatuses, getHolidays, getSalesTax, getPricingLists, getAdminStats
} from '../../api/administration';
import type {
  AdminUserItem, SecurityGroupItem, DeliveryMethodItem, PaymentTermsItem,
  ScopeCategoryItem, DistributorItem, CompanyItem, RepairReasonItem,
  RepairStatusItem, HolidayItem, SalesTaxItem, PricingListItem, AdminStats
} from './types';

const categories = [
  { key: 'users-security', label: 'Users & Security', color: 'var(--primary)' },
  { key: 'business-config', label: 'Business Config', color: 'var(--navy)' },
  { key: 'product-repair', label: 'Product & Repair', color: 'var(--success)' },
  { key: 'hr-finance', label: 'HR & Finance', color: 'var(--warning)' },
];

interface TabDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  category: string;
}

const tabs: TabDef[] = [
  { key: 'users', label: 'Staff & Users', icon: <UserOutlined />, category: 'users-security' },
  { key: 'security', label: 'Security Groups', icon: <SafetyOutlined />, category: 'users-security' },
  { key: 'pricing', label: 'Pricing Lists', icon: <TagsOutlined />, category: 'users-security' },
  { key: 'delivery', label: 'Delivery Methods', icon: <CarOutlined />, category: 'business-config' },
  { key: 'payterms', label: 'Payment Terms', icon: <CreditCardOutlined />, category: 'business-config' },
  { key: 'distributors', label: 'Distributors', icon: <ShopOutlined />, category: 'business-config' },
  { key: 'companies', label: 'Companies', icon: <BankOutlined />, category: 'business-config' },
  { key: 'scopecat', label: 'Scope Categories', icon: <AppstoreOutlined />, category: 'product-repair' },
  { key: 'reasons', label: 'Repair Reasons', icon: <ToolOutlined />, category: 'product-repair' },
  { key: 'statuses', label: 'Repair Statuses', icon: <OrderedListOutlined />, category: 'product-repair' },
  { key: 'countries', label: 'Countries', icon: <GlobalOutlined />, category: 'business-config' },
  { key: 'holidays', label: 'Holidays', icon: <CalendarOutlined />, category: 'hr-finance' },
  { key: 'salestax', label: 'Sales Tax Config', icon: <PercentageOutlined />, category: 'hr-finance' },
];

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

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerRecord, setDrawerRecord] = useState<any>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
  }, []);

  const loadTabData = useCallback((tab: string) => {
    switch (tab) {
      case 'users':
        getAdminUsers({ search: search || undefined, page: userPage, pageSize: 50 })
          .then((r: any) => { setUsers(r.items); setUserTotal(r.totalCount); })
          .catch(() => {});
        break;
      case 'security':
        getSecurityGroups().then(setSecurityGroups).catch(() => {});
        break;
      case 'pricing':
        getPricingLists().then(setPricingLists).catch(() => {});
        break;
      case 'delivery':
        getDeliveryMethods().then(setDeliveryMethods).catch(() => {});
        break;
      case 'payterms':
        getPaymentTerms().then(setPaymentTerms).catch(() => {});
        break;
      case 'distributors':
        getDistributors(distribActiveFilter === '' ? undefined : distribActiveFilter === '1')
          .then(setDistributors).catch(() => {});
        break;
      case 'companies':
        getCompanies().then(setCompanies).catch(() => {});
        break;
      case 'scopecat':
        getScopeCategories(scopeTypeFilter || undefined).then(setScopeCategories).catch(() => {});
        break;
      case 'reasons':
        getRepairReasons().then(setRepairReasons).catch(() => {});
        break;
      case 'statuses':
        getRepairStatuses().then(setRepairStatuses).catch(() => {});
        break;
      case 'holidays':
        getHolidays().then(setHolidays).catch(() => {});
        break;
      case 'salestax':
        getSalesTax().then(setSalesTax).catch(() => {});
        break;
    }
  }, [search, userPage, scopeTypeFilter, distribActiveFilter]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const visibleTabs = useMemo(() => tabs.filter(t => t.category === activeCategory), [activeCategory]);

  useEffect(() => {
    const first = visibleTabs[0];
    if (first && !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(first.key);
    }
  }, [activeCategory, visibleTabs]);

  const openDrawer = (title: string, record: any) => {
    setDrawerTitle(title);
    setDrawerRecord(record);
    setDrawerOpen(true);
  };

  const statusBadge = (active: boolean) => (
    <span className={active ? 'tsi-badge tsi-badge-success' : 'tsi-badge tsi-badge-neutral'}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  const defaultBadge = (isDefault: boolean) =>
    isDefault ? <span className="tsi-badge tsi-badge-info">Default</span> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;

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
  ];

  const statusColumns = [
    { title: 'Order', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, render: (v: number | null) => v ?? '—' },
    { title: 'Status Name', dataIndex: 'statusName', key: 'statusName', width: 240 },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const holidayColumns = [
    { title: 'Holiday Name', dataIndex: 'holidayName', key: 'holidayName', width: 200 },
    { title: 'Date', dataIndex: 'holidayDate', key: 'holidayDate', width: 120, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Day', dataIndex: 'dayOfWeek', key: 'dayOfWeek', width: 80, render: (v: string | null) => v || '—' },
    { title: 'Recurring', dataIndex: 'isRecurring', key: 'isRecurring', width: 90, render: (v: boolean) => v ? <Tag color="blue">Yes</Tag> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No</span> },
    { title: 'Active', dataIndex: 'isActive', key: 'isActive', width: 90, render: statusBadge },
  ];

  const taxColumns = [
    { title: 'Code', dataIndex: 'stateCode', key: 'stateCode', width: 60, render: (v: string | null) => v || '—' },
    { title: 'State', dataIndex: 'stateName', key: 'stateName', width: 200 },
    { title: 'Rate %', dataIndex: 'rate', key: 'rate', width: 100, render: (v: number | null) => v != null ? `${v.toFixed(3)}%` : '—' },
    { title: 'Effective Date', dataIndex: 'effectiveDate', key: 'effectiveDate', width: 140, render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Taxable', dataIndex: 'isTaxable', key: 'isTaxable', width: 90, render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
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
        return <Table dataSource={repairReasons} columns={reasonColumns} rowKey="reasonKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Reason: ${r.reason}`, r), style: { cursor: 'pointer' } })} />;
      case 'statuses':
        return <Table dataSource={repairStatuses} columns={statusColumns} rowKey="statusId" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Status: ${r.statusName}`, r), style: { cursor: 'pointer' } })} />;
      case 'holidays':
        return <Table dataSource={holidays} columns={holidayColumns} rowKey="holidayKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Holiday: ${r.holidayName}`, r), style: { cursor: 'pointer' } })} />;
      case 'salestax':
        return <Table dataSource={salesTax} columns={taxColumns} rowKey="taxKey" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => openDrawer(`Tax: ${r.stateName || r.stateCode}`, r), style: { cursor: 'pointer' } })} />;
      default:
        return <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Select a tab</div>;
    }
  };

  const statChips: { label: string; value: number; color: string; icon: React.ReactNode }[] = stats ? [
    { label: 'Active Users', value: stats.activeUsers, color: 'var(--primary)', icon: <UserOutlined /> },
    { label: 'Security Groups', value: stats.securityGroups, color: 'var(--navy)', icon: <LockOutlined /> },
    { label: 'Pricing Lists', value: stats.pricingLists, color: 'var(--success)', icon: <DollarOutlined /> },
    { label: 'Audit 24h', value: stats.auditEntries24h, color: 'var(--warning)', icon: <AuditOutlined /> },
    { label: 'Locked', value: stats.lockedAccounts, color: 'var(--danger)', icon: <SettingOutlined /> },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Stat Strip */}
      <div className="tsi-stat-strip">
        {statChips.map(s => (
          <div className="tsi-stat-chip" key={s.label}>
            <div className="tsi-stat-icon" style={{ background: `rgba(var(--primary-rgb), 0.1)`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="tsi-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="tsi-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 9999,
              border: activeCategory === c.key ? `2px solid ${c.color}` : '1px solid var(--border)',
              background: activeCategory === c.key ? `rgba(var(--primary-rgb), 0.06)` : '#fff',
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
      <div style={{ display: 'flex', gap: 0, background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {visibleTabs.map(t => {
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch(''); }}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="tsi-toolbar">
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
          placeholder={`Search ${visibleTabs.find(t => t.key === activeTab)?.label || ''}...`}
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
            options={[
              { value: '', label: 'All' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]}
          />
        )}
      </div>

      {/* Table Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {renderTabContent()}
      </div>

      {/* Detail Drawer */}
      <Drawer
        title={drawerTitle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
        styles={{ header: { background: 'var(--primary-dark)', color: '#fff' }, body: { padding: 0 } }}
      >
        {drawerRecord && (
          <div style={{ padding: 20 }}>
            {Object.entries(drawerRecord).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 160, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--neutral-900)' }}>
                  {v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
