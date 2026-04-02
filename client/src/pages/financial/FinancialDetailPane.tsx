import { Drawer, Spin, Table } from 'antd';
import type { InvoiceDetail } from './types';
import { Field, FormGrid, StatusBadge } from '../../components/shared';

const fmt$ = (v: number) =>
  '$' +
  v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? '\u2014'
    : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

interface Props {
  detail: InvoiceDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export const FinancialDetailPane = ({ detail, loading, open, onClose }: Props) => {
  const lineItemColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt$(v)}</span>,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      align: 'right' as const,
      render: (v: number) => fmt$(v),
    },
  ];

  return (
    <Drawer
      title={
        detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--card)' }}>
              Invoice {detail.invoiceNumber}
            </span>
            <StatusBadge status={detail.status} />
          </div>
        ) : 'Invoice Detail'
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
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No invoice selected
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{fmt$(detail.amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Aging</div>
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: detail.agingDays > 30 ? 'var(--danger)' : detail.agingDays > 14 ? 'var(--amber)' : 'var(--muted)',
              }}>
                {detail.agingDays}d
              </div>
            </div>
          </div>

          {/* Fields grid */}
          <FormGrid cols={2}>
            <Field label="Client" value={detail.clientName} />
            <Field label="PO #" value={detail.purchaseOrder} />
            <Field label="Terms" value={detail.paymentTerms} />
            <Field label="Delivery" value={detail.deliveryMethod} />
            <Field label="Issued" value={fmtDate(detail.issuedDate)} />
            <Field label="Due Date" value={fmtDate(detail.dueDate)} />
            <Field label="Scope Type" value={detail.scopeType} />
            <Field label="Serial #" value={detail.serialNumber} />
            <Field label="Sales Rep" value={detail.salesRep} />
            <Field label="Shipping" value={fmt$(detail.shippingAmount)} />
            <Field label="Tax" value={fmt$(detail.taxAmount)} />
          </FormGrid>

          {/* Bill To / Ship To */}
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

          {/* Line items */}
          {detail.lineItems.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Line Items
              </div>
              <Table
                dataSource={detail.lineItems}
                columns={lineItemColumns}
                rowKey="detailKey"
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
