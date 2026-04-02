import { useState } from 'react';
import { Drawer, Spin, Table } from 'antd';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type { ProductSaleDetail } from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const TABS: TabDef[] = [
  { key: 'details', label: 'Details' },
  { key: 'items',   label: 'Line Items' },
];

interface Props {
  detail: ProductSaleDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export const ProductSaleDetailPane = ({ detail, loading, open, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState('details');

  const lineItemColumns = [
    { title: 'Item', dataIndex: 'itemDescription', key: 'itemDescription' },
    { title: 'Size', dataIndex: 'sizeDescription', key: 'sizeDescription' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 50, align: 'center' as const },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right' as const,
      render: (v: number) => fmt$(v),
    },
    {
      title: 'Ext Price',
      dataIndex: 'extendedPrice',
      key: 'extendedPrice',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt$(v)}</span>,
    },
  ];

  const tabs: TabDef[] = detail
    ? TABS.map(t => t.key === 'items' ? { ...t, label: `Line Items (${detail.lineItems.length})` } : t)
    : TABS;

  return (
    <Drawer
      title={
        detail ? (
          <DetailHeader
            title={detail.invoiceNumber}
            badges={<StatusBadge status={detail.status} />}
          />
        ) : 'Sale Detail'
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      styles={{
        header: { background: 'var(--primary-dark)', borderBottom: 'none' },
        body: { padding: 0 },
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : !detail ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No sale selected</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Financial summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)' }}>
            {[
              { label: 'Subtotal', value: fmt$(detail.subTotal), color: 'var(--navy)' },
              { label: 'Tax', value: fmt$(detail.taxAmount), color: 'var(--muted)' },
              { label: 'Shipping', value: fmt$(detail.shippingAmount), color: 'var(--muted)' },
              { label: 'Total', value: fmt$(detail.totalAmount), color: 'var(--navy)' },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
              </div>
            ))}
          </div>

          <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

          {activeTab === 'details' && (
            <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
              {/* Order Info */}
              <FormGrid cols={2}>
                <Field label="Client" value={detail.clientName} />
                <Field label="Department" value={detail.departmentName} />
                <Field label="Sales Rep" value={detail.salesRep} />
                <Field label="Order Date" value={fmtDate(detail.orderDate)} />
                <Field label="PO #" value={detail.purchaseOrder} />
                <Field label="Tracking #" value={detail.trackingNumber} />
                <Field label="Contact" value={detail.contactName} />
                <Field label="Phone" value={detail.contactPhone} />
              </FormGrid>

              {/* Addresses */}
              <FormGrid cols={2} className="mt-2">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                    {detail.billName}<br />
                    {detail.billAddress}<br />
                    {detail.billCity}, {detail.billState} {detail.billZip}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ship To</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                    {detail.shipName}<br />
                    {detail.shipAddress}<br />
                    {detail.shipCity}, {detail.shipState} {detail.shipZip}
                  </div>
                </div>
              </FormGrid>

              {detail.notes && (
                <div style={{ marginTop: 8 }}>
                  <Field label="Notes" value={detail.notes} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
              {detail.lineItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No line items</div>
              ) : (
                <Table
                  dataSource={detail.lineItems}
                  columns={lineItemColumns}
                  rowKey="invoiceKey"
                  size="small"
                  pagination={false}
                  style={{ fontSize: 12 }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
