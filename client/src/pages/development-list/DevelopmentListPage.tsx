import { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import { getDevList, getDevListDetail, getDevListStatuses, getDevListStats } from '../../api/development-list';
import type { DevListItem, DevListStatus, DevListStats } from './types';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Field } from '../../components/shared/Field';
import { TabBar } from '../../components/shared/TabBar';
import type { TabDef } from '../../components/shared/TabBar';

/* ── helpers ── */
const statusVariant = (status: string): 'blue' | 'amber' | 'green' | 'red' | 'gray' => {
  const s = status.toLowerCase();
  if (s.includes('progress')) return 'amber';
  if (s.includes('complete') || s.includes('done')) return 'green';
  if (s.includes('cancel')) return 'gray';
  if (s.includes('review')) return 'blue';
  if (s.includes('await') || s.includes('clarif')) return 'amber';
  return 'blue';
};

const tdStyle: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle',
};

const DETAIL_TABS: TabDef[] = [
  { key: 'details', label: 'Details' },
  { key: 'activity', label: 'Activity' },
];

// ── Extracted static styles ──
const devPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const devToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const devToolbarLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const devFilterBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, flexWrap: 'wrap' };
const devSearchInputStyle: React.CSSProperties = { height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4, padding: '0 10px', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--card)', outline: 'none', width: 200 };
const devStatusLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const devSelectStyle: React.CSSProperties = { height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--card)', cursor: 'pointer', outline: 'none' };
const devFlexSpacerStyle: React.CSSProperties = { flex: 1 };
const devItemCountStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' };
const devStatStripStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 0, background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, overflowX: 'auto' };
const devStatChipStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRight: '1px solid var(--border)', fontSize: 11, whiteSpace: 'nowrap' };
const devStatChipLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const devStatChipValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--navy)' };
const devSplitLayoutStyle: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' };
const devLeftPanelStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-dk)' };
const devListHeaderStyle: React.CSSProperties = { background: 'var(--neutral-50)', padding: '5px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 };
const devListHeaderCountStyle: React.CSSProperties = { fontSize: 9, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 };
const devListScrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
const devSpinnerWrapStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const devTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 600 };
const devTheadStickyStyle: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 2 };
const devThStyle: React.CSSProperties = { background: 'var(--neutral-50)', color: 'var(--neutral-500)', fontWeight: 600, padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--border-light-rgb), 0.3)', borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 };
const devTdIdStyle: React.CSSProperties = { ...tdStyle, width: 42, textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--muted)' };
const devTdTitleStyle: React.CSSProperties = { ...tdStyle, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--navy)' };
const devTdTargetStyle: React.CSSProperties = { ...tdStyle, whiteSpace: 'nowrap', fontSize: 11, color: 'var(--label)' };
const devTdAssigneeStyle: React.CSSProperties = { ...tdStyle, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' };
const devPaginationFooterStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 };
const devPaginationCountStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' };
const devPaginationBtnsStyle: React.CSSProperties = { display: 'flex', gap: 4, alignItems: 'center' };
const devPageBtnStyle: React.CSSProperties = { padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', cursor: 'pointer', color: 'var(--text)' };
const devPageInfoStyle: React.CSSProperties = { padding: '0 6px', fontSize: 11, color: 'var(--muted)' };
const devRightPanelStyle: React.CSSProperties = { width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)' };
const devEmptyDetailStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--muted)', textAlign: 'center', gap: 8 };
const devEmptyTextStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500 };
const devDetailWrapStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const devDetailHeaderStyle: React.CSSProperties = { background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', padding: '7px 10px', display: 'flex', alignItems: 'flex-start', gap: 6, flexShrink: 0 };
const devDetailTitleStyle: React.CSSProperties = { flex: 1, fontSize: 12, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3, wordBreak: 'break-word' };
const devDetailBodyStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 10 };
const devFieldGrid2Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' };
const devActivityEmptyStyle: React.CSSProperties = { textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 11 };
const devSvgOpacityStyle: React.CSSProperties = { opacity: 0.18 };

export const DevelopmentListPage = () => {
  const [items, setItems] = useState<DevListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statuses, setStatuses] = useState<DevListStatus[]>([]);
  const [stats, setStats] = useState<DevListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DevListItem | null>(null);
  const [detailTab, setDetailTab] = useState<string>('details');

  /* filters */
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        getDevList({ search: search || undefined, statusId: filterStatus, page, pageSize }),
        getDevListStats(),
      ]);
      setItems(res.items);
      setTotalCount(res.totalCount);
      setStats(st);
    } catch (err) { console.error('[DevelopmentList] loadList failed', err); }
    setLoading(false);
  }, [search, filterStatus, page]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    getDevListStatuses().then(setStatuses).catch(() => { message.error('Failed to load development list statuses'); });
  }, []);

  const selectItem = async (id: number) => {
    setSelectedId(id);
    setDetailTab('details');
    try {
      const d = await getDevListDetail(id);
      setDetail(d);
    } catch (err) { console.error('[DevelopmentList] loadDetail failed', err); message.error('Failed to load item details'); }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={devPageContainerStyle}>
      {/* Toolbar */}
      <div style={devToolbarStyle}>
        <span style={devToolbarLabelStyle}>Development Backlog</span>
      </div>

      {/* Filter Bar */}
      <div style={devFilterBarStyle}>
        <input
          type="text"
          placeholder="Search items..."
          aria-label="Search development list items"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={devSearchInputStyle}
        />
        <span style={devStatusLabelStyle}>Status:</span>
        <select
          value={filterStatus ?? ''}
          onChange={e => { setFilterStatus(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          aria-label="Filter by status"
          style={devSelectStyle}
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s.statusId} value={s.statusId}>{s.status}</option>)}
        </select>
        <div style={devFlexSpacerStyle} />
        <span style={devItemCountStyle}>{totalCount} items</span>
      </div>

      {/* Stat Strip */}
      {stats && (
        <div style={devStatStripStyle}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'In Progress', value: stats.inProgress },
            { label: 'Awaiting', value: stats.awaiting },
            { label: 'Completed', value: stats.completed },
            { label: 'Review', value: stats.review },
          ].map(chip => (
            <div key={chip.label} style={devStatChipStyle}>
              <span style={devStatChipLabelStyle}>{chip.label}</span>
              <span style={devStatChipValueStyle}>{chip.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Split Layout */}
      <div style={devSplitLayoutStyle}>
        {/* Left — Item List */}
        <div style={devLeftPanelStyle}>
          <div style={devListHeaderStyle}>
            <span>Items</span>
            <span style={devListHeaderCountStyle}>{totalCount} records</span>
          </div>

          <div style={devListScrollStyle}>
            {loading ? (
              <div style={devSpinnerWrapStyle}><Spin /></div>
            ) : (
              <table style={devTableStyle}>
                <thead style={devTheadStickyStyle}>
                  <tr>
                    {['#', 'Title', 'Status', 'Target', 'Assignee'].map(h => (
                      <th key={h} style={devThStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isSelected = item.toDoId === selectedId;
                    return (
                      <tr
                        key={item.toDoId}
                        onClick={() => selectItem(item.toDoId)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--warning-bg)' : idx % 2 === 1 ? 'var(--row-alt)' : undefined,
                          borderLeft: isSelected ? '2px solid var(--amber)' : '2px solid transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? 'var(--row-alt)' : ''; }}
                      >
                        <td style={devTdIdStyle}>{item.toDoId}</td>
                        <td style={devTdTitleStyle}>{item.title}</td>
                        <td style={tdStyle}><StatusBadge status={item.status || 'Open'} variant={statusVariant(item.status)} /></td>
                        <td style={devTdTargetStyle}>
                          {item.targetYear ? `${item.targetYear} Q${item.targetQuarter ?? '?'}` : ''}
                        </td>
                        <td style={devTdAssigneeStyle}>{item.assignee || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={devPaginationFooterStyle}>
              <span style={devPaginationCountStyle}>{totalCount} records</span>
              <div style={devPaginationBtnsStyle}>
                {page > 1 && (
                  <button onClick={() => setPage(p => p - 1)} style={devPageBtnStyle}>Prev</button>
                )}
                <span style={devPageInfoStyle}>Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <button onClick={() => setPage(p => p + 1)} style={devPageBtnStyle}>Next</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Detail Panel */}
        <div style={devRightPanelStyle}>
          {!detail ? (
            <div style={devEmptyDetailStyle}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={devSvgOpacityStyle}>
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
              <p style={devEmptyTextStyle}>Select an item to view details</p>
            </div>
          ) : (
            <div style={devDetailWrapStyle}>
              {/* Detail Header */}
              <div style={devDetailHeaderStyle}>
                <div style={devDetailTitleStyle}>
                  {detail.title}
                </div>
                <StatusBadge status={detail.status || 'Open'} variant={statusVariant(detail.status)} />
              </div>

              {/* Tabs */}
              <TabBar
                tabs={DETAIL_TABS}
                activeKey={detailTab}
                onChange={setDetailTab}
              />

              {/* Detail Body */}
              <div style={devDetailBodyStyle}>
                {detailTab === 'details' ? (
                  <>
                    <Field label="Title" value={detail.title} />
                    <Field label="Description / Item" value={detail.description || ''} multiline />
                    <div style={devFieldGrid2Style}>
                      <Field label="Status" value={detail.status} />
                      <Field label="Assigned To" value={detail.assignee || ''} />
                    </div>
                    <div style={devFieldGrid2Style}>
                      <Field label="Target Year" value={detail.targetYear?.toString() || ''} />
                      <Field label="Quarter" value={detail.targetQuarter ? `Q${detail.targetQuarter}` : ''} />
                    </div>
                    <div style={devFieldGrid2Style}>
                      <Field label="Request Date" value={detail.requestDate || ''} />
                      <Field label="Completion Date" value={detail.completionDate || ''} />
                    </div>
                  </>
                ) : (
                  <div style={devActivityEmptyStyle}>
                    No activity recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
