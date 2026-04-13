import { useState, useEffect, useCallback } from 'react';
import { Drawer, Spin, message } from 'antd';
import {
  StatusBadge,
  TabBar,
  Field,
  FormGrid,
  PipelineBar,
  CategoryPicker,
} from '../../components/shared';
import type { TabDef, PipelineStep, CategoryItem, SizeItem } from '../../components/shared';
import type { ProductSaleDetail } from './types';
import {
  getProductSaleDetail,
  addLineItem,
  removeLineItem,
  updateLineItem,
  generateQuote,
  approveOrder,
  invoiceOrder,
  getInventoryCategories,
  getInventorySizes,
} from '../../api/product-sales';
import './ProductSaleDrawer.css';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? '\u2014'
    : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const PIPELINE_STEPS: PipelineStep[] = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Quoted', label: 'Quoted' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Invoiced', label: 'Invoiced' },
];

const TABS: TabDef[] = [
  { key: 'items', label: 'Items' },
  { key: 'details', label: 'Details' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'documents', label: 'Documents' },
];

function getAdvanceLabel(status: string): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'draft') return 'Generate Quote \u2192';
  if (s === 'quoted' || s === 'quote sent') return 'Mark Approved \u2192';
  if (s === 'approved') return 'Create Invoice \u2192';
  return 'Advance \u2192';
}

function canAdvance(status: string): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'draft' || s === 'quoted' || s === 'quote sent' || s === 'approved';
}

interface Props {
  productSaleKey: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const ProductSaleDrawer = ({ productSaleKey, open, onClose, onUpdated }: Props) => {
  const [detail, setDetail] = useState<ProductSaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [advancing, setAdvancing] = useState(false);

  // Category picker state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [selectedCatName, setSelectedCatName] = useState<string | null>(null);

  const loadDetail = useCallback(async (key: number) => {
    setLoading(true);
    try {
      const d = await getProductSaleDetail(key);
      setDetail(d);
    } catch {
      message.error('Failed to load product sale detail');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && productSaleKey) {
      loadDetail(productSaleKey);
      setActiveTab('items');
      setSelectedCatName(null);
    }
    if (!open) {
      setDetail(null);
    }
  }, [open, productSaleKey, loadDetail]);

  // Load categories on first mount
  useEffect(() => {
    getInventoryCategories()
      .then(cats =>
        setCategories(cats.map(c => ({ key: c.inventoryKey, name: c.itemDescription })))
      )
      .catch(() => message.error('Failed to load inventory categories'));
  }, []);

  const handleSelectCategory = async (key: number) => {
    const cat = categories.find(c => c.key === key);
    setSelectedCatName(cat?.name ?? null);
    setLoadingSizes(true);
    try {
      const data = await getInventorySizes(key, detail?.pricingListKey);
      setSizes(
        data.map(s => ({
          key: s.inventorySizeKey,
          description: s.sizeDescription,
          description2: s.sizeDescription2 ?? '',
          description3: s.sizeDescription3 ?? '',
          status: s.status ?? 'Active',
          unitCost: s.unitCost,
        }))
      );
    } catch {
      message.error('Failed to load sizes');
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleAddItem = async (sizeKey: number, quantity: number) => {
    if (!productSaleKey) return;
    try {
      await addLineItem(productSaleKey, { inventorySizeKey: sizeKey, quantity });
      message.success('Item added');
      loadDetail(productSaleKey);
      onUpdated();
    } catch {
      message.error('Failed to add item');
    }
  };

  const handleRemoveItem = async (itemKey: number) => {
    if (!productSaleKey) return;
    try {
      await removeLineItem(productSaleKey, itemKey);
      message.success('Item removed');
      loadDetail(productSaleKey);
      onUpdated();
    } catch {
      message.error('Failed to remove item');
    }
  };

  const handleQtyChange = async (itemKey: number, qty: number) => {
    if (!productSaleKey || qty < 1) return;
    try {
      await updateLineItem(productSaleKey, itemKey, { quantity: qty });
      loadDetail(productSaleKey);
      onUpdated();
    } catch {
      message.error('Failed to update quantity');
    }
  };

  const handleAdvance = async () => {
    if (!productSaleKey || !detail) return;
    setAdvancing(true);
    const s = detail.status.toLowerCase();
    try {
      if (s === 'draft') await generateQuote(productSaleKey);
      else if (s === 'quoted' || s === 'quote sent') await approveOrder(productSaleKey);
      else if (s === 'approved') await invoiceOrder(productSaleKey);
      message.success('Status updated');
      loadDetail(productSaleKey);
      onUpdated();
    } catch {
      message.error('Failed to advance status');
    } finally {
      setAdvancing(false);
    }
  };

  // Pipeline derivation
  const completedSteps: string[] = [];
  if (detail) {
    if (detail.quoteDate) completedSteps.push('Draft');
    if (detail.approvalDate) completedSteps.push('Quoted');
    if (detail.invoiceDate) { completedSteps.push('Approved'); completedSteps.push('Invoiced'); }
  }

  const normalizedStatus = (() => {
    if (!detail) return 'Draft';
    const s = detail.status.toLowerCase();
    if (s === 'draft') return 'Draft';
    if (s === 'quoted' || s === 'quote sent') return 'Quoted';
    if (s === 'approved') return 'Approved';
    if (s === 'invoiced') return 'Invoiced';
    return detail.status;
  })();

  const subTotal = detail
    ? detail.lineItems.reduce((sum, li) => sum + li.totalCost, 0)
    : 0;

  const tabs: TabDef[] = detail
    ? TABS.map(t =>
        t.key === 'items' ? { ...t, label: `Items (${detail.lineItems.length})` } : t
      )
    : TABS;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={600}
      closable={false}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div className="ps-drawer">
        {/* Header */}
        <div className="ps-drawer__header">
          <div className="ps-drawer__header-left">
            <h2 className="ps-drawer__title">
              {detail?.invoiceNumber || 'Sale Detail'}
            </h2>
            {detail && <StatusBadge status={detail.status} />}
          </div>
          <button className="ps-drawer__close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : !detail ? (
          <div className="ps-placeholder">No sale selected</div>
        ) : (
          <div className="ps-drawer__body">
            {/* Pipeline bar */}
            <div className="ps-pipeline-section">
              <PipelineBar
                steps={PIPELINE_STEPS}
                currentStep={normalizedStatus}
                completedSteps={completedSteps}
              />
            </div>

            <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

            {/* Items tab */}
            {activeTab === 'items' && (
              <div className="ps-drawer__tab-content">
                {detail.lineItems.length === 0 ? (
                  <div className="ps-empty-items">No line items yet. Use the picker below to add items.</div>
                ) : (
                  <>
                    <table className="ps-line-items">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th style={{ width: 56 }} className="ps-li-center">Qty</th>
                          <th style={{ width: 80 }} className="ps-li-right">Unit Price</th>
                          <th style={{ width: 80 }} className="ps-li-right">Total</th>
                          <th style={{ width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.lineItems.map(li => (
                          <tr key={li.productSaleInventoryKey}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>
                                {li.itemDescription}
                              </div>
                              {li.sizeDescription && (
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  {li.sizeDescription}
                                  {li.sizeDescription2 ? ` / ${li.sizeDescription2}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="ps-li-center">
                              <input
                                type="number"
                                className="ps-qty-input"
                                defaultValue={li.quantity}
                                min={1}
                                onBlur={e => {
                                  const val = parseInt(e.target.value) || 1;
                                  if (val !== li.quantity) handleQtyChange(li.productSaleInventoryKey, val);
                                }}
                              />
                            </td>
                            <td className="ps-li-right">{fmt$(li.unitCost)}</td>
                            <td className="ps-li-right ps-li-bold">{fmt$(li.totalCost)}</td>
                            <td>
                              <button
                                className="ps-remove-btn"
                                onClick={() => handleRemoveItem(li.productSaleInventoryKey)}
                                title="Remove item"
                                type="button"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="ps-totals">
                      <div className="ps-totals__row">
                        <span className="ps-totals__label">Subtotal</span>
                        <span className="ps-totals__value">{fmt$(subTotal)}</span>
                      </div>
                      <div className="ps-totals__row">
                        <span className="ps-totals__label">Shipping</span>
                        <span className="ps-totals__value">{fmt$(detail.shippingAmount)}</span>
                      </div>
                      <div className="ps-totals__row">
                        <span className="ps-totals__label">Tax</span>
                        <span className="ps-totals__value">{fmt$(detail.taxAmount)}</span>
                      </div>
                      <div className="ps-totals__row ps-totals__row--grand">
                        <span className="ps-totals__label">Total</span>
                        <span className="ps-totals__value">{fmt$(detail.totalAmount)}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Category picker */}
                <div className="ps-picker-section">
                  <CategoryPicker
                    categories={categories}
                    sizes={sizes}
                    loadingSizes={loadingSizes}
                    onSelectCategory={handleSelectCategory}
                    onAddItem={handleAddItem}
                    selectedCategoryName={selectedCatName}
                    onBack={() => {
                      setSelectedCatName(null);
                      setSizes([]);
                    }}
                  />
                </div>

                {/* Action buttons */}
                <div className="ps-actions">
                  <button
                    className="ps-print-btn"
                    disabled={!detail.quoteDate}
                    type="button"
                  >
                    Print Quote
                  </button>
                  {canAdvance(detail.status) && (
                    <button
                      className="ps-advance-btn"
                      onClick={handleAdvance}
                      disabled={advancing}
                      type="button"
                    >
                      {advancing ? 'Processing...' : getAdvanceLabel(detail.status)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Details tab */}
            {activeTab === 'details' && (
              <div className="ps-drawer__tab-content">
                <FormGrid cols={2}>
                  <Field label="Client" value={detail.clientName} />
                  <Field label="Department" value={detail.departmentName} />
                  <Field label="Sales Rep" value={detail.salesRep} />
                  <Field label="Price List" value={detail.pricingListName} />
                  <Field label="PO #" value={detail.purchaseOrder} />
                  <Field label="Tracking #" value={detail.shipTrackingNumber} />
                  <Field label="Shipping" value={fmt$(detail.shippingAmount)} />
                  <Field label="Tax" value={fmt$(detail.taxAmount)} />
                  <Field label="Order Date" value={fmtDate(detail.orderDate)} />
                  <Field label="Quote Date" value={fmtDate(detail.quoteDate)} />
                  <Field label="Est Ship From" value={fmtDate(detail.estimatedShipDateFrom)} />
                  <Field label="Est Ship To" value={fmtDate(detail.estimatedShipDateTo)} />
                  <Field label="Contact" value={detail.contactName} />
                  <Field label="Phone" value={detail.contactPhone} />
                  <Field label="Email" value={detail.contactEmail} />
                </FormGrid>
                {detail.note && (
                  <div style={{ marginTop: 8 }}>
                    <Field label="Note" value={detail.note} />
                  </div>
                )}
              </div>
            )}

            {/* Addresses tab */}
            {activeTab === 'addresses' && (
              <div className="ps-drawer__tab-content">
                <div className="ps-address-block">
                  <div className="ps-address-title">Ship To</div>
                  <FormGrid cols={2}>
                    <Field label="Name" value={detail.shipName1} />
                    <Field label="Name 2" value={detail.shipName2} />
                    <Field label="Address" value={detail.shipAddressLine1} />
                    <Field label="Address 2" value={detail.shipAddressLine2} />
                    <Field label="City" value={detail.shipCity} />
                    <Field label="State" value={detail.shipState} />
                    <Field label="Zip" value={detail.shipZipCode} />
                    <Field label="Country" value={detail.shipCountry} />
                  </FormGrid>
                </div>
                <div className="ps-address-block">
                  <div className="ps-address-title">Bill To</div>
                  <FormGrid cols={2}>
                    <Field label="Name" value={detail.billName1} />
                    <Field label="Name 2" value={detail.billName2} />
                    <Field label="Address" value={detail.billAddressLine1} />
                    <Field label="Address 2" value={detail.billAddressLine2} />
                    <Field label="City" value={detail.billCity} />
                    <Field label="State" value={detail.billState} />
                    <Field label="Zip" value={detail.billZipCode} />
                    <Field label="Country" value={detail.billCountry} />
                    <Field label="Bill Email" value={detail.billEmail} />
                  </FormGrid>
                </div>
              </div>
            )}

            {/* Documents tab */}
            {activeTab === 'documents' && (
              <div className="ps-drawer__tab-content">
                <div className="ps-placeholder">Documents coming soon</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};
