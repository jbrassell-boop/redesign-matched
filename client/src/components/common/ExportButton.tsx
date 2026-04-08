import { useState, memo } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { exportCsv, exportExcel } from './exportUtils';

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  sheetName?: string;
}

function ExportButtonInner<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  sheetName,
}: ExportButtonProps<T>) {
  const [open, setOpen] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'csv',
      label: 'Export as CSV',
      onClick: () => { exportCsv(data, columns, filename); setOpen(false); },
    },
    {
      key: 'xlsx',
      label: 'Export as Excel',
      onClick: () => { exportExcel(data, columns, filename, sheetName).then(() => setOpen(false)); },
    },
  ];

  return (
    <Dropdown menu={{ items }} open={open} onOpenChange={setOpen} trigger={['click']}>
      <button
        style={{
          height: 30,
          padding: '0 12px',
          border: '1px solid var(--border-dk)',
          borderRadius: 6,
          fontSize: 11,
          background: 'var(--card)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: 500,
          transition: 'all 0.1s',
        }}
        className="export-btn"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export
      </button>
    </Dropdown>
  );
}

export const ExportButton = memo(ExportButtonInner) as typeof ExportButtonInner;
