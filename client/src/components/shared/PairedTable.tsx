import { useState, useCallback, memo } from 'react';
import './PairedTable.css';

/* ── Column definition ──────────────────────────────────────────────── */

export interface PairedColumn<T> {
  key: string;
  title: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  dataIndex: keyof T & string;
}

/* ── Props ───────────────────────────────────────────────────────────── */

export interface PairedTableProps<T> {
  columns: PairedColumn<T>[];
  data: T[];
  rowKey: keyof T & string;
  loading?: boolean;
  detailRender?: (row: T, index: number) => React.ReactNode;
  onRowClick?: (row: T) => void;
  urgentKey?: keyof T & string;
  selectedKey?: string | number | null;
  stickyHeader?: boolean;
}

/* ── Sort state ──────────────────────────────────────────────────────── */

type SortDir = 'asc' | 'desc' | null;

/* ── Component ──────────────────────────────────────────────────────── */

function PairedTableInner<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading,
  detailRender,
  onRowClick,
  urgentKey,
  selectedKey,
  stickyHeader = true,
}: PairedTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback((col: PairedColumn<T>) => {
    if (!col.sortable) return;
    if (sortCol === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(col.key);
      setSortDir('asc');
    }
  }, [sortCol, sortDir]);

  /* ── Sort data ─────────────────────────────────────────────────── */
  const sorted = (() => {
    if (!sortCol || !sortDir) return data;
    const col = columns.find(c => c.key === sortCol);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = a[col.dataIndex];
      const bv = b[col.dataIndex];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  })();

  const colCount = columns.length;

  return (
    <div className="paired-table-wrap">
      <table className="paired-table">
        <thead className={stickyHeader ? 'paired-sticky' : ''}>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  textAlign: col.align ?? 'left',
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                className={sortCol === col.key ? `sorted ${sortDir}` : ''}
                onClick={() => handleSort(col)}
                tabIndex={col.sortable ? 0 : undefined}
                aria-label={col.sortable ? `Sort by ${col.title}` : undefined}
                aria-sort={col.sortable && sortCol === col.key ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none') : undefined}
                onKeyDown={col.sortable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); } } : undefined}
              >
                {col.title}
                {col.sortable && (
                  <span className="pt-sort">
                    {sortCol === col.key
                      ? (sortDir === 'asc' ? '\u25B2' : '\u25BC')
                      : '\u21D5'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={colCount} className="pt-loading">Loading...</td></tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr><td colSpan={colCount} className="pt-empty">No records found</td></tr>
          )}
          {!loading && sorted.map((row, idx) => {
            const key = String(row[rowKey]);
            const isUrgent = urgentKey ? Boolean(row[urgentKey]) : false;
            const isSelected = selectedKey != null && key === String(selectedKey);
            const mainCls = [
              'pt-row-main',
              isUrgent && 'pt-urgent',
              isSelected && 'pt-selected',
            ].filter(Boolean).join(' ');

            return (
              <PairedRow
                key={key}
                row={row}
                idx={idx}
                columns={columns}
                mainCls={mainCls}
                colCount={colCount}
                detailRender={detailRender}
                onRowClick={onRowClick}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const PairedTable = memo(PairedTableInner) as typeof PairedTableInner;

/* ── PairedRow sub-component ────────────────────────────────────────── */

interface PairedRowProps<T> {
  row: T;
  idx: number;
  columns: PairedColumn<T>[];
  mainCls: string;
  colCount: number;
  detailRender?: (row: T, index: number) => React.ReactNode;
  onRowClick?: (row: T) => void;
}

function PairedRow<T extends Record<string, unknown>>({
  row,
  idx,
  columns,
  mainCls,
  colCount,
  detailRender,
  onRowClick,
}: PairedRowProps<T>) {
  const detail = detailRender?.(row, idx);

  return (
    <>
      <tr
        className={mainCls}
        onClick={() => onRowClick?.(row)}
        tabIndex={onRowClick ? 0 : undefined}
        onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
      >
        {columns.map(col => {
          const val = row[col.dataIndex];
          return (
            <td
              key={col.key}
              style={{ textAlign: col.align ?? 'left' }}
            >
              {col.render ? col.render(val, row, idx) : (val != null ? String(val) : '\u2014')}
            </td>
          );
        })}
      </tr>
      {detail != null && (
        <tr className="pt-row-detail">
          <td colSpan={colCount}>{detail}</td>
        </tr>
      )}
    </>
  );
}
