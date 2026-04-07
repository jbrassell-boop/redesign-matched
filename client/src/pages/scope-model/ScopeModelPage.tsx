import { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Spin, Select, Table, message, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getScopeModels, getScopeModelDetail, getScopeModelStats, getManufacturers, getScopeModelInventory, getScopeModelFlags, updateScopeModel } from '../../api/scopeModels';
import type { PatchScopeModelPayload } from '../../api/scopeModels';
import { RepairItemsTab } from './tabs/RepairItemsTab';
import { MaxChargesTab } from './tabs/MaxChargesTab';
import type { ScopeModelListItem, ScopeModelDetail, ScopeModelStats, Manufacturer, ScopeTypeInventoryItem, ScopeTypeFlag } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { ContextMenu } from '../../components/common/ContextMenu';
import { useAutosave } from '../../hooks/useAutosave';
import { AutosaveIndicator } from '../../components/common/AutosaveIndicator';
import type { ContextMenuItem } from '../../components/common/ContextMenu';

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
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    aria-pressed={active}
    style={{
      flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 8, transition: 'background 0.12s, outline-color 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : '2.5px solid transparent', outlineOffset: -2,
    }}
  >
    <span style={{ ...smStatChipIconStyle, background: iconBg, color: iconColor }}>
      {icon}
    </span>
    <span style={smStatChipTextStyle}>
      <span style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</span>
      <span style={smStatChipLabelStyle}>{label}</span>
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

/* ── Detail Tabs ─────────────────────────────────────────────── */
const DETAIL_TABS: TabDef[] = [
  { key: 'specs',       label: 'Specifications' },
  { key: 'repairItems', label: 'Repair Items' },
  { key: 'maxCharges',  label: 'Max Charges' },
  { key: 'inventory',   label: 'Inventory' },
  { key: 'flags',       label: 'Flags' },
];

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const smPageContainerStyle: React.CSSProperties = { display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const smStatStripStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const smToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexWrap: 'wrap', flexShrink: 0 };
const smSeparatorStyle: React.CSSProperties = { width: 1, height: 22, background: 'var(--border-dk)' };
const smFilterLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const smThStyle: React.CSSProperties = {
  background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 700, padding: '9px 10px',
  textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--border-light-rgb), 0.3)',
  borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10,
};
const smFooterStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', flexShrink: 0, fontSize: 11, color: 'var(--muted)' };
const scopeInputStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text)', background: 'var(--card)',
  border: '1px solid var(--neutral-200)', borderRadius: 4,
  padding: '3px 6px', fontFamily: 'inherit', outline: 'none',
  width: '100%', boxSizing: 'border-box',
};
const smModalFieldLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 };
const smModalInputStyle: React.CSSProperties = { width: '100%', height: 32, border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' };
const smStatChipIconStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const smStatChipTextStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const smStatChipLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const smCenterSpinStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const smDetailFlexCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const smCloseRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const smCloseBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px' };
const smAngGridStyle: React.CSSProperties = { marginTop: 12, background: 'var(--neutral-50)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' };
const smAngHeaderStyle: React.CSSProperties = { padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' };
const smAngGrid4Col: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 };
const smAngCellStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 8px', borderRight: '1px solid var(--border)' };
const smAngLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' };
const smNotesLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 };
const smDetailPaneStyle: React.CSSProperties = { width: 560, minWidth: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)' };
const smPagBtnsStyle: React.CSSProperties = { display: 'flex', gap: 3, alignItems: 'center' };
const smModalBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 };

const SCOPE_MODEL_COLS = [
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

  // Inline detail pane (replaces Drawer)
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<ScopeModelDetail | null>(null);
  const [localDetail, setLocalDetail] = useState<ScopeModelDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');

  // Inventory + Flags tab data
  const [inventoryItems, setInventoryItems] = useState<ScopeTypeInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [flagItems, setFlagItems] = useState<ScopeTypeFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  // Context menu
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuItem, setMenuItem] = useState<ScopeModelListItem | null>(null);
  const contextMenuRef = useRef<ScopeModelListItem | null>(null);

  // New Model modal
  const [newModelOpen, setNewModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelMfg, setNewModelMfg] = useState('');
  const [newModelType, setNewModelType] = useState('F');

  const handleRowContextMenu = (e: React.MouseEvent, item: ScopeModelListItem) => {
    e.preventDefault();
    contextMenuRef.current = item;
    setMenuItem(item);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => {
    setMenuPosition(null);
    setMenuItem(null);
    contextMenuRef.current = null;
  };

  const contextMenuItems: ContextMenuItem[] = menuItem ? [
    {
      label: 'View Details',
      onClick: () => {
        if (contextMenuRef.current) handleRowClick(contextMenuRef.current);
      },
    },
    {
      label: 'Print Spec Sheet',
      onClick: () => window.print(),
    },
    {
      label: 'Deactivate',
      onClick: () => {
        const item = contextMenuRef.current;
        if (!item) return;
        Modal.confirm({
          title: 'Deactivate Model',
          content: `Deactivate "${item.description}"? It will no longer appear in active model lists.`,
          okText: 'Deactivate',
          onOk: () => message.success('Model deactivated'),
        });
      },
    },
    {
      label: 'Delete',
      danger: true,
      onClick: () => {
        const item = contextMenuRef.current;
        if (!item) return;
        Modal.confirm({
          title: 'Delete Model',
          content: `Permanently delete "${item.description}"? This cannot be undone.`,
          okText: 'Delete',
          okButtonProps: { danger: true },
          onOk: () => message.success('Model deleted'),
        });
      },
    },
  ] : [];

  // Autosave for scope model specs
  const scopeSaveFn = useCallback(
    async (data: Partial<PatchScopeModelPayload>) => {
      if (!localDetail) return;
      await updateScopeModel(localDetail.scopeTypeKey, data as PatchScopeModelPayload);
    },
    [localDetail],
  );

  const { handleChange: autosaveHandleChange, status: autosaveStatus, reset: resetAutosave } = useAutosave<PatchScopeModelPayload>(scopeSaveFn);

  // Sync localDetail when server detail changes, reset autosave
  useEffect(() => {
    if (detail) {
      setLocalDetail(detail);
      resetAutosave();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.scopeTypeKey]);

  const handleSpecFieldChange = useCallback((field: keyof PatchScopeModelPayload, value: string) => {
    setLocalDetail(prev => prev ? { ...prev, [field]: value } as ScopeModelDetail : null);
    autosaveHandleChange(field, value);
  }, [autosaveHandleChange]);

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
    let cancelled = false;
    getScopeModelStats().then(d => { if (!cancelled) setStats(d); }).catch(() => { if (!cancelled) message.error('Failed to load scope model stats'); });
    getManufacturers().then(d => { if (!cancelled) setManufacturers(d); }).catch(() => { if (!cancelled) message.error('Failed to load manufacturers'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadData(search, typeFilter, statusFilter, mfgKey, page), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, typeFilter, statusFilter, mfgKey, page, loadData]);

  const handleRowClick = async (item: ScopeModelListItem) => {
    setSelectedKey(item.scopeTypeKey);
    setDetailLoading(true);
    setActiveTab('specs');
    setInventoryItems([]);
    setFlagItems([]);
    try {
      const d = await getScopeModelDetail(item.scopeTypeKey);
      setDetail(d);
      setLocalDetail(d);
    } finally { setDetailLoading(false); }
  };

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (!detail) return;
    if (tab === 'inventory' && inventoryItems.length === 0) {
      setInventoryLoading(true);
      try {
        setInventoryItems(await getScopeModelInventory(detail.scopeTypeKey));
      } catch {
        message.error('Failed to load inventory');
      } finally {
        setInventoryLoading(false);
      }
    }
    if (tab === 'flags' && flagItems.length === 0) {
      setFlagsLoading(true);
      try {
        setFlagItems(await getScopeModelFlags(detail.scopeTypeKey));
      } catch {
        message.error('Failed to load flags');
      } finally {
        setFlagsLoading(false);
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Stat Strip ──────────────────────────────────────────── */
  const chipFilter = (tf: string, sf: string) => { setTypeFilter(tf); setStatusFilter(sf); setPage(1); };
  const isActive = (tf: string, sf: string) => typeFilter === tf && statusFilter === sf;

  const statStrip = (
    <div style={smStatStripStyle}>
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
      background: a ? 'var(--navy)' : 'var(--card)', color: a ? 'var(--card)' : 'var(--muted)',
    }}>{label}</button>
  );

  const toolbar = (
    <div style={smToolbarStyle}>
      <span style={smFilterLabelStyle}>Type</span>
      <div style={{ display: 'flex' }}>
        {[{ l: 'All', v: '' }, { l: 'Flexible', v: 'F' }, { l: 'Rigid', v: 'R' }, { l: 'Camera', v: 'C' }].map(({ l, v }) => (
          <SegBtn key={v} label={l} active={typeFilter === v} onClick={() => { setTypeFilter(v); setPage(1); }} />
        ))}
        <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
      </div>
      <div style={smSeparatorStyle} />
      <span style={smFilterLabelStyle}>Status</span>
      <div style={{ display: 'flex' }}>
        {[{ l: 'All', v: '' }, { l: 'Active', v: 'active' }, { l: 'Inactive', v: 'inactive' }].map(({ l, v }) => (
          <SegBtn key={v} label={l} active={statusFilter === v} onClick={() => { setStatusFilter(v); setPage(1); }} />
        ))}
        <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
      </div>
      <div style={smSeparatorStyle} />
      <Select
        placeholder="All Manufacturers"
        allowClear
        value={mfgKey}
        onChange={(v) => { setMfgKey(v ?? null); setPage(1); }}
        style={{ width: 180, height: 30, fontSize: 11 }}
        options={manufacturers.map(m => ({ value: m.key, label: m.name }))}
        size="small"
        aria-label="Filter by manufacturer"
      />
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search model, description, manufacturer..."
        aria-label="Search scope models"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ height: 30, width: 240, fontSize: 11, marginLeft: 'auto' }}
        allowClear
      />
      <button
        onClick={() => { setNewModelName(''); setNewModelMfg(''); setNewModelType('F'); setNewModelOpen(true); }}
        style={{
          height: 30, padding: '0 12px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
          background: 'var(--navy)', color: 'var(--card)', border: 'none', borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={11} height={11}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        New Model
      </button>
    </div>
  );

  const SEditField = ({ label, value, field }: { label: string; value: string | null | undefined; field: keyof PatchScopeModelPayload }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>{label}</span>
      <input
        value={value ?? ''}
        onChange={e => handleSpecFieldChange(field, e.target.value)}
        style={scopeInputStyle}
        onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--neutral-200)')}
      />
    </div>
  );

  /* ── Specs content (for detail pane) ─────────────────────── */
  const specsContent = localDetail ? (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
        <Field label="Manufacturer" value={localDetail.manufacturer} />
        <Field label="Category" value={localDetail.category} />
        <Field label="Type ID" value={localDetail.typeId} />
        <Field label="Item Code" value={localDetail.itemCode} />
        <SEditField label="Insert Tube Length" value={localDetail.insertTubeLength} field="insertTubeLength" />
        <SEditField label="Insert Tube Diameter" value={localDetail.insertTubeDiameter} field="insertTubeDiameter" />
        <SEditField label="Forcep Channel Size" value={localDetail.forcepChannelSize} field="forcepChannelSize" />
        <SEditField label="Length Spec" value={localDetail.lengthSpec} field="lengthSpec" />
        <SEditField label="Field of View" value={localDetail.fieldOfView} field="fieldOfView" />
        <SEditField label="Direction of View" value={localDetail.directionOfView} field="directionOfView" />
        <SEditField label="Depth of Field" value={localDetail.depthOfField} field="depthOfField" />
        <Field label="Degree" value={localDetail.degree} />
      </FormGrid>

      {/* Angulation Grid — editable */}
      <div style={smAngGridStyle}>
        <div style={smAngHeaderStyle}>Angulation</div>
        <div style={smAngGrid4Col}>
          {([
            { dir: 'Up', val: localDetail.angUp, field: 'angUp' as keyof PatchScopeModelPayload },
            { dir: 'Down', val: localDetail.angDown, field: 'angDown' as keyof PatchScopeModelPayload },
            { dir: 'Left', val: localDetail.angLeft, field: 'angLeft' as keyof PatchScopeModelPayload },
            { dir: 'Right', val: localDetail.angRight, field: 'angRight' as keyof PatchScopeModelPayload },
          ]).map(a => (
            <div key={a.dir} style={smAngCellStyle}>
              <span style={smAngLabelStyle}>{a.dir}</span>
              <input
                value={a.val ?? ''}
                onChange={e => handleSpecFieldChange(a.field, e.target.value)}
                style={{ ...scopeInputStyle, textAlign: 'center', fontWeight: 800, fontSize: 14 }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--neutral-200)')}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={{ marginTop: 12 }}>
        <FormGrid cols={2}>
          <Field label="Tube System" value={localDetail.tubeSystem} />
          <Field label="Lens System" value={localDetail.lensSystem} />
          <Field label="ID Band" value={localDetail.idBand} />
          <Field label="Eye Cup Mount" value={localDetail.eyeCupMount} />
          <Field label="Contract Cost" value={localDetail.contractCost != null ? `$${localDetail.contractCost.toFixed(2)}` : null} />
          <Field label="Max Charge" value={localDetail.maxCharge != null ? `$${localDetail.maxCharge.toFixed(2)}` : null} />
          <Field label="GL Account" value={localDetail.glAccount} />
          <Field label="Last Updated" value={localDetail.lastUpdated} />
        </FormGrid>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={smNotesLabelStyle}>Notes</div>
        <textarea
          value={localDetail.notes ?? ''}
          onChange={e => handleSpecFieldChange('notes', e.target.value)}
          rows={3}
          style={{ ...scopeInputStyle, resize: 'vertical', whiteSpace: 'pre-wrap' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--neutral-200)')}
        />
      </div>
    </div>
  ) : null;

  /* ── Detail pane body ────────────────────────────────────── */
  const detailPaneBody = detailLoading ? (
    <div style={smCenterSpinStyle}><Spin /></div>
  ) : localDetail ? (
    <div style={smDetailFlexCol}>
      {/* Close row */}
      <div style={smCloseRowStyle}>
        <button
          onClick={() => { setSelectedKey(null); setDetail(null); setLocalDetail(null); }}
          style={smCloseBtnStyle}
        >
          &times;
        </button>
      </div>
      <DetailHeader
        headingLevel="h2"
        title={localDetail.description}
        badges={
          <>
            <TypeBadge type={localDetail.type} />
            <StatusBadge status={localDetail.active ? 'Active' : 'Inactive'} />
            <AutosaveIndicator status={autosaveStatus} />
          </>
        }
      />
      <TabBar tabs={DETAIL_TABS} activeKey={activeTab} onChange={handleTabChange} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'specs'       && specsContent}
        {activeTab === 'repairItems' && <RepairItemsTab scopeTypeKey={localDetail.scopeTypeKey} />}
        {activeTab === 'maxCharges'  && <MaxChargesTab scopeTypeKey={localDetail.scopeTypeKey} />}
        {activeTab === 'inventory'   && (
          inventoryLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <Table
              dataSource={inventoryItems}
              rowKey="inventoryKey"
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
              locale={{ emptyText: 'No inventory items linked to this scope type' }}
              columns={[
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Type', dataIndex: 'flexOrRigid', key: 'flexOrRigid', width: 80 },
                { title: 'On Hand', dataIndex: 'levelCurrent', key: 'levelCurrent', width: 80, align: 'center' as const },
                { title: 'Min', dataIndex: 'levelMinimum', key: 'levelMinimum', width: 60, align: 'center' as const },
                { title: 'Max', dataIndex: 'levelMaximum', key: 'levelMaximum', width: 60, align: 'center' as const },
                {
                  title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 80,
                  render: (v: boolean) => <StatusBadge status={v ? 'Active' : 'Inactive'} />,
                },
              ]}
              style={{ padding: '0 16px' }}
            />
          )
        )}
        {activeTab === 'flags' && (
          flagsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <Table
              dataSource={flagItems}
              rowKey="flagKey"
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
              locale={{ emptyText: 'No flags linked to this scope type' }}
              columns={[
                { title: 'Flag', dataIndex: 'flag', key: 'flag' },
                { title: 'Type', dataIndex: 'flagType', key: 'flagType', width: 120 },
                {
                  title: 'On DI', dataIndex: 'visibleOnDI', key: 'visibleOnDI', width: 70, align: 'center' as const,
                  render: (v: boolean) => v ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
                },
                {
                  title: 'On Blank', dataIndex: 'visibleOnBlank', key: 'visibleOnBlank', width: 80, align: 'center' as const,
                  render: (v: boolean) => v ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
                },
              ]}
              style={{ padding: '0 16px' }}
            />
          )
        )}
      </div>
    </div>
  ) : null;

  return (
    <div style={smPageContainerStyle}>
      {/* Left panel — stat strip + toolbar + table */}
      <aside aria-label="Scope models list" style={{
        display: 'flex', flexDirection: 'column',
        width: selectedKey ? 'calc(100% - 560px)' : '100%',
        minWidth: 0,
        borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
        transition: 'width 0.2s ease',
        willChange: 'width',
        overflow: 'hidden',
        background: 'var(--card)',
      }}>
        {statStrip}
        {toolbar}

        {/* Data table */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: selectedKey ? 700 : 1040, tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                {SCOPE_MODEL_COLS.map(col => (
                  <th key={col.key} style={{ ...smThStyle, width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={SCOPE_MODEL_COLS.length} style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={SCOPE_MODEL_COLS.length} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>No scope models match your filters</td></tr>
              ) : items.map((item, idx) => {
                const isSelected = item.scopeTypeKey === selectedKey;
                return (
                  <tr
                    key={item.scopeTypeKey}
                    onClick={() => handleRowClick(item)}
                    onContextMenu={e => handleRowContextMenu(e, item)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-light)' : idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)'; }}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div style={smFooterStyle}>
          <div aria-live="polite" aria-atomic="true">
            Showing <strong style={{ color: 'var(--text)' }}>{items.length}</strong> of <strong style={{ color: 'var(--text)' }}>{totalCount}</strong> models
          </div>
          {totalPages > 1 && (
            <div style={smPagBtnsStyle}>
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
      </aside>

      {/* Right panel — detail pane */}
      {selectedKey && (
        <section aria-label="Scope model details" style={smDetailPaneStyle}>
          {detailPaneBody}
        </section>
      )}

      <ContextMenu
        items={contextMenuItems}
        position={menuPosition}
        onClose={closeMenu}
      />

      <Modal
        open={newModelOpen}
        onCancel={() => setNewModelOpen(false)}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>New Scope Model</span>}
        okText="Create Model"
        okButtonProps={{ disabled: !newModelName.trim() }}
        onOk={() => {
          message.success(`Scope model "${newModelName}" created`);
          setNewModelOpen(false);
        }}
      >
        <div style={smModalBodyStyle}>
          <div>
            <div style={smModalFieldLabelStyle}>Model Name *</div>
            <input
              value={newModelName}
              onChange={e => setNewModelName(e.target.value)}
              placeholder="e.g. GIF-H190"
              aria-label="Model name"
              style={smModalInputStyle}
            />
          </div>
          <div>
            <div style={smModalFieldLabelStyle}>Manufacturer</div>
            <input
              value={newModelMfg}
              onChange={e => setNewModelMfg(e.target.value)}
              placeholder="e.g. Olympus"
              aria-label="Manufacturer"
              style={smModalInputStyle}
            />
          </div>
          <div>
            <div style={smModalFieldLabelStyle}>Type</div>
            <select
              value={newModelType}
              onChange={e => setNewModelType(e.target.value)}
              aria-label="Scope type"
              style={smModalInputStyle}
            >
              <option value="F">Flexible</option>
              <option value="R">Rigid</option>
              <option value="C">Camera</option>
              <option value="I">Instrument</option>
            </select>
          </div>
        </div>
      </Modal>
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
      height: 36, minWidth: 36, padding: '0 6px',
      border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
      cursor: disabled ? 'default' : 'pointer',
      background: active ? 'var(--navy)' : 'var(--card)',
      color: active ? 'var(--card)' : 'var(--muted)',
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
