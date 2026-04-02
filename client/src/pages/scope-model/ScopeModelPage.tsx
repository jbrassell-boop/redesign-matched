import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, Select, Drawer } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getScopeModels, getScopeModelDetail, getScopeModelStats, getManufacturers } from '../../api/scopeModels';
import { RepairItemsTab } from './tabs/RepairItemsTab';
import { MaxChargesTab } from './tabs/MaxChargesTab';
import type { ScopeModelListItem, ScopeModelDetail, ScopeModelStats, Manufacturer } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';

/* ── Type label map ──────────────────────────────────────────── */
const TYPE_LABEL: Record<string, string> = {
  F: 'Flexible',
  R: 'Rigid',
  C: 'Camera',
};

const TYPE_VARIANT: Record<string, 'blue' | 'green' | 'purple'> = {
  F: 'blue',
  R: 'green',
  C: 'purple',
};

const TypeBadge = ({ type }: { type: string }) => {
  const label = TYPE_LABEL[type] ?? (type || 'Unknown');
  const variant = TYPE_VARIANT[type];
  return <StatusBadge status={label} variant={variant} />;
};

/* ── Stat Chip ───────────────────────────────────────────────── */
interface StatChipProps {
  label: string; value: number; iconBg: string; iconColor: string; valueColor: string;
  active: boolean; onClick: () => void; icon: React.ReactNode;
}
const StatChip = ({ label, value, iconBg, iconColor, valueColor, active, onClick, icon }: StatChipProps) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 8, transition: 'background 0.12s, outline-color 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : '2.5px solid transparent', outlineOffset: -2,
    }}
  >
    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor }}>
      {icon}
    </span>
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconTotal = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>;
const IconActive = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><circle cx="8" cy="8" r="5.5" /><polyline points="5.5 8 7 10 10.5 6" /></svg>;
const IconInactive = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><circle cx="8" cy="8" r="5.5" /><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" /><line x1="10.5" y1="5.5" x2="5.5" y2="10.5" /></svg>;
const IconFlex = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><path d="M4 12c0-4 2-6 4-8s4-1 4 1-2 4-4 6-4 3-4 5" /></svg>;
const IconRigid = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><line x1="8" y1="2" x2="8" y2="14" /><line x1="5" y1="4" x2="11" y2="4" /><line x1="5" y1="12" x2="11" y2="12" /></svg>;
const IconCamera = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><rect x="2" y="4" width="12" height="9" rx="1.5" /><circle cx="8" cy="8.5" r="2.5" /><path d="M5.5 4L6.5 2h3l1 2" /></svg>;

/* ── Drawer Tabs ─────────────────────────────────────────────── */
const DRAWER_TABS: TabDef[] = [
  { key: 'specs',       label: 'Specifications' },
  { key: 'repairItems', label: 'Repair Items' },
  { key: 'maxCharges',  label: 'Max Charges' },
  { key: 'inventory',   label: 'Inventory' },
  { key: 'flags',       label: 'Flags' },
];

/* ═════════════════════════════════════════════════════════════ */
/*  SCOPE MODEL PAGE                                            */
/* ═════════════════════════════════════════════════════════════ */
export const ScopeModelPage = () => {
  const [items, setItems] = useState<ScopeModelListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ScopeModelStats | null>(null);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mfgKey, setMfgKey] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<ScopeModelDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');

  const loadData = useCallback(async (s: string, tf: string, sf: string, mk: number | null, p: number) => {
    setLoading(true);
    try {
      const result = await getScopeModels({ search: s, page: p, pageSize, typeFilter: tf, statusFilter: sf, manufacturerKey: mk });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getScopeModelStats().then(setStats).catch(() => {});
    getManufacturers().then(setManufacturers).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadData(search, typeFilter, statusFilter, mfgKey, page), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, typeFilter, statusFilter, mfgKey, page, loadData]);

  const handleRowClick = async (item: ScopeModelListItem) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setActiveTab('specs');
    try { setDetail(await getScopeModelDetail(item.scopeTypeKey)); } finally { setDetailLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Stat Strip ──────────────────────────────────────────── */
  const chipFilter = (tf: string, sf: string) => { setTypeFilter(tf); setStatusFilter(sf); setPage(1); };
  const isActive = (tf: string, sf: string) => typeFilter === tf && statusFilter === sf;

  const statStrip = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <StatChip label="Total Models" value={stats?.total ?? 0} iconBg="rgba(var(--navy-rgb), 0.10)" iconColor="var(--navy)" valueColor="var(--navy)" active={isActive('', '')} onClick={() => chipFilter('', '')} icon={<IconTotal />} />
      <StatChip label="Active" value={stats?.activeCount ?? 0} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={isActive('', 'active')} onClick={() => chipFilter('', 'active')} icon={<IconActive />} />
      <StatChip label="Inactive" value={stats?.inactiveCount ?? 0} iconBg="rgba(var(--danger-rgb), 0.10)" iconColor="var(--danger)" valueColor="var(--danger)" active={isActive('', 'inactive')} onClick={() => chipFilter('', 'inactive')} icon={<IconInactive />} />
      <StatChip label="Flexible" value={stats?.flexible ?? 0} iconBg="rgba(var(--primary-rgb), 0.10)" iconColor="var(--primary)" valueColor="var(--primary)" active={isActive('F', '')} onClick={() => chipFilter('F', '')} icon={<IconFlex />} />
      <StatChip label="Rigid" value={stats?.rigid ?? 0} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={isActive('R', '')} onClick={() => chipFilter('R', '')} icon={<IconRigid />} />
      <StatChip label="Camera" value={stats?.camera ?? 0} iconBg="var(--purple-light)" iconColor="var(--purple)" valueColor="var(--purple)" active={isActive('C', '')} onClick={() => chipFilter('C', '')} icon={<IconCamera />} />
    </div>
  );

  /* ── Toolbar ─────────────────────────────────────────────── */
  const SegBtn = ({ label, active: a, onClick: oc }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={oc} style={{
      height: 28, padding: '0 10px', fontSize: 11, fontWeight: a ? 700 : 500, fontFamily: 'inherit',
      border: '1px solid var(--border-dk)', borderRight: 'none', cursor: 'pointer',
      background: a ? 'var(--navy)' : 'var(--card)', color: a ? '#fff' : 'var(--muted)',
    }}>{label}</button>
  );

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</span>
      <div style={{ display: 'flex' }}>
        {[{ l: 'All', v: '' }, { l: 'Flexible', v: 'F' }, { l: 'Rigid', v: 'R' }, { l: 'Camera', v: 'C' }].map(({ l, v }) => (
          <SegBtn key={v} label={l} active={typeFilter === v} onClick={() => { setTypeFilter(v); setPage(1); }} />
        ))}
        <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--border-dk)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
      <div style={{ display: 'flex' }}>
        {[{ l: 'All', v: '' }, { l: 'Active', v: 'active' }, { l: 'Inactive', v: 'inactive' }].map(({ l, v }) => (
          <SegBtn key={v} label={l} active={statusFilter === v} onClick={() => { setStatusFilter(v); setPage(1); }} />
        ))}
        <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--border-dk)' }} />
      <Select
        placeholder="All Manufacturers"
        allowClear
        value={mfgKey}
        onChange={(v) => { setMfgKey(v ?? null); setPage(1); }}
        style={{ width: 180, height: 30, fontSize: 11 }}
        options={manufacturers.map(m => ({ value: m.key, label: m.name }))}
        size="small"
      />
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search model, description, manufacturer..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ height: 30, width: 240, fontSize: 11, marginLeft: 'auto' }}
        allowClear
      />
    </div>
  );

  /* ── Table ───────────────────────────────────────────────── */
  const columns = [
    { key: 'description', label: 'Model Name', width: '20%' },
    { key: 'type', label: 'Type', width: 78 },
    { key: 'manufacturer', label: 'Manufacturer', width: 160 },
    { key: 'category', label: 'Category', width: 150 },
    { key: 'active', label: 'Status', width: 74 },
    { key: 'insertTubeLength', label: 'Length', width: 70 },
    { key: 'insertTubeDiameter', label: 'Diameter', width: 70 },
    { key: 'fieldOfView', label: 'FOV', width: 60 },
    { key: 'directionOfView', label: 'DOV', width: 60 },
  ];

  const dataTable = (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040, tableLayout: 'fixed' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 700, padding: '9px 10px',
                textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(180,200,220,0.3)',
                borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase',
                fontSize: 10, width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>No scope models match your filters</td></tr>
          ) : items.map((item, idx) => (
            <tr
              key={item.scopeTypeKey}
              onClick={() => handleRowClick(item)}
              style={{ cursor: 'pointer', background: idx % 2 === 0 ? '#fff' : 'var(--neutral-50)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? '#fff' : 'var(--neutral-50)'; }}
            >
              <td style={tdStyle}><span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>{item.description || '\u2014'}</span></td>
              <td style={tdStyle}><TypeBadge type={item.type} /></td>
              <td style={tdStyle}>{item.manufacturer || '\u2014'}</td>
              <td style={tdStyle}>{item.category || '\u2014'}</td>
              <td style={tdStyle}><StatusBadge status={item.active ? 'Active' : 'Inactive'} /></td>
              <td style={tdStyle}>{item.insertTubeLength || '\u2014'}</td>
              <td style={tdStyle}>{item.insertTubeDiameter || '\u2014'}</td>
              <td style={tdStyle}>{item.fieldOfView || '\u2014'}</td>
              <td style={tdStyle}>{item.directionOfView || '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ── Pagination Footer ───────────────────────────────────── */
  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>
      <div>
        Showing <strong style={{ color: 'var(--text)' }}>{items.length}</strong> of <strong style={{ color: 'var(--text)' }}>{totalCount}</strong> models
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
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
  );

  /* ── Drawer Content ──────────────────────────────────────── */
  const specsContent = detail ? (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
        <Field label="Manufacturer" value={detail.manufacturer} />
        <Field label="Category" value={detail.category} />
        <Field label="Type ID" value={detail.typeId} />
        <Field label="Item Code" value={detail.itemCode} />
        <Field label="Insert Tube Length" value={detail.insertTubeLength} />
        <Field label="Insert Tube Diameter" value={detail.insertTubeDiameter} />
        <Field label="Forcep Channel Size" value={detail.forcepChannelSize} />
        <Field label="Length Spec" value={detail.lengthSpec} />
        <Field label="Field of View" value={detail.fieldOfView} />
        <Field label="Direction of View" value={detail.directionOfView} />
        <Field label="Depth of Field" value={detail.depthOfField} />
        <Field label="Degree" value={detail.degree} />
      </FormGrid>

      {/* Angulation Grid */}
      <div style={{ marginTop: 12, background: 'var(--neutral-50)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Angulation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
          {[{ dir: 'Up', val: detail.angUp }, { dir: 'Down', val: detail.angDown }, { dir: 'Left', val: detail.angLeft }, { dir: 'Right', val: detail.angRight }].map(a => (
            <div key={a.dir} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px', borderRight: '1px solid var(--border)' }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>{a.dir}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{a.val || '\u2014'}</span>
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>{a.val ? '\u00B0' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={{ marginTop: 12 }}>
        <FormGrid cols={2}>
          <Field label="Tube System" value={detail.tubeSystem} />
          <Field label="Lens System" value={detail.lensSystem} />
          <Field label="ID Band" value={detail.idBand} />
          <Field label="Eye Cup Mount" value={detail.eyeCupMount} />
          <Field label="Contract Cost" value={detail.contractCost != null ? `$${detail.contractCost.toFixed(2)}` : null} />
          <Field label="Max Charge" value={detail.maxCharge != null ? `$${detail.maxCharge.toFixed(2)}` : null} />
          <Field label="GL Account" value={detail.glAccount} />
          <Field label="Last Updated" value={detail.lastUpdated} />
        </FormGrid>
      </div>

      {detail.notes && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 10px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{detail.notes}</div>
        </div>
      )}
    </div>
  ) : null;

  const drawerBody = detailLoading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
  ) : detail ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.description}
        badges={
          <>
            <TypeBadge type={detail.type} />
            <StatusBadge status={detail.active ? 'Active' : 'Inactive'} />
          </>
        }
      />
      <TabBar tabs={DRAWER_TABS} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'specs'       && specsContent}
      {activeTab === 'repairItems' && <RepairItemsTab scopeTypeKey={detail.scopeTypeKey} />}
      {activeTab === 'maxCharges'  && <MaxChargesTab scopeTypeKey={detail.scopeTypeKey} />}
      {activeTab === 'inventory'   && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Inventory coming soon</div>}
      {activeTab === 'flags'       && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Flags coming soon</div>}
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {statStrip}
      {toolbar}
      {dataTable}
      {footer}
      <Drawer
        title={<span style={{ color: '#fff', fontWeight: 700 }}>{detail?.description || 'Scope Model'}</span>}
        placement="right"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          header: { background: 'var(--primary-dark)', borderBottom: '1px solid var(--border)' },
          body: { padding: 0 },
        }}
        closeIcon={<span style={{ color: '#fff' }}>&times;</span>}
      >
        {drawerBody}
      </Drawer>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle', color: 'var(--text)',
};

const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      height: 26, minWidth: 26, padding: '0 6px',
      border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
      cursor: disabled ? 'default' : 'pointer',
      background: active ? 'var(--navy)' : 'var(--card)',
      color: active ? '#fff' : 'var(--muted)',
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
