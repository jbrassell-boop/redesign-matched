import { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { getDevList, getDevListDetail, getDevListStatuses, getDevListStats } from '../../api/development-list';
import type { DevListItem, DevListStatus, DevListStats, DevListResponse } from './types';

/* ── helpers ── */
const Badge = ({ label, variant }: { label: string; variant: 'blue' | 'amber' | 'green' | 'red' | 'neutral' }) => {
  const styles: Record<string, React.CSSProperties> = {
    blue:    { background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.3)' },
    amber:   { background: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--warning)', border: '1px solid rgba(var(--amber-rgb), 0.3)' },
    green:   { background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', border: '1px solid rgba(var(--success-rgb), 0.3)' },
    red:     { background: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)', border: '1px solid rgba(var(--danger-rgb), 0.3)' },
    neutral: { background: 'var(--neutral-100)', color: 'var(--neutral-500)', border: '1px solid var(--border)' },
  };
  return (
    <span style={{ ...styles[variant], display: 'inline-flex', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
};

const statusVariant = (status: string): 'blue' | 'amber' | 'green' | 'red' | 'neutral' => {
  const s = status.toLowerCase();
  if (s.includes('progress')) return 'amber';
  if (s.includes('complete') || s.includes('done')) return 'green';
  if (s.includes('cancel')) return 'neutral';
  if (s.includes('review')) return 'blue';
  if (s.includes('await') || s.includes('clarif')) return 'amber';
  return 'blue';
};

const tdStyle: React.CSSProperties = {
  padding: '6px 12px', fontSize: 11.5, borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle',
};

export const DevelopmentListPage = () => {
  const [items, setItems] = useState<DevListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statuses, setStatuses] = useState<DevListStatus[]>([]);
  const [stats, setStats] = useState<DevListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DevListItem | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');

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
    } catch { /* empty */ }
    setLoading(false);
  }, [search, filterStatus, page]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    getDevListStatuses().then(setStatuses).catch(() => {});
  }, []);

  const selectItem = async (id: number) => {
    setSelectedId(id);
    setDetailTab('details');
    try {
      const d = await getDevListDetail(id);
      setDetail(d);
    } catch { /* empty */ }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Development Backlog</span>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
        background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4,
            padding: '0 10px', fontSize: 11.5, fontFamily: 'inherit', color: 'var(--text)',
            background: 'var(--card)', outline: 'none', width: 200,
          }}
        />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</span>
        <select
          value={filterStatus ?? ''}
          onChange={e => { setFilterStatus(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          style={{
            height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4,
            padding: '0 6px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)',
            background: 'var(--card)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s.statusId} value={s.statusId}>{s.status}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{totalCount} items</span>
      </div>

      {/* Stat Strip */}
      {stats && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, overflowX: 'auto',
        }}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'In Progress', value: stats.inProgress },
            { label: 'Awaiting', value: stats.awaiting },
            { label: 'Completed', value: stats.completed },
            { label: 'Review', value: stats.review },
          ].map(chip => (
            <div key={chip.label} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px',
              borderRight: '1px solid var(--border)', fontSize: 11, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{chip.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>{chip.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Split Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left — Item List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-dk)' }}>
          <div style={{
            background: 'var(--neutral-50)', padding: '5px 10px', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy)',
            borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span>Items</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{totalCount} records</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr>
                    {['#', 'Title', 'Status', 'Target', 'Assignee'].map(h => (
                      <th key={h} style={{
                        background: 'var(--neutral-50)', color: 'var(--neutral-500)', fontWeight: 600,
                        padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap',
                        borderRight: '1px solid rgba(180,200,220,0.3)', borderBottom: '1px solid var(--neutral-200)',
                        letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10,
                      }}>{h}</th>
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
                        <td style={{ ...tdStyle, width: 42, textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{item.toDoId}</td>
                        <td style={{ ...tdStyle, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--navy)' }}>{item.title}</td>
                        <td style={tdStyle}><Badge label={item.status || 'Open'} variant={statusVariant(item.status)} /></td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 11, color: 'var(--label)' }}>
                          {item.targetYear ? `${item.targetYear} Q${item.targetQuarter ?? '?'}` : ''}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.assignee || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{totalCount} records</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {page > 1 && (
                  <button onClick={() => setPage(p => p - 1)} style={{
                    padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4,
                    background: 'var(--card)', cursor: 'pointer', color: 'var(--text)',
                  }}>Prev</button>
                )}
                <span style={{ padding: '0 6px', fontSize: 11, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <button onClick={() => setPage(p => p + 1)} style={{
                    padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4,
                    background: 'var(--card)', cursor: 'pointer', color: 'var(--text)',
                  }}>Next</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Detail Panel */}
        <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)' }}>
          {!detail ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--muted)', textAlign: 'center', gap: 8 }}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.18 }}>
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
              <p style={{ fontSize: 11.5, fontWeight: 500 }}>Select an item to view details</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Detail Header */}
              <div style={{
                background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)',
                padding: '7px 10px', display: 'flex', alignItems: 'flex-start', gap: 6, flexShrink: 0,
              }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {detail.title}
                </div>
                <Badge label={detail.status || 'Open'} variant={statusVariant(detail.status)} />
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)',
                flexShrink: 0, padding: '0 8px',
              }}>
                {(['details', 'activity'] as const).map(tab => (
                  <div
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    style={{
                      padding: '7px 12px', fontSize: 11, fontWeight: detailTab === tab ? 700 : 500,
                      color: detailTab === tab ? 'var(--primary)' : 'var(--muted)',
                      cursor: 'pointer', borderBottom: detailTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                      whiteSpace: 'nowrap', textTransform: 'capitalize',
                    }}
                  >{tab}</div>
                ))}
              </div>

              {/* Detail Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                {detailTab === 'details' ? (
                  <>
                    <DetailField label="Title" value={detail.title} />
                    <DetailField label="Description / Item" value={detail.description || ''} multiline />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
                      <DetailField label="Status" value={detail.status} />
                      <DetailField label="Assigned To" value={detail.assignee || ''} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
                      <DetailField label="Target Year" value={detail.targetYear?.toString() || ''} />
                      <DetailField label="Quarter" value={detail.targetQuarter ? `Q${detail.targetQuarter}` : ''} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
                      <DetailField label="Request Date" value={detail.requestDate || ''} />
                      <DetailField label="Completion Date" value={detail.completionDate || ''} />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 11 }}>
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

const DetailField = ({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 7 }}>
    <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {multiline ? (
      <div style={{
        minHeight: 60, border: '1.5px solid var(--border-dk)', borderRadius: 4, padding: '6px 8px',
        fontSize: 11.5, color: 'var(--text)', background: 'var(--neutral-50)', whiteSpace: 'pre-wrap', lineHeight: 1.4,
      }}>{value}</div>
    ) : (
      <div style={{
        height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4, padding: '0 8px',
        fontSize: 11.5, color: 'var(--text)', background: 'var(--neutral-50)',
        display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    )}
  </div>
);
