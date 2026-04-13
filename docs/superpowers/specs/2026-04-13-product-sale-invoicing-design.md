# Product Sales — Split Order Invoicing

**Date:** 2026-04-13
**Status:** Approved
**Screen:** Product Sales (`/product-sales`)

## Problem

`tblProductSales` has a single `sInvoiceNumber` and `dtInvoiceDate` on the order header. Orders with partial fulfillment (some items ship, others backordered) can't be invoiced without overwriting the header — losing the first invoice when the second ships. Currently processors work around this by manually creating a separate work order for the remaining items.

GP integration (`tblGP_InvoiceStaging`) expects one invoice per staging row with a standalone `sTranNumber`. The existing `sTranNumberNoSuffix` column suggests suffix-based numbering was considered, but the simplest path is keeping each invoice as an independent order — which is what processors already do manually.

## Solution: Split Order on Invoice

When an order is partially fulfilled and invoiced, the system automatically creates a child order containing the unfulfilled items. Each order = one invoice = one GP staging row. No suffix logic, no new tables, no GP changes.

## DB Changes

### New column on `tblProductSales`

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `lParentProductSaleKey` | int | YES | FK → `tblProductSales.lProductSaleKey`. NULL = standalone order. Set = child created by split. |

### New column on `tblProductSalesInventory`

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `sItemStatus` | nvarchar(20) | NO | `'Pending'` | Values: `Pending`, `Shipped`, `Backordered` |

### Migration SQL (for Steve)

```sql
-- Add parent reference to product sales
ALTER TABLE tblProductSales
ADD lParentProductSaleKey INT NULL;

ALTER TABLE tblProductSales
ADD CONSTRAINT FK_ProductSales_Parent
FOREIGN KEY (lParentProductSaleKey) REFERENCES tblProductSales(lProductSaleKey);

-- Add item status tracking
ALTER TABLE tblProductSalesInventory
ADD sItemStatus NVARCHAR(20) NOT NULL DEFAULT 'Pending';
```

## Invoice Flow: "Invoice Shipped Items"

### Preconditions
- Order status = Approved
- At least one line item has `sItemStatus = 'Shipped'`

### Steps

1. **Generate invoice number** — Query `tblInvoiceNumbersDaily` for today's date + type, increment `lNextInvoiceNumber`, format as `sTranNumber`

2. **Snapshot line items** — For each item where `sItemStatus = 'Shipped'`, INSERT into `tblProductSaleInvoiceDetail`:
   - `lProductSalesKey` = current order key
   - `lProductSaleInventoryKey` = source line item key
   - `lInventoryKey`, `lInventorySizeKey` = from inventory size join
   - `sItemDescription`, `sSizeDescription`, `sSizeDescription2`, `sSizeDescription3`, `sSubDescription` = frozen from inventory tables
   - `lQty` = `lQuantity` from line item
   - `nUnitCost`, `nTotalCost` = from line item
   - `sLotNumber` = from line item

3. **Stamp current order** — UPDATE `tblProductSales` SET:
   - `sInvoiceNumber` = generated number
   - `dtInvoiceDate` = today
   - Recalculate `nQuoteAmount`, `nTotalAmount` to reflect only shipped items

4. **GP staging** — INSERT into `tblGP_InvoiceStaging` with standard fields:
   - `sTranNumber` = generated invoice number
   - `sTranNumberNoSuffix` = same (no suffix needed)
   - `TotalAmountDue` = shipped items total + shipping + tax
   - `bProcessed` = 0
   - Remaining fields (GPID_Department, GPID_SalesRep, PaymentTerms, GLAccount, etc.) populated per existing GP integration logic

5. **Create child order (if backordered items exist)** — If any items have `sItemStatus = 'Backordered'`:

   INSERT new `tblProductSales` row:
   - `lParentProductSaleKey` = parent order's `lProductSaleKey`
   - `lClientKey`, `lDepartmentKey`, `lSalesRepKey` = copied from parent
   - `lInventoryPricingListKey` = copied from parent
   - `sPurchaseOrder` = copied from parent
   - `sContactName`, `sContactEmailAddress`, `sClientPhoneNumber`, `lContactKey` = copied
   - Ship-to address fields = copied from parent
   - Bill-to address fields = copied from parent
   - `dtOrderDate` = today
   - `dtApprovalDate` = today (inherits Approved status)
   - `sInvoiceNumber` = '' (empty — not yet invoiced)
   - `dtQuoteDate` = NULL, `dtInvoiceDate` = NULL, `dtCanceledDate` = NULL
   - `sNote` = `'Split from order [parent invoice #] — backordered items'`
   - `nQuoteAmount`, `nShippingAmount`, `nTaxAmount`, `nTotalAmount` = recalculated from backordered items only

   INSERT `tblProductSalesInventory` rows:
   - One row per backordered item from parent
   - `lProductSaleKey` = new child order key
   - `lInventorySizeKey`, `lQuantity`, `nUnitCost`, `nTotalCost`, `sLotNumber` = copied from parent line item
   - `sItemStatus` = `'Pending'` (reset — ready for next shipment cycle)

6. **Clean up parent** — DELETE the backordered `tblProductSalesInventory` rows from the parent order (they now live on the child). Parent retains only shipped items as an invoiced, closed record.

### Full Invoice (no backorders)

If ALL items are `Shipped`, skip steps 5-6. The order is simply invoiced and closed. No child order created.

## API Changes

### New endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| PATCH | `/product-sales/{key}/items/{itemKey}/status` | Set `sItemStatus` on a single line item |
| POST | `/product-sales/{key}/items/bulk-status` | Set `sItemStatus` on multiple items at once |
| GET | `/product-sales/{key}/related` | Get parent + sibling orders for the Related Orders section |

### Modified endpoints

| Method | Route | Change |
|--------|-------|--------|
| POST | `/product-sales/{key}/invoice` | Full rewrite — implements the 6-step flow above |
| GET | `/product-sales/{key}` | Include `lParentProductSaleKey`, `parentInvoiceNumber` in response |
| GET | `/product-sales` | Include `lParentProductSaleKey` in list items for UI badge |

### Request/Response additions

**PATCH `/product-sales/{key}/items/{itemKey}/status`**
```json
{ "status": "Shipped" }
```
Valid values: `Pending`, `Shipped`, `Backordered`

**POST `/product-sales/{key}/items/bulk-status`**
```json
{
  "itemKeys": [101, 102, 105],
  "status": "Shipped"
}
```

**GET `/product-sales/{key}/related`**
```json
{
  "parent": { "key": 1001, "invoiceNumber": "260413-001", "status": "Invoiced" },
  "children": [
    { "key": 1034, "invoiceNumber": "", "status": "Approved", "itemCount": 2 }
  ]
}
```
Returns `null` for parent if this is a root order. Returns empty array for children if none exist.

**POST `/product-sales/{key}/invoice` response**
```json
{
  "invoiceNumber": "260413-003",
  "invoiceDate": "2026-04-13",
  "childOrderKey": 1034,
  "childOrderItemCount": 2
}
```
`childOrderKey` = null if no backorders existed.

## UI Changes

### Items Tab

**New per-item status column:**
- Displays status badge: Pending (gray), Shipped (green), Backordered (amber)
- Default state for all items = Pending

**Bulk status actions:**
- Checkbox column on each line item (existing)
- "Mark Shipped" button — sets selected items to Shipped
- "Mark Backordered" button — sets selected items to Backordered
- Both buttons only visible when order status = Approved

**Invoice button:**
- Label: "Invoice Shipped Items"
- Replaces current "Create Invoice" button
- Only enabled when: order is Approved AND at least one item is Shipped
- On click: calls POST `/product-sales/{key}/invoice`
- On success: show message "Invoice [number] created" + if child order exists: "Backordered items moved to new order PS-[key]"
- Refresh the drawer to show the now-Invoiced order

### Detail Pane Header — Related Orders

Below the pipeline bar, if the order has a parent or children:

**If child order (has parent):**
> Split from: **PS-1001** (link)

**If parent order (has children):**
> Related orders: **PS-1034** (Approved), **PS-1052** (Invoiced) (links)

Clicking a link opens that order in the drawer.

### List View

No filter changes needed. Child orders appear in the Approved tab alongside regular orders — processors see them as open work. When a child is invoiced, it moves to the Invoiced tab like any other order.

Optional: small "split" badge or icon on child orders in the list to indicate they came from a parent. Not required for v1.

## What GP Sees

Nothing new. Each invoice is a standalone `tblGP_InvoiceStaging` row:
- Own `sTranNumber` from `tblInvoiceNumbersDaily`
- Own `lInvoiceKey`
- Own amounts (only the shipped items for that invoice)
- `sTranNumberNoSuffix` = same as `sTranNumber` (no suffix logic)

Parent invoice and child invoice are completely independent in GP.

## What Doesn't Change

- **Quote flow** (Draft → Quoted → Approved) — untouched
- **Void/Cancel/Deny** — works per order as today
- **Addresses tab** — untouched, child inherits addresses at creation
- **Documents tab** — untouched
- **Pricing logic** — child inherits parent's `lInventoryPricingListKey`
- **Stats** — existing stats query counts orders by status, no changes needed
- **tblProductSaleQuote / tblProductSaleQuoteDetail** — quote is generated before the split happens, so no impact

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| All items shipped, none backordered | Normal invoice, no child order |
| All items backordered, none shipped | Button disabled — can't invoice zero items |
| Child order gets partially fulfilled again | Same flow — invoices shipped items, creates grandchild order with remaining |
| Void a child order | Standard void — sets `dtCanceledDate`, items are abandoned |
| Void a parent after child exists | Allowed — parent becomes Cancelled, child remains Approved (independent) |
| Edit quantities on child order | Allowed — child is a full order, quantities editable before invoice |
| Add new items to child order | Allowed — child is a full order |

## Sequence Diagram

```
Processor                    API                         DB
    |                         |                          |
    |-- Mark items Shipped -->|                          |
    |   (bulk-status)        |-- UPDATE sItemStatus --->|
    |                         |                          |
    |-- Invoice Shipped ----->|                          |
    |   Items                |-- Get next invoice # --->|
    |                         |<-- "260413-003" ---------|
    |                         |                          |
    |                         |-- INSERT invoice detail->|
    |                         |   (snapshot shipped)     |
    |                         |                          |
    |                         |-- UPDATE parent order -->|
    |                         |   (invoiceDate, number)  |
    |                         |                          |
    |                         |-- INSERT GP staging ---->|
    |                         |                          |
    |                         |-- INSERT child order --->|
    |                         |   (Approved, backorders) |
    |                         |                          |
    |                         |-- INSERT child items --->|
    |                         |   (status = Pending)     |
    |                         |                          |
    |                         |-- DELETE parent items -->|
    |                         |   (backordered only)     |
    |                         |                          |
    |<-- { invoiceNumber,    |                          |
    |      childOrderKey } ---|                          |
```
