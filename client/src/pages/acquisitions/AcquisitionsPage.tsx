import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, Drawer, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAcquisitions, getAcquisitionsSold, getAcquisitionStats, getAcquisitionDetail } from '../../api/acquisitions';
import { DetailHeader, TabBar, Field, FormGrid, StatusBadge } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type { AcquisitionListItem, AcquisitionSoldItem, AcquisitionStats, AcquisitionDetail } from './types';

/* ── Stat Chip ───────────────────────────────────────────────── */
interface StatChipProps {
  label: string; value: string | number; iconBg: string; iconColor: string; valueColor: string;
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
const IconInHouse = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
const IconConsigned = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="1 3 1 7 5 7" /><path d="M2.5 10A5.5 5.5 0 1 0 4 4.5L1 7" /></svg>;
const IconSold = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="12 5 7 11 4 8" /></svg>;
const IconDollar = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><line x1="8" y1="1.5" x2="8" y2="14.5" /><path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" /></svg>;

const fmtCurrency = (n: number) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0';

const TABS: TabDef[] = [
  { key: 'inhouse', label: 'In-House' },
  { key: 'consigned', label: 'Consigned' },
  { key: 'sold', label: 'Sold' },
];

/* ═════════════════════════════════════════════════════════════ */
/*  ACQUISITIONS PAGE                                           */
/* ═════════════════════════════════════════════════════════════ */
export const AcquisitionsPage = () => {
  const [activeTab, setActiveTab] = useState('inhouse');
  const [stats, setStats] = useState<AcquisitionStats | null>(null);

  // In-House state
  const [inHouseItems, setInHouseItems] = useState<AcquisitionListItem[]>([]);
  const [inHouseTotal, setInHouseTotal] = useState(0);
  const [inHouseSearch, setInHouseSearch] = useState('');
  const [inHousePage, setInHousePage] = useState(1);
  const [inHouseLoading, setInHouseLoading] = useState(true);

  // Consigned state
  const [consignedItems, setConsignedItems] = useState<AcquisitionListItem[]>([]);
  const [consignedTotal, setConsignedTotal] = useState(0);
  const [consignedSearch, setConsignedSearch] = useState('');
  const [consignedPage, setConsignedPage] = useState(1);
  const [consignedLoading, setConsignedLoading] = useState(true);

  // Sold state
  const [soldItems, setSoldItems] = useState<AcquisitionSoldItem[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [soldSearch, setSoldSearch] = useState('');
  const [soldPage, setSoldPage] = useState(1);
  const [soldLoading, setSoldLoading] = useState(true);

  const pageSize = 50;

  // Detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AcquisitionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRowClick = async (scopeKey: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await getAcquisitionDetail(scopeKey);
      setDetail(d);
    } catch {
      message.error('Failed to load acquisition detail');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { getAcquisitionStats().then(setStats).catch(() => {}); }, []);

  const loadInHouse = useCallback(async (s: string, p: number) => {
    setInHouseLoading(true);
    try {
      const r = await getAcquisitions({ search: s, page: p, pageSize, tab: 'inhouse' });
      setInHouseItems(r.items); setInHouseTotal(r.totalCount);
    } finally { setInHouseLoading(false); }
  }, []);

  const loadConsigned = useCallback(async (s: string, p: number) => {
    setConsignedLoading(true);
    try {
      const r = await getAcquisitions({ search: s, page: p, pageSize, tab: 'consigned' });
      setConsignedItems(r.items); setConsignedTotal(r.totalCount);
    } finally { setConsignedLoading(false); }
  }, []);

  const loadSold = useCallback(async (s: string, p: number) => {
    setSoldLoading(true);
    try {
      const r = await getAcquisitionsSold({ search: s, page: p, pageSize, tab: 'sold' });
      setSoldItems(r.items); setSoldTotal(r.totalCount);
    } finally { setSoldLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => loadInHouse(inHouseSearch, inHousePage), inHouseSearch ? 300 : 0); return () => clearTimeout(t); }, [inHouseSearch, inHousePage, loadInHouse]);
  useEffect(() => { const t = setTimeout(() => loadConsigned(consignedSearch, consignedPage), consignedSearch ? 300 : 0); return () => clearTimeout(t); }, [consignedSearch, consignedPage, loadConsigned]);
  useEffect(() => { const t = setTimeout(() => loadSold(soldSearch, soldPage), soldSearch ? 300 : 0); return () => clearTimeout(t); }, [soldSearch, soldPage, loadSold]);

  /* ── Stat Strip ──────────────────────────────────────────── */
  const statStrip = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <StatChip label="In-House" value={stats?.inHouse ?? 0} iconBg="rgba(var(--primary-rgb), 0.10)" iconColor="var(--primary)" valueColor="var(--navy)" active={activeTab === 'inhouse'} onClick={() => setActiveTab('inhouse')} icon={<IconInHouse />} />
      <StatChip label="Consigned" value={stats?.consigned ?? 0} iconBg="rgba(var(--amber-rgb), 0.10)" iconColor="var(--amber)" valueColor="var(--amber)" active={activeTab === 'consigned'} onClick={() => setActiveTab('consigned')} icon={<IconConsigned />} />
      <StatChip label="Sold" value={stats?.sold ?? 0} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={activeTab === 'sold'} onClick={() => setActiveTab('sold')} icon={<IconSold />} />
      <StatChip label="In-House Value" value={fmtCurrency(stats?.inHouseValue ?? 0)} iconBg="rgba(var(--navy-rgb), 0.10)" iconColor="var(--navy)" valueColor="var(--navy)" active={false} onClick={() => setActiveTab('inhouse')} icon={<IconDollar />} />
      <StatChip label="Sold Revenue" value={fmtCurrency(stats?.soldRevenue ?? 0)} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={false} onClick={() => setActiveTab('sold')} icon={<IconDollar />} />
    </div>
  );

  /* ── In-House / Consigned Table ──────────────────────────── */
  const renderAcqTable = (items: AcquisitionListItem[], loading: boolean, total: number, searchVal: string, onSearch: (s: string) => void, currentPage: number, onPage: (p: number) => void, tabLabel: string) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const cols = [
      { key: 'serial', label: 'Serial #', width: 130 },
      { key: 'scopeType', label: 'Model / Type', width: 200 },
      { key: 'poNumber', label: 'PO #', width: 110 },
      { key: 'dept', label: 'Department', width: 140 },
      { key: 'client', label: 'Client', width: 160 },
      { key: 'dateAcquired', label: 'Date Acquired', width: 110 },
      { key: 'poDate', label: 'PO Date', width: 100 },
      { key: 'cost', label: 'Cost', width: 100 },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DetailHeader
          title={`${tabLabel} Acquisitions`}
          badges={<span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>{total} records</span>}
          actions={<Input prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />} placeholder="Search serial, model, client..." value={searchVal} onChange={e => { onSearch(e.target.value); onPage(1); }} style={{ height: 30, width: 240, fontSize: 11 }} allowClear />}
        />
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                {cols.map(col => (
                  <th key={col.key} style={{ background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 700, padding: '9px 10px', textAlign: col.key === 'cost' ? 'right' : 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--primary-rgb), 0.15)', borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10, width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>No acquisition records found</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.scopeKey} style={{ cursor: 'pointer', background: idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)' }} onClick={() => handleRowClick(item.scopeKey)} onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }} onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)'; }}>
                  <td style={tdStyle}><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.serial || '\u2014'}</span></td>
                  <td style={tdStyle}>{item.scopeType || '\u2014'}</td>
                  <td style={tdStyle}>{item.poNumber || '\u2014'}</td>
                  <td style={tdStyle}>{item.dept || '\u2014'}</td>
                  <td style={tdStyle}>{item.client || '\u2014'}</td>
                  <td style={tdStyle}>{item.dateAcquired || '\u2014'}</td>
                  <td style={tdStyle}>{item.poDate || '\u2014'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{item.cost > 0 ? `$${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Showing <strong style={{ color: 'var(--text)' }}>{items.length}</strong> of <strong style={{ color: 'var(--text)' }}>{total}</strong></span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <PgBtn disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}>{'\u2039'}</PgBtn>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const p = start + i;
                return p <= totalPages ? <PgBtn key={p} active={p === currentPage} onClick={() => onPage(p)}>{p}</PgBtn> : null;
              })}
              <PgBtn disabled={currentPage >= totalPages} onClick={() => onPage(currentPage + 1)}>{'\u203A'}</PgBtn>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Sold Table ──────────────────────────────────────────── */
  const soldTotalPages = Math.max(1, Math.ceil(soldTotal / pageSize));
  const soldTable = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title="Sold Acquisitions"
        badges={<span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>{soldTotal} records</span>}
        actions={<Input prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />} placeholder="Search serial, model, buyer..." value={soldSearch} onChange={e => { setSoldSearch(e.target.value); setSoldPage(1); }} style={{ height: 30, width: 240, fontSize: 11 }} allowClear />}
      />
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              {[{ l: 'Serial #', w: 130 }, { l: 'Model', w: 200 }, { l: 'Client', w: 180 }, { l: 'Sale Date', w: 110 }, { l: 'Sale Price', w: 110 }, { l: 'Buyer', w: 160 }].map(col => (
                <th key={col.l} style={{ background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 700, padding: '9px 10px', textAlign: col.l === 'Sale Price' ? 'right' : 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--primary-rgb), 0.15)', borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10, width: col.w }}>{col.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {soldLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></td></tr>
            ) : soldItems.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>No sold records found</td></tr>
            ) : soldItems.map((item, idx) => (
              <tr key={item.scopeKey} style={{ cursor: 'pointer', background: idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)' }} onClick={() => handleRowClick(item.scopeKey)} onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }} onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)'; }}>
                <td style={tdStyle}><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.serial || '\u2014'}</span></td>
                <td style={tdStyle}>{item.scopeType || '\u2014'}</td>
                <td style={tdStyle}>{item.client || '\u2014'}</td>
                <td style={tdStyle}>{item.saleDate || '\u2014'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{item.salePrice > 0 ? `$${item.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '\u2014'}</td>
                <td style={tdStyle}>{item.buyer || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Showing <strong style={{ color: 'var(--text)' }}>{soldItems.length}</strong> of <strong style={{ color: 'var(--text)' }}>{soldTotal}</strong></span>
        {soldTotalPages > 1 && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <PgBtn disabled={soldPage <= 1} onClick={() => setSoldPage(p => p - 1)}>{'\u2039'}</PgBtn>
            {Array.from({ length: Math.min(5, soldTotalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(soldPage - 2, soldTotalPages - 4));
              const p = start + i;
              return p <= soldTotalPages ? <PgBtn key={p} active={p === soldPage} onClick={() => setSoldPage(p)}>{p}</PgBtn> : null;
            })}
            <PgBtn disabled={soldPage >= soldTotalPages} onClick={() => setSoldPage(p => p + 1)}>{'\u203A'}</PgBtn>
          </div>
        )}
      </div>
    </div>
  );

  const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {statStrip}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'inhouse' && renderAcqTable(inHouseItems, inHouseLoading, inHouseTotal, inHouseSearch, setInHouseSearch, inHousePage, setInHousePage, 'In-House')}
        {activeTab === 'consigned' && renderAcqTable(consignedItems, consignedLoading, consignedTotal, consignedSearch, setConsignedSearch, consignedPage, setConsignedPage, 'Consigned')}
        {activeTab === 'sold' && soldTable}
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetail(null); }}
        placement="right"
        width={600}
        title={detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, color: 'var(--card)', fontSize: 14 }}>{detail.serial || 'Acquisition Detail'}</span>
            <StatusBadge status={detail.isSold ? 'Sold' : 'In-House'} />
          </div>
        ) : 'Acquisition Detail'}
        styles={{
          header: { background: 'var(--primary-dark)', borderBottom: 'none', color: 'var(--card)' },
          body: { padding: 0 },
        }}
      >
        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : !detail ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No detail available</div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {/* Cost banner */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{fmt$(detail.cost)}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acquisition Cost</div>
              </div>
            </div>
            <FormGrid cols={2}>
              <Field label="Serial #" value={detail.serial} />
              <Field label="Type" value={detail.flexOrRigid || '\u2014'} />
              <Field label="Scope Model" value={detail.scopeType} />
              <Field label="Manufacturer" value={detail.manufacturer || '\u2014'} />
              <Field label="Client" value={detail.client || '\u2014'} />
              <Field label="Department" value={detail.dept || '\u2014'} />
              <Field label="Supplier" value={detail.supplier || '\u2014'} />
              <Field label="PO Number" value={detail.poNumber || '\u2014'} />
              <Field label="PO Date" value={detail.poDate || '\u2014'} />
              <Field label="Date Received" value={detail.dateReceived || '\u2014'} />
            </FormGrid>
            {detail.comment && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Comments</div>
                <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--neutral-50)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  {detail.comment}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle', color: 'var(--text)',
};

const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} style={{
    height: 24, minWidth: 24, padding: '0 8px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 600 : 400,
    background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--card)' : 'var(--muted)', opacity: disabled ? 0.4 : 1,
  }}>{children}</button>
);
