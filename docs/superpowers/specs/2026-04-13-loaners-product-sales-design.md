# Loaners + Product Sales Redesign — Design Spec

> **Date:** 2026-04-13
> **Screens:** /loaners, /product-sales
> **Goal:** Replace legacy screens with improved UX — better visibility, fewer clicks, smarter workflows. NOT a 1:1 clone.

---

## Part 1: Loaners Cockpit

### Layout
Full-width table with stat strip, inline actions, and 600px detail drawer. Matches Clients/Departments/Repairs pattern.

### Loaner Lifecycle (NEW — not in legacy)

```
Available → Eval Out → Checked Out → [Overdue?] → Returned → Eval In → Available
                ↓                                                ↓
              Fail → Repair                                   Fail → Repair
```

**Statuses:** Available, Eval Out, Checked Out, Overdue (auto: >21 days out), Returned, Eval In, Repair

### Stat Strip
Clickable chips that filter the table:
- **Available** (green) — scopes ready to loan
- **Evaluating** (purple) — scopes in outbound or inbound evaluation
- **Out** (amber) — checked out, within normal timeframe
- **Overdue** (red) — checked out > 21 days
- **Repair** (gray) — sent to repair after failed evaluation
- **Agreements Pending** (amber, after divider) — count of sent but unreturned agreements
- **Sales Rep filter** — dropdown to filter by rep (rightmost, before search)
- **Search** — text input, searches scope type + serial + client

### Table Columns
| Column | Source | Notes |
|--------|--------|-------|
| Scope Type | tblScopeType.sScopeTypeName | Model number |
| Serial # | tblScope.sSerialNumber | Monospace font |
| Status | Derived from lifecycle | Color-coded badge |
| Client / Dept | tblDepartment + tblClient | Two-line: client name + department below in muted text |
| Rep | tblSalesRep.sSalesRepName | Sales rep assigned to the loaner transaction |
| Days Out | Computed from sDateOut | Color-coded badge: green (<7d), amber (7-21d), red (>21d) |
| Agreement | Tracked per transaction | Badge: Sent (amber) / Received (green) / — (gray) |
| Action | Inline buttons | Context-dependent (see below) |

### Row Styling
- **Available:** Default row, "Check Out" button (blue)
- **Eval Out:** Purple tint, "Pass" (green) + "Fail" (red) buttons
- **Checked Out:** Amber tint, "Check In" button (green)
- **Overdue:** Red left border (3px), red tint, bold client name in red, "Check In" button
- **Eval In:** Purple tint, "Pass" + "Fail" buttons
- **Repair:** Gray text, no action button, "In repair" label

### Category Availability — Recall Indicator (NEW)
Cross-references loaner availability by `tblScopeTypeCategories.sScopeTypeCategory` against demand (active repairs with `bLoanerRequested = 1`):
- When a scope's category has **zero available** AND there's a pending loaner request for that category → show a **"Recall?"** badge on the checked-out row
- Clicking the badge shows who needs the loaner (which repair, which client)
- Helps processors decide which overdue/out loaner to recall first
- Example: "This colonoscope is out 32 days to Memorial. We have 0 colonoscopes available. Baptist Health needs one for repair #577812."

### Inline Check Out Flow
Clicking "Check Out" on an Available row **expands the row** into a compact inline form (no modal):
- **Department** — dropdown (filtered by client)
- **Delivery Method** — dropdown (tblDeliveryMethod)
- **Sales Rep** — dropdown (tblSalesRep)
- **P.O. #** — text input
- **On-Site Loaner** — checkbox
- **Save** / **Cancel** buttons
- Saving creates a tblLoanerTran record with sDateOut = now, advances status to Eval Out

### Inline Check In Flow
Clicking "Check In" on a Checked Out / Overdue row expands similarly:
- **Rack #** — text input (tblScope.sLoanerRackPosition)
- **Tracking #** — text input (return shipment)
- **Save** / **Cancel** buttons
- Saving sets sDateIn on the tblLoanerTran record, advances status to Eval In

### Detail Drawer (600px) — 5 Tabs

**Tab 1: Details**
- Current transaction info: loaned to (client/dept), date out, date in, delivery method, PO#, tracking#, sales rep, company, on-site loaner flag
- Scope identity: scope type, serial, category, rack position

**Tab 2: History (NEW — replaces paper trail)**
- Timeline of ALL past loaner transactions for this scope
- Each entry: date out, date in, client/dept, days out, eval results, agreement status
- Sorted newest first
- Searchable/filterable

**Tab 3: Evaluation (NEW — replaces paper checklists)**
- Structured checklist for outbound and inbound evaluations
- Predefined items: light test, angulation, leak test, cosmetic damage, etc.
- Tech clicks pass/fail on each item, adds notes
- Submit button with timestamp and user
- Shows both outbound and inbound eval history for current transaction

**Tab 4: Agreement (NEW — replaces paper agreement tracking)**
- **Generate** — creates a pre-filled loaner agreement PDF (scope info, client, dept, dates)
- **Email** — send agreement directly to department contact
- **Track status:** Sent date, Received date
- **Upload** — attach signed copy (future: e-signature)
- Status: Not Sent → Sent → Received

**Tab 5: Shipping**
- UPS label data from tblShippingUPS_Loaners
- Ship-to address fields
- Generate shipping label button

### Backend Requirements
- **GET /api/loaners** — list with stat counts, supports ?status=, ?salesRepKey=, ?search= filters
- **GET /api/loaners/:scopeKey** — full detail including current transaction, history, eval records
- **GET /api/loaners/stats** — stat strip counts
- **GET /api/loaners/category-availability** — available count by category + pending requests by category (for recall indicator)
- **POST /api/loaners/check-out** — create tblLoanerTran record
- **POST /api/loaners/check-in** — set sDateIn on transaction
- **POST /api/loaners/:scopeKey/evaluate** — submit eval checklist (outbound or inbound)
- **PATCH /api/loaners/:tranKey** — update transaction details
- **POST /api/loaners/:tranKey/agreement** — generate/email agreement, track sent/received

---

## Part 2: Product Sales

### Layout
Full-width order list table with stat strip. Click row → 600px tabbed drawer with pipeline bar. Matches Clients/Departments pattern.

### Order Lifecycle

```
Draft → Quoted → Approved → Partial → Invoiced
                    ↓                      ↓
                 Denied                 Cancelled
```

**Statuses:** Draft, Quoted, Approved, Partial (partially shipped), Invoiced, Denied, Cancelled

### Partial Fulfillment (NEW — not in legacy)
- Orders can be partially fulfilled — some items ship, others are backordered
- Each line item has its own status: **Pending / Shipped / Backordered**
- Multiple shipments per order — different tracking numbers and dates
- Can invoice shipped items while rest stay open
- Order status = "Partial" when some but not all items are shipped
- "Partial" badge visible in the list so processors can see which orders need follow-up

### Stat Strip
Clickable chips that filter the table:
- **Total** (navy) — all orders
- **Draft** (amber) — not yet quoted
- **Quoted** (blue) — quote generated, awaiting approval
- **Approved** (green) — approved, ready to ship
- **Invoiced** (dark green) — fully invoiced
- **Cancelled** (red) — voided/cancelled
- **Revenue** (navy, after divider) — total revenue across filtered orders
- **+ New Order** button (blue, rightmost)
- **Search** — text input

### Table Columns
| Column | Source | Notes |
|--------|--------|-------|
| Invoice # | tblProductSales.sInvoiceNumber | Bold for selected row |
| Client | tblClient.sClientName | |
| Department | tblDepartment.sDepartmentName | |
| Status | Derived from dates | Color-coded badge |
| Source | Van service link | "Van Replacement" badge if linked (NEW) |
| Sales Rep | tblSalesRep.sSalesRepName | |
| Order Date | tblProductSales.dtOrderDate | |
| Total | tblProductSales.nTotalAmount | Right-aligned, bold |
| Items | Count of line items | e.g. "3 items (1 backordered)" |

### Order Drawer (600px)

**Pipeline Bar (top of drawer)**
Visual progress indicator: Draft → Quoted → Approved → Invoiced
- Completed steps: green background with checkmark
- Current step: blue background with dot
- Future steps: gray background
- Below pipeline: client/dept on left, rep/date on right
- **"Advance to [next step] →"** button at bottom of drawer — single click to progress

**Tab 1: Items**
- **Line items table:** Description, Qty, Unit Price, Total, Status (Pending/Shipped/Backordered), remove (×)
- Editable quantity inline
- **Totals row:** Subtotal, Shipping, Tax, Total
- **Two-step inventory picker** (below line items):
  - Step 1: searchable category list (tblInventory.sItemDescription)
  - Click category → Step 2: sizes for that category (tblInventorySize)
  - Each size row: description, desc 2, status, qty input, "+" add button
  - Back arrow to return to categories
- **Ship action:** Select items → enter tracking # → mark as Shipped (for partial fulfillment)
- **Print Quote** button
- **Advance button** — context-dependent: "Generate Quote →", "Mark Approved →", "Create Invoice →"

**Tab 2: Details**
- Sales Rep (dropdown)
- Price List (dropdown: AMT / Local) — drives unit pricing via tblInventoryPricingListDetails
- P.O. # (text)
- Tracking # (text)
- Shipping Charge (currency)
- Tax (currency)
- Est. Ship Range From/To (dates)
- Contact (dropdown + name + phone)
- Note (textarea)
- Source: Van Service link (if applicable) — shows van service date, client, tech

**Tab 3: Addresses**
- Ship-to: Name, Address 1-2, City, State, Zip, Country
- Bill-to: Name, Address 1-2, City, State, Zip, Country, Email
- Bill Type selector

**Tab 4: Documents**
- Generated quotes and invoices (PDF)
- Uploaded documents
- Download/preview actions

### Van Service Integration (NEW)
- **Optional source link** on product sales orders — `lVanServiceKey` FK (nullable)
- When linked, shows **NV number** (van service visit ID) in both the list and the drawer so orders can be cross-referenced back to the visit
- **"Van: NV26100045" badge** in the order list Source column — clickable to navigate to the van service visit
- Details tab shows: NV number, van service date, client, tech
- **"Van Replacement" badge** in the order list for visual distinction
- Future: "Create Replacement Order" button in Van Service screen pre-fills client/dept/rep
- Pricing is independent — controlled by Price List (AMT / Local), not by van service link

### Price Lists
- **AMT** and **Local** are the two pricing tiers
- Stored in `tblInventoryPricingLists` → `tblInventoryPricingListDetails` (maps inventory size → unit cost)
- Selected per order via dropdown in Details tab
- When price list changes, unit costs on existing line items update (with confirmation)

### Backend Requirements
- **GET /api/product-sales** — list with stat counts, supports ?status=, ?search= filters
- **GET /api/product-sales/:key** — full detail including line items, addresses
- **GET /api/product-sales/stats** — stat strip counts + revenue
- **POST /api/product-sales** — create new order (Draft)
- **PATCH /api/product-sales/:key** — update order details
- **POST /api/product-sales/:key/items** — add line item (from inventory picker)
- **DELETE /api/product-sales/:key/items/:itemKey** — remove line item
- **PATCH /api/product-sales/:key/items/:itemKey** — update qty, status (ship/backorder)
- **POST /api/product-sales/:key/quote** — generate quote (sets dtQuoteDate, creates PDF)
- **POST /api/product-sales/:key/approve** — mark approved
- **POST /api/product-sales/:key/invoice** — create invoice (full or partial)
- **POST /api/product-sales/:key/void** — void/cancel order
- **GET /api/inventory** — list inventory items (categories)
- **GET /api/inventory/:key/sizes** — sizes for an item, with pricing per price list

---

## Shared Patterns

Both screens follow established patterns:
- **Stat strip** — click-to-filter chips with counts
- **Full-width table** — sortable columns, color-coded status badges
- **600px drawer** — tabbed detail view
- **Inline actions** — buttons in table rows, no unnecessary modals
- **CSS variables** — all colors via tokens, zero hardcoded hex
- **Shared components** — Field, FormGrid, StatusBadge, DetailHeader, TabBar, StatStrip, ExportButton

### New Shared Components Needed
- **PipelineBar** — horizontal step indicator (Draft → Quoted → Approved → Invoiced)
- **InlineExpandRow** — expandable table row for inline forms (check-out/check-in)
- **CategoryPicker** — two-step drill-down (category list → size grid)
- **EvalChecklist** — structured checklist with pass/fail per item

---

## Out of Scope
- E-signature for loaner agreements (future)
- "Create Replacement Order" button in Van Service screen (future — requires Van Service redesign)
- Loaner agreement PDF template design (use placeholder, refine later)
- UPS API integration for shipping labels (use existing tblShippingUPS_Loaners data)
