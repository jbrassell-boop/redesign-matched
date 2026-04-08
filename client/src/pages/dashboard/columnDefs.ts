import type { ColumnsType } from 'antd/es/table';
import { createElement } from 'react';
import { StatusBadge } from '../../components/shared';
import type { DashboardView } from './types';

const woLink = (onRowClick: (key: number) => void) => ({
  title: 'WO#',
  dataIndex: 'wo',
  key: 'wo',
  width: 110,
  render: (text: string, record: { repairKey?: number }) =>
    createElement('span', {
      style: { color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' },
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); record.repairKey && onRowClick(record.repairKey); },
    }, text),
});

const tatRender = (days: number) =>
  createElement('span', {
    style: { color: days > 14 ? 'var(--danger)' : days > 7 ? 'var(--amber)' : 'var(--text)' },
  }, `${days}d`);

const statusRender = (text: string) => createElement(StatusBadge, { status: text });

const nullDash = (v: string | null) => v ?? '\u2014';
const moneyRender = (v: number | null) =>
  v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '\u2014';

// ── Repairs ──
const hotBadge = (text: string, record: { isUrgent?: boolean }) =>
  createElement('span', null,
    record?.isUrgent
      ? createElement('span', { style: { background: 'var(--danger)', color: 'var(--card)', padding: '1px 5px', borderRadius: 8, fontSize: 11, fontWeight: 700, marginRight: 4 } }, 'HOT')
      : null,
    text,
  );

const repairsColumns = (onRowClick: (key: number) => void): ColumnsType<any> => [
  { title: 'DATE IN', dataIndex: 'dateIn', key: 'dateIn', width: 90 },
  { title: 'CLIENT', dataIndex: 'client', key: 'client', width: 180, ellipsis: true, render: hotBadge },
  { title: 'DEPT', dataIndex: 'dept', key: 'dept', width: 140, ellipsis: true },
  woLink(onRowClick),
  { title: 'SCOPE TYPE', dataIndex: 'scopeType', key: 'scopeType', width: 150, ellipsis: true },
  { title: 'SERIAL', dataIndex: 'serial', key: 'serial', width: 100 },
  { title: 'TAT', dataIndex: 'daysIn', key: 'daysIn', width: 55, align: 'center', render: tatRender },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 210, render: statusRender },
  { title: 'DATE APPR', dataIndex: 'dateApproved', key: 'dateApproved', width: 95, render: nullDash },
  { title: 'EST DELIV', dataIndex: 'estDelivery', key: 'estDelivery', width: 95, render: nullDash },
  { title: 'APPROVED $', dataIndex: 'amountApproved', key: 'amountApproved', width: 100, align: 'right', render: moneyRender },
  { title: 'TECH', dataIndex: 'tech', key: 'tech', width: 80, render: nullDash },
];

// ── Shipping ──
const shippingColumns = (onRowClick: (key: number) => void): ColumnsType<any> => [
  woLink(onRowClick),
  { title: 'CLIENT', dataIndex: 'client', key: 'client' },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 130, render: statusRender },
  { title: 'SHIP DATE', dataIndex: 'shipDate', key: 'shipDate', width: 100, render: nullDash },
  { title: 'TRACKING #', dataIndex: 'trackingNumber', key: 'trackingNumber', width: 140, render: nullDash },
  { title: 'CHARGE', dataIndex: 'shipCharge', key: 'shipCharge', width: 90, align: 'right', render: moneyRender },
];

// ── Invoices ──
const invoicesColumns = (_onRowClick: (key: number) => void): ColumnsType<any> => [
  { title: 'INVOICE #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 110 },
  { title: 'WO#', dataIndex: 'wo', key: 'wo', width: 110 },
  { title: 'CLIENT', dataIndex: 'client', key: 'client' },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 130, render: statusRender },
  { title: 'AMOUNT', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', render: moneyRender },
  { title: 'DATE', dataIndex: 'date', key: 'date', width: 100 },
];

// ── Flags ──
const flagsColumns = (_onRowClick: (key: number) => void): ColumnsType<any> => [
  { title: 'OWNER', dataIndex: 'ownerName', key: 'ownerName' },
  { title: 'FLAG TYPE', dataIndex: 'flagType', key: 'flagType', width: 120, render: statusRender },
  { title: 'FLAG', dataIndex: 'flagText', key: 'flagText' },
];

// ── Emails ──
const emailsColumns = (_onRowClick: (key: number) => void): ColumnsType<any> => [
  { title: 'DATE', dataIndex: 'date', key: 'date', width: 100 },
  { title: 'TYPE', dataIndex: 'emailType', key: 'emailType', width: 120 },
  { title: 'FROM', dataIndex: 'from', key: 'from' },
  { title: 'TO', dataIndex: 'to', key: 'to' },
  { title: 'SUBJECT', dataIndex: 'subject', key: 'subject' },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 100, render: statusRender },
];

// ── Tasks ──
const tasksColumns = (_onRowClick: (key: number) => void): ColumnsType<any> => [
  { title: 'PRIORITY', dataIndex: 'priority', key: 'priority', width: 90, render: statusRender },
  { title: 'TASK', dataIndex: 'title', key: 'title' },
  { title: 'CLIENT', dataIndex: 'client', key: 'client' },
  { title: 'TYPE', dataIndex: 'taskType', key: 'taskType', width: 120 },
  { title: 'DATE', dataIndex: 'date', key: 'date', width: 100 },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 130, render: statusRender },
];

// ── Tech Bench ──
const techBenchColumns = (onRowClick: (key: number) => void): ColumnsType<any> => [
  woLink(onRowClick),
  { title: 'CLIENT', dataIndex: 'client', key: 'client' },
  { title: 'SCOPE TYPE', dataIndex: 'scopeType', key: 'scopeType' },
  { title: 'TECH', dataIndex: 'tech', key: 'tech', width: 100, render: nullDash },
  { title: 'STATUS', dataIndex: 'status', key: 'status', width: 130, render: statusRender },
  { title: 'TAT', dataIndex: 'daysIn', key: 'daysIn', width: 60, align: 'center', render: tatRender },
];

const VIEW_COLUMNS: Record<DashboardView, (onRowClick: (key: number) => void) => ColumnsType<any>> = {
  briefing: () => [],
  repairs: repairsColumns,
  shipping: shippingColumns,
  invoices: invoicesColumns,
  flags: flagsColumns,
  emails: emailsColumns,
  tasks: tasksColumns,
  techbench: techBenchColumns,
};

export const getColumnsForView = (view: DashboardView, onRowClick: (key: number) => void): ColumnsType<any> =>
  VIEW_COLUMNS[view](onRowClick);

// Row key extractors per view
export const getRowKey = (view: DashboardView): string => {
  switch (view) {
    case 'briefing': return 'id';
    case 'repairs': case 'shipping': case 'techbench': return 'repairKey';
    case 'invoices': return 'invoiceKey';
    case 'flags': return 'flagKey';
    case 'emails': return 'emailKey';
    case 'tasks': return 'taskKey';
  }
};
