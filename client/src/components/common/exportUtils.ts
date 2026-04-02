import * as XLSX from 'xlsx';

interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Export data as CSV and trigger browser download.
 */
export function exportCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
): void {
  const headers = columns.map(c => c.label);
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Export data as XLSX (Excel) and trigger browser download.
 */
export function exportExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Sheet1',
): void {
  const headers = columns.map(c => c.label);
  const rows = data.map(row => columns.map(c => row[c.key] ?? ''));
  const wsData = [headers, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on header lengths
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.label.length + 2, 12) }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
