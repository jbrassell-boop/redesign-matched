import { Drawer, Spin, Table, Tag } from 'antd';
import type { ProductSaleDetail } from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const STATUS_TAG: Record<string, string> = {
  'Open': 'blue',
  'Invoiced': 'green',
  'Draft': 'gold',
  'Quote Sent': 'purple',
  'Cancelled': 'error',
};

interface FieldProps { label: string; value: string | number | null | undefined }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>{value ?? '\u2014'}</div>
  </div>
);

interface Props {
  detail: ProductSaleDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export const ProductSaleDetailPane = ({ detail, loading, open, onClose }: Props) => {
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

  return (
    <Drawer
      title={
        detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{detail.invoiceNumber}</span>
            <Tag color={STATUS_TAG[detail.status] ?? 'default'} style={{ color: '#fff', border: 'none' }}>{detail.status}</Tag>
          </div>
        ) : 'Sale Detail'
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      styles={{
        header: { background: 'var(--primary-dark)', borderBottom: 'none' },
        body: { padding: '16px 20px' },
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : !detail ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No sale selected</div>
      ) : (
        <>
          {/* Financial summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
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

          {/* Order Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Client" value={detail.clientName} />
            <Field label="Department" value={detail.departmentName} />
            <Field label="Sales Rep" value={detail.salesRep} />
            <Field label="Order Date" value={fmtDate(detail.orderDate)} />
            <Field label="PO #" value={detail.purchaseOrder} />
            <Field label="Tracking #" value={detail.trackingNumber} />
            <Field label="Contact" value={detail.contactName} />
            <Field label="Phone" value={detail.contactPhone} />
          </div>

          {/* Addresses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: 8 }}>
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
          </div>

          {detail.notes && (
            <div style={{ marginTop: 8 }}>
              <Field label="Notes" value={detail.notes} />
            </div>
          )}

          {/* Line items */}
          {detail.lineItems.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Line Items ({detail.lineItems.length})
              </div>
              <Table
                dataSource={detail.lineItems}
                columns={lineItemColumns}
                rowKey="invoiceKey"
                size="small"
                pagination={false}
                style={{ fontSize: 12 }}
              />
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};
