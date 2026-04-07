import { memo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import './DataTable.css';

interface DataTableProps<T> extends TableProps<T> {
  className?: string;
}

function DataTableInner<T extends object>(props: DataTableProps<T>) {
  const { className, ...rest } = props;
  return (
    <div className={`data-table-wrap${className ? ` ${className}` : ''}`}>
      <Table<T> size="small" pagination={false} {...rest} />
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;
