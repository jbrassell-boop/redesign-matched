# Repairs Cockpit — Design Spec

**Date:** 2026-04-02
**Goal:** Redesign the Repairs detail screen as a dense "cockpit" optimized for operations processors who translate tech evaluations into estimates, approvals, and customer-facing documents. Zero unnecessary clicks. Everything visible.

---

## Users & Workflow

**Primary users:** Operations processors — they bridge the bench (technicians) and the customer.

**Core loop:**
1. Scope received → WO created (from Receiving or Dashboard)
2. Tech evaluates → processor opens repair cockpit
3. Processor reviews tech findings (line items, inspections)
4. Processor builds estimate from line items, sends to client
5. Client approves → processor advances WO
6. Work completes → processor handles shipping/invoicing

**Design principle:** Flow state. The cockpit keeps the processor in one screen with all context visible. They never leave to look up client info, pricing, contacts, or scope history.

---

## Layout: Cockpit Mode

Full-width viewport (no left list panel — Dashboard serves as the repair list).

### Top to bottom:

**1. Compact Header Bar (single line, ~36px)**
- WO number (bold, primary-dark)
- Status badge (colored pill)
- Urgent badge (red pill, if flagged)
- Separator dot
- Client name → Department name (plain text)
- Separator dot
- Scope model + Serial number
- Separator dot
- TAT (color-coded: green <7d, amber 7-14d, red >14d)
- Right-aligned: action buttons (Next Stage, Change Status, Print D&I)

**2. Reference Strip (persistent context bar, ~40px)**
Horizontal row of labeled value cells, always visible:

| Cell | Source |
|------|--------|
| Client | client name (clickable → opens client drawer) |
| Department | dept name (clickable → opens dept drawer) |
| Scope | model + serial (clickable → scope history dropdown) |
| Pricing | pricing category name (from client/contract) |
| Terms | payment terms name |
| TAT | days in, color-coded |
| Contact | primary dept contact name |
| PO# | purchase order number (editable inline) |

Clicking Client or Department opens a 600px slide-out drawer showing full detail (contacts, flags, pricing, address) without navigating away.

**3. Flags Bar (~28px, conditional)**
Only visible when the client/department has flags. Shows flag chips:
- Warning flags (amber): "Requires PO before work", "Credit hold"
- Info flags (blue): "GPO Member", "Contract pricing"
- Scope flags (purple): "3 prior repairs on this scope"

If no flags, this bar doesn't render.

**4. Two-Pane Body (remaining viewport height)**

Left pane (flex, main content):
- Tab bar
- Tab content (scrollable)

Right pane (280px, always visible, scrollable):
- Context cards (see below)

---

## Tab Bar

| Tab | Badge | Content |
|-----|-------|---------|
| **Workflow** (default) | Line item count | Line items table — the primary workspace |
| Details | — | Repair info fields, addresses, complaint, notes |
| Inspections | — | D&I + Final QC pass/fail grids |
| Financials | — | Revenue, expenses, margin calculations |
| Scope History | Repair count | Prior repairs on this serial number |
| Status Log | Entry count | Timeline of status changes |

**Workflow tab is the default** — this is where processors spend most of their time building estimates.

---

## Workflow Tab (Primary Tab)

### Line Items Table
Full-width table showing repair line items (tblRepairItemTran):

| Column | Width | Notes |
|--------|-------|-------|
| Approved | 60px | Y/N/P chip (green/red/amber) |
| Item Code | 100px | sProblemID |
| Description | flex | sItemDescription |
| Cause | 80px | from repair item |
| Fix Type | 80px | sFixType |
| Amount | 100px | dblRepairPrice, right-aligned, currency format |
| Tech | 80px | technician initials |
| Comments | 150px | sComments, truncated with tooltip |

### Footer
- Left: item count ("4 items")
- Right: total amount (sum of approved line items, bold, currency format)

### Actions
- "Add Item" button opens an item picker (search repair items catalog)
- Row click opens line item edit (inline or drawer)
- Bulk approve/deny via checkbox selection

---

## Details Tab

Two-column layout using SectionCard components:

**Left column (flex):**

*Repair Information* section card:
- Date In, Date Out, Technician, Technician 2
- Date Approved, Approval Name, Est. Delivery
- Approved Amount, Invoice Number
- Repair Level, Repair Reason, Source (Email/Phone/Portal/Van/Walk-in)

*Complaint / Description* section card:
- Complaint textarea (editable)
- Customer Reference field

*Loaner* section card (if loaner requested):
- Loaner Requested, Loaner Provided, Loaner Scope reference

**Right column (310px):**

*Billing Address* section card:
- Bill Name, Address 1, Address 2, City, State, Zip, Email

*Shipping Address* section card:
- "Same as billing" toggle
- Ship Name, Address 1, Address 2, City, State, Zip

*Shipping & Tracking* section card:
- Ship Date, Weight, Delivery Service Level
- Tracking # (outgoing), Tracking # (incoming), FedEx #, Vendor #

*Accessories Checklist* section card:
- Checkboxes: Box, Case, ETO Cap, CO2 Cap, Camera, Hood, Light Post Adapter, Suction Valve, Waterproof Cap, Air/Water Valve

---

## Inspections Tab

Two-panel layout (side by side):

**Left panel: Incoming (D&I)**
- Scope Repairable toggle (Yes/No)
- Scope Usable toggle (Yes/No)
- Angulation measurements grid (In/Out × Up/Down/Left/Right)
- Broken fibers count (in/out)
- Fiber angle, light transmission

**Right panel: Final QC (Post-Repair)**
- Same P/F checkpoints as D&I for comparison
- Inspector technician field

**P/F Grid (below both panels):**
30+ pass/fail checkpoints organized in a 4-column grid:
- Image, Leak, Fiber/Light Trans, Angulation
- Focal Distance, Image Centration, Fog, Hot/Cold Leak
- Suction, Forcep Channel, Air/Water, Aux Water
- (and remaining checkpoints from the schema)

Each checkpoint: label + P/F toggle buttons (green for pass, red for fail)
- "Mark All Pass" and "Clear All" buttons at top
- Counter showing pass/fail totals

---

## Financials Tab

Two-column layout:

**Left: Revenue**
- Sale Amount (sum of approved line items)
- Sales Tax
- Invoice Total (sale + tax)

**Right: Expenses**
- Outsource Cost
- Shipping Cost
- Labor Cost
- Inventory/Material Cost
- GPO Cost
- Commission
- Total Expenses

**Bottom: Margins**
- Margin % (colored: green >=30%, amber 15-30%, red <15%)
- Contract Margin %
- Expected Margin Amount
- Margin Adjustment Required flag

---

## Context Sidebar (Right Pane, 280px)

Always visible. Four section cards stacked vertically:

**Client & Pricing**
- Client name (bold, linked)
- Contract type (Contract/Time & Materials/Warranty)
- Pricing tier name
- Payment terms
- Sales rep name
- "View full client →" link (opens drawer)

**Send Estimate To**
- Primary contact name (from department)
- Title/role
- Email (clickable mailto)
- Phone
- "Change contact" link

**Scope History**
- Mini table: WO#, Status (colored pill), Date
- Shows last 5 repairs on this serial number
- "View all →" link (switches to Scope History tab)

**Financial Snapshot**
- Revenue: $X,XXX.XX
- Expenses: $X,XXX.XX
- Margin: XX.X% (color-coded)
- Updated live as line items change

---

## Interactions

**Status advancement:** "Next Stage →" button advances through: Received → D&I → In Repair → Final QC → Shipping → Invoiced. Each transition logged with timestamp.

**Change Status:** Dropdown showing all available statuses. Selecting one updates immediately with confirmation.

**Client/Department drawers:** Clicking client or department name in the reference strip opens a 600px slide-out drawer showing full client/department detail (contacts, flags, pricing, addresses). Read-only from the repair cockpit.

**Scope history dropdown:** Clicking serial number in the reference strip shows a dropdown panel with prior repairs. Clicking a WO# navigates to that repair.

**PO# inline edit:** The PO# field in the reference strip is editable inline (click to edit, blur to save).

**Notes:** Inline editable text area with auto-save indicator.

---

## Navigation

**Entry points:**
- Dashboard repair table → click row → opens cockpit for that WO
- Receiving flow → after WO creation → auto-opens cockpit
- URL direct: `/repairs/:repairKey`

**Exit:** Browser back or sidebar nav. No "back to list" button needed — Dashboard is the list.

**Within cockpit:** Tab switching, drawer open/close, dropdown panels. No page navigation.

---

## New API Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `GET /clients/{id}/summary` | Lightweight: name, pricing tier, contract type, payment terms, rep name |
| `GET /departments/{id}/contacts/primary` | Primary contact: name, email, phone, title |
| `GET /repairs/{id}/full` | Extended detail including billing/shipping addresses, accessories, loaner info |
| `PUT /repairs/{id}/po` | Update PO number inline |
| `GET /repairs/{id}/inspections` | All 30+ P/F values + angulation measurements |
| `PUT /repairs/{id}/inspections` | Save inspection results |
| `POST /repairs/{id}/lineitems` | Add a line item |
| `PUT /repairs/{id}/lineitems/{tranKey}` | Update a line item |
| `DELETE /repairs/{id}/lineitems/{tranKey}` | Remove a line item |

---

## Out of Scope

- Editing client/department data from the cockpit (read-only context)
- Receiving flow (separate screen)
- Printing/PDF generation (future)
- Email sending (future)
- Loaner management workflow (future)
- Outsource vendor workflow (future)
