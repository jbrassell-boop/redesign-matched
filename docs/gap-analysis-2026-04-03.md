# TSI Redesign — Functional Gap Analysis
Date: 2026-04-03

## Summary
- **Total screens analyzed:** 21
- **Screens with major gaps (most functionality missing):** Repairs (New Order wizard), Clients (Addresses tab, Report Card, Activity tabs), Departments (8 missing tabs), Contracts (Departments/Amendments/Renewal tabs; Address tab), Inventory (Receive Inventory tab missing), Financial (At Risk, Trending tabs), Quality (Rework Tracking tab), Loaners (Active/Scope Needs sub-tabs missing from React), Repair Items Catalog (entire page absent from routing)
- **Screens substantially complete:** Acquisitions, Outsource Validation, Onsite Services, Administration, Development List, Scope Models, Instruments, Suppliers, Workspace, Reports, Dashboard
- **Estimated total gaps:** ~95 specific missing elements across all screens

---

## Repair Items Catalog — MAJOR

The entire `repair-items.html` screen has no corresponding React route or page.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Overview | Built | Missing — no page |
| Pricing & Time | Built | Missing — no page |
| Flags | Built | Missing — no page |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| `/repair-items` route | Page | Full split-layout catalog of all repair items with list panel + detail panel | High |
| Add Item button | Button | Opens modal to create new repair item (Description, TSI Code, Product ID, Type, Part/Labor, Turnaround, Repair Level) | High |
| Type filter (All/Flexible/Rigid) | Filter | Segment button filter on left panel list | High |
| Status filter (All/Active/Inactive) | Filter | Segment button filter on left panel list | High |
| Search input | Filter | Searches description or code | High |
| Items stat strip (Total, Active, Inactive, Flexible, Rigid, Showing) | Stats | Live counts | Med |
| Overview tab: Description, TSI Code, Product ID fields | Form fields | Editable inline | High |
| Overview tab: Type, Part/Labor, Repair Level, Status, Turnaround selects | Form fields | Editable dropdowns | High |
| Pricing & Time tab: Avg Cost Material, Avg Cost Labor | Form fields | Dollar amount inputs | High |
| Pricing & Time tab: Tech time grid (Standard + Small Diameter × Tech 1/2/3 mins) | Form grid | 6 numeric inputs in a 2-column grid layout | High |
| Flags tab: 7 behavior toggles (Active, Okay to Skip, Is Adjustment, Skip Pick List, Profit+, Profit−, Locked) | Toggles | ON/OFF per item | High |
| Save button + save status indicator | Button | Saves current item to API | High |
| Delete button + confirmation modal | Button | Soft delete with confirmation | High |
| Add Item modal | Modal | Full form for creating new repair item | High |
| Delete confirmation modal | Modal | "Delete [Name]? Cannot be undone" | High |

---

## Repairs — PARTIAL

Core 4-tab cockpit is built (Scope In, Details, Outgoing, Expense). Remaining tabs and several action workflows are stubs or missing.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Scope In (1 — Scope In) | Built | Built — read-only display only, no editable fields |
| Details (2 — Details) | Built | Built — action buttons all say "coming soon" |
| Outgoing (3 — Outgoing) | Built | Built — action buttons (Create Label, Draft/Email/Void Invoice) call message.info stubs |
| Expense (4 — Expense) | Built | Built |
| Workflow | Built | Built — read-only line items table only; no workflow pill bar, no QC form, no approval flow |
| Inspections | Built | Built — full P/F grid implemented, saves to API |
| Financials | Built | Built |
| Scope History | Built | Built |
| Status Log | Built | Built |
| Comments | Built | Stub — "coming soon" placeholder |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| New Work Order wizard | Workflow | Multi-step modal (Step 1: select scope, Step 2: client/dept, Step 3: repair options, Step 4: summary + submit) | High |
| Scope In tab — editable fields | Form | All fields in HTML are inputs; React shows read-only display fields only | High |
| Outgoing tab — Create Label button | Button | Triggers UPS/FedEx label generation | Med |
| Outgoing tab — Draft Invoice | Button | Generates invoice draft | High |
| Outgoing tab — Email Invoice | Button | Emails invoice to client | High |
| Outgoing tab — Void Invoice | Button | Voids current invoice | High |
| Details tab — Consumption button | Button | Logs parts/labor consumption | High |
| Details tab — Unapproved button | Button | Sets line items to unapproved | High |
| Details tab — Approved button | Button | Batch-approves line items | High |
| Details tab — Update Slips button | Button | Updates tech slips/time records | Med |
| Details tab — Defect Tracking button | Button | Opens defect tracking workflow | Med |
| Details tab — Update Techs button | Button | Assigns/updates technicians on repair | High |
| Details tab — Inventory button | Button | Opens inventory picker for parts | High |
| Details tab — Angulation IN values | Data | Should display actual angulation data from DB; React shows "—" placeholder | High |
| Workflow tab — Workflow pill bar | UI | Horizontal bar of workflow phases/actions with available next actions highlighted | High |
| Workflow tab — QC drawer | UI | Right-side drawer with P/F QC checklist, angulation fields, defect tracking | High |
| Comments tab | Tab | Add/view notes and comment thread on repair | Med |
| Status change — full dropdown | Workflow | HTML shows all available statuses in a dropdown; React wires to API but needs verification | Med |
| Repair cockpit — context-sensitive tab highlighting | UI | Suggested tabs show dot indicator; dimmed tabs reduce opacity based on repair state | Low |

---

## Clients — PARTIAL

Info, Flags, Contacts, and Repair History tabs are built with real data. Addresses, Report Card, and Activity tabs are stubs or missing.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Main (Info) | Built | Built — missing several field groups |
| Addresses | Built | Missing — no AddressesTab component |
| Departments | Built | Built — read-only list, links to Departments module |
| Flags | Built | Built — add/edit/delete flags with full API |
| Contacts | Built | Built — add/edit/delete contacts |
| Report Card | Built | Stub — no ReportCardTab component |
| Activity | Built | Stub — no ActivityTab component |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Addresses tab — Bill To form | Form | Name, Address, Address 2, City, State, Zip, Country, Billing Contact, Billing Email fields (editable) | High |
| Addresses tab — Ship To form | Form | Same fields + "Same as Bill To" checkbox toggle | High |
| Report Card tab | Tab | Generate performance report: Department selector, Contract selector, Date From/To, Report Type dropdown, Include Inactive checkbox, Generate + Export to Excel buttons | Med |
| Activity tab | Tab | Audit trail of client changes with timestamps and user | Med |
| Main tab — Unit/Building field | Field | Building or unit identifier (ci-unit) | Low |
| Main tab — Portal Months field | Field | Number of months visible on client portal | Low |
| Main tab — Invoice & Options section | Section | 11 checkbox toggles: Blind PS3, Req Totals Only, Blind Totals Final, Skip Metrics, PO Required, Never Hold, Skip Tracking, Email New Repairs, National Account, Bad Debt Risk, Open Credit Memo | High |
| Main tab — Integration/ERP section | Section | Great Plains ID, GP ID South, Peachtree ID, Adjustment %, Use Adj % toggle | Med |
| Main tab — Additional Details section | Section | Secondary Name, Reference 1, Reference 2, Client Terms, Sales Tax, Reporting Group | Med |
| Main tab — Billing & Pricing Defaults — Credit Limit, Distributor, Bill To, Discount %, Markup % | Fields | Editable selects/inputs; React shows only Pricing Category, Sales Rep, Payment Terms, Distributor (read-only) | High |
| New Client modal | Modal | Full multi-section form for creating a new client with address auto-fill from zip | High |
| Deactivate Client | Button | Confirms and deactivates the current client | Med |
| Delete Client | Button | Permanently deletes client with confirmation modal | Med |
| Find Client modal | Modal | Search by name/zip/city/ID with location filter and clickable results table | Med |
| Save button + save state indicator | Button | Ctrl+S hotkey, "Ready / Dirty / Saving / Saved" state feedback | High |

---

## Departments — PARTIAL

Info, Contacts, Scopes, Sub-Groups, and Repairs tabs are built. Eight tabs from the HTML are entirely absent.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Main (Info) | Built | Built — missing many field groups |
| Addresses | Built | Missing |
| Scopes | Built | Built |
| Instruments | Built | Missing |
| Repairs | Built | Built |
| Contracts | Built | Missing |
| Technicians | Built | Missing |
| GPO's | Built | Missing |
| Scope Types | Built | Missing |
| Sub Groups | Built | Built |
| Contacts | Built | Built |
| Flags | Built | Missing |
| Documents | Built | Missing |
| Model Max Charges | Built | Missing |
| Activity | Built | Missing |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Addresses tab | Tab | Bill To + Ship To address forms with "Same as Bill To" toggle (identical pattern to clients) | High |
| Instruments tab | Tab | Linked instruments list for this department | Med |
| Contracts tab | Tab | Contracts active for this department | High |
| Technicians tab | Tab | Technicians assigned to this department | Med |
| GPO's tab | Tab | GPO affiliations and rates for this department | Med |
| Scope Types tab | Tab | Scope types covered by this department's contract | Med |
| Flags tab | Tab | Client flags scoped to this department | High |
| Documents tab | Tab | Uploaded documents for this department | Med |
| Model Max Charges tab | Tab | Per-model maximum charge caps | High |
| Activity tab | Tab | Audit trail of department changes | Low |
| Info tab — Department Type, Procedures, Bed Size | Fields | Size classification, annual procedure count, bed count | Med |
| Info tab — Service Locations (checkbox chips) | Field | Multi-select: Upper Chichester, Nashville | High |
| Info tab — Billing & Pricing Defaults section | Section | Sales Rep, CS Rep, Additional CS, National Account, Pricing Category, Reporting Group, Shipping Carrier, Default Shipping, Discount %, Markup %, Cleaning System, Chemical Germicide, Manufacturer, Competition | High |
| Info tab — Options section (11 checkboxes) | Section | Show Consumption On Req, Enforce Scope Type Filtering, Show Product ID, Show UA Or NWT, Show Itemized Descriptions, Open Credit Memo, Email New Repairs, Member BOA, Tracking Required, Tax Exempt, Pays By Credit Card, On-Site Service | High |
| Info tab — Financial section (Capitated Cost, Sales Tax) | Section | Contract capitated cost and applicable sales tax | Med |
| Info tab — Integration/ERP section | Section | GPID, GPID South, PeachtreeID, NetSuiteID | Low |
| Export Dept Audit | Button | Exports audit log to CSV/Excel | Low |
| Export Dept Contacts | Button | Exports contacts to CSV/Excel | Low |
| New Department button | Button | Creates a new department; currently exists but modal/form not verified | High |

---

## Contracts — PARTIAL

Specs tab is built with real data. Six of fifteen tabs are stub/missing.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Specifications | Built | Built — form fields editable with save |
| Address | Built | Missing |
| Departments | Built | Stub — "coming soon" |
| Scopes | Built | Built |
| Repairs | Built | Built |
| Notes | Built | Built |
| Amendments | Built | Stub — "coming soon" |
| Renewal | Built | Stub — "coming soon" |
| Invoices | Built | Built |
| Affiliates | Built | Missing |
| Documents | Built | Built |
| Expense Trending | Built | Missing |
| Report Card | Built | Missing |
| Commission Rates | Built | Missing |
| Activity | Built | Missing |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Address tab | Tab | Bill To + Ship To forms with "Same as Bill To" toggle; Name, Name 2 (Attn/Dept), Address, City, State, Zip | High |
| Departments tab | Tab | Linked departments on this contract with add/remove | High |
| Amendments tab | Tab | Amendment history with date, type, description; create new amendment | High |
| Renewal tab | Tab | Renewal workflow: proposal generation, date tracking, auto-renew toggle status | High |
| Affiliates tab | Tab | Affiliated facilities sharing this contract | Med |
| Expense Trending tab | Tab | Month-by-month expense vs. contract value chart/table | Med |
| Report Card tab | Tab | Performance report generator (same as Clients Report Card tab) | Med |
| Commission Rates tab | Tab | Commission rate schedule by sales rep | Med |
| Activity tab | Tab | Audit log of contract changes | Low |
| Rename button | Button | Renames the contract | Low |
| Generate CSA button | Button | Generates the Customer Service Agreement document | High |
| Contract Types button | Button | Manages available contract types | Med |
| Extract button | Button | Exports contract data | Med |
| Module-level tabs: Invoices, Reports, Model Contract Costs, Pending Contracts | Tabs | Top-level navigation between contract views | High |
| Health factors panel (Expense Multiplier, etc.) | UI | Visual health gauges for contract profitability | Med |
| Contract filter chips (Active, Expiring, Expired) | Filter | Click-to-filter stat chips in list | Med |

---

## Inventory — PARTIAL

Inventory, Sizes, Purchase Orders, and Suppliers tabs are built. Receive Inventory tab is missing.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Inventory | Built | Built |
| Purchase Orders | Built | Built |
| Receive Inventory | Built | Missing |
| (Suppliers — per item) | Built | Built |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Receive Inventory tab | Tab | Split panel: left = list of items to receive; right = receive form with quantity, lot, bin assignment | High |
| Item flags (Active, Large Diameter, Not Used For Repair, No Count Adjustment, Skip Pick List) | Toggles | Per-item boolean flags in the detail panel | Med |
| Export Items, Import Items, Export Sizes, Import Sizes, Export Lots | Buttons | Bulk import/export operations | Med |
| Low Stock filter | Button | Toggles filter to show only items below minimum quantity | Med |
| Size modal sub-actions: Suppliers, Lots, Build | Buttons | Per-size detail buttons for supplier links, lot history, build orders | Low |
| Size detail form: Bin, Cost, Min/Max/Reorder levels, Scan Required, Always Reorder, Skip Pick List | Fields | Per-size fields in right panel | High |

---

## Quality — PARTIAL

QC Inspections, Non-Conformances, and CAPA Log are built. Rework Tracking and Reports tabs are stubs.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| QC Inspections | Built | Built |
| Non-Conformances | Built | Built |
| CAPA Log | Built | Built |
| Rework Tracking | Built | Stub/missing content |
| Reports | Built | Stub/missing content |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Rework Tracking tab | Tab | Table of rework orders with WO#, description, reason, status | Med |
| Reports tab | Tab | Quality-specific report generation (defect rates, first-pass yield trends) | Med |
| NCR — New NCR button | Button | Creates a Non-Conformance Report | Med |
| NCR severity filter (Minor/Major/Critical) | Filter | Segment filter on NCR list | Med |
| NCR status filter (Open/Under Review/Closed) | Filter | Segment filter on NCR list | Med |
| CAPA — New CAPA button | Button | Creates a Corrective/Preventive Action | Med |
| CAPA type filter (Corrective/Preventive) | Filter | Segment filter | Med |
| Export to CSV button | Button | Present in HTML for inspections tab | Low |

---

## Loaners — PARTIAL

Task Loaners tab with Requests workflow is built. Active Loaners and Scope Needs sub-tabs are not surfaced in React.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Task Loaners | Built | Built |
| Active Loaners | Built | Missing as separate view |
| Scope Needs | Built | Missing |
| Requests | Built | Built |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Active Loaners sub-tab | Tab | Table of all loaners currently out (different columns from Task Loaners) | High |
| Scope Needs sub-tab | Tab | Recommendation table: scopes needing loaners based on repair TAT predictions | High |
| Fill Rate stat chip | Stat | Percentage of loaner requests fulfilled | Med |
| Bulk update selected requests | Button | Select multiple requests → Fulfill All / Decline All | Med |
| Export to CSV | Button | Present in HTML toolbar | Low |

---

## Financial — PARTIAL

Outstanding, Drafts, Hold, Payments, GL Accounts tabs are built. At Risk and Trending are stubs.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Outstanding Invoices | Built | Built |
| Drafts | Built | Built |
| Clients on Hold | Built | Built |
| Invoice Payments | Built | Built |
| GL Accounts | Built | Built |
| At Risk | Built | Stub — "coming soon" |
| Trending | Built | Stub — "coming soon" |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| At Risk tab | Tab | Department profitability analysis; expense toggles (outsource, GPO, inventory, commissions, shipping, labor); min invoices filter; summary-by selector | High |
| Trending tab | Tab | Date range + repair detail/client/department filters; expense/revenue trend table | High |
| New Invoice button | Button | Creates a new invoice | High |
| Outstanding — inline action buttons (per row) | Buttons | Void, Email, Print per invoice | High |
| Drafts — Delivery Method and GP ID columns | Columns | Present in HTML, not in React column defs | Med |

---

## Suppliers — MINOR

All 4 tabs built with real data. Minor gaps in main tab.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Supplier type filter chips (Parts/Repair/Acquisition/Carts) | Filter | Segment buttons to filter list by supplier role | Low |
| Active/Inactive toggle | Filter | Show only active suppliers | Low |
| Role toggles in main form (Parts, Repair, Acquisition, Carts) | Toggles | Supplier role assignments | Med |
| Min Order, GP Vendor ID, Supplier Level, Default PO Type fields | Fields | Business-specific supplier fields | Med |
| Alternate contact section (Alt Contact, Alt Phone, Alt Email, Alt Email Name) | Fields | Second contact on supplier record | Low |

---

## Scope Models — PARTIAL

Specs, Repair Items, Max Charges tabs are built. Inventory and Flags tabs are stubs.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Specifications | Built | Built |
| Repair Items | Built | Built |
| Inventory | Built | Stub — "coming soon" |
| Flags | Built | Stub — "coming soon" |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Inventory tab | Tab | Inventory items linked to this scope model | Med |
| Flags tab | Tab | Flags associated with this scope model type | Med |
| Context menu actions: Clone Model, Print Spec Sheet, Deactivate, Delete | Actions | Right-click context menu on list rows | Low |
| List table columns: Repair Items count, Linked Parts count, Avg TAT, Avg Contract Rate, Flags count | Columns | HTML shows these in main list; React has partial subset | Med |

---

## Instruments — PARTIAL

Instrument Repairs and Quotes page-tabs are built. Instrument Catalog tab is built. Detail drawer tabs (QC, Outsource, Comments, History, Financials) are partially present.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Instrument Repairs (page tab) | Built | Built |
| Instrument Quotes (page tab) | Built | Built |
| Instrument Catalog (page tab) | Built | Built |
| Detail — Instruments | Built | Built |
| Detail — Order Info | Built | Built |
| Detail — QC | Built | Not clearly mapped |
| Detail — Outsource | Built | Not clearly mapped |
| Detail — Comments | Built | Not clearly mapped |
| Detail — History | Built | Not clearly mapped |
| Detail — Financials | Built | Not clearly mapped |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Detail drawer — QC tab | Tab | Pass/fail checklist per instrument | Med |
| Detail drawer — Outsource tab | Tab | Outsource vendor, cost, and items table | Med |
| Detail drawer — Comments tab | Tab | Notes/comments on the order | Low |
| Detail drawer — History tab | Tab | Audit history of order changes | Low |
| Detail drawer — Financials tab | Tab | Revenue and expense breakdown for order | Med |

---

## Onsite Services — MINOR

Main list and Overview detail tab are built. Trays, Expenses, Documents detail tabs are present in HTML but not clearly implemented.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Detail — Trays tab | Tab | Per-visit tray contents with editable instrument grid (item description, manufacturer, model, serial, condition) | High |
| Detail — Expenses tab | Tab | Expense breakdown for the visit | Med |
| Detail — Documents tab | Tab | Upload/view documents for the visit | Low |
| Submit for invoicing button | Button | Transitions status from Draft to Submitted | High |

---

## Acquisitions — MINOR

All three tabs (In-House, Consigned, Sold) built with real data and pagination.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Add/Receive new acquisition | Button | Creates a new in-house acquisition record | High |
| Row click → detail drawer | Action | HTML opens a detail panel with full acquisition info; React currently no detail view | High |
| Condition column in list | Column | HTML shows psCondition; verify it is in React column defs | Low |

---

## Product Sales — MINOR

Main list and detail drawer (Overview, Line Items, Documents tabs) built.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Detail — Line Items tab editable grid | Form | Add/edit/remove line items inline with SKU, qty, unit price | High |
| Detail — Documents tab | Tab | Upload/view order documents | Low |
| New Product Sale order | Button | Create new product sale record | High |
| Print/Export invoice | Button | Generate PDF invoice for order | Med |

---

## Outsource Validation — MINOR

List and detail drawer (Overview, Cost Breakdown, Documents tabs) built.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Cost Breakdown tab | Tab | Per-component vendor cost vs. in-house estimate table | Med |
| Documents tab | Tab | Supporting documents for the outsource order | Low |
| Margin columns (Margin $, Margin %) | Columns | Calculated profitability columns in list | Med |

---

## Reports — MINOR

Report catalog with categories, search, favorites, and Run/Extract buttons is built.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Actual report execution | Workflow | HTML runs reports and renders results in-page; React version likely only shows catalog | High |
| Favorites toggle | Button | Show only favorited reports | Low |
| Last Run tracking | Data | "Last run N days ago" label on each report card | Low |

---

## Administration — MINOR

All core and business-config tabs (Staff/Users, Security Groups, Pricing Lists, plus business/product/HR categories) are built with data.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Repair Reasons tab | Tab | CRUD for repair reason lookup values | Med |
| Repair Statuses tab | Tab | CRUD for repair status lookup values | Med |
| Standard Depts tab | Tab | Standard department name templates | Low |
| Cleaning Systems tab | Tab | Reprocessing equipment lookup | Low |
| Sales Rep Reassignment | Tab | Bulk reassign repairs from one rep to another | Med |
| Bonus Pools | Tab | Commission/bonus pool configuration | Low |
| Sales Tax Config | Tab | Sales tax rate management by jurisdiction | Med |
| User edit/create | Form | In HTML, users can be added/edited in a drawer; verify React has this | High |
| Security group permission matrix | Table | Checkbox matrix of permissions per group per module | High |
| Export Users to CSV | Button | Export user list | Low |

---

## Workspace — MINOR

Widget grid system is built with 8 widget types wired to real data.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Widget: Quick Links | Widget | Configurable shortcut buttons to common screens | Low |
| Edit Layout mode — drag/reorder widgets | Feature | HTML supports drag-to-reorder; React has edit mode but verify drag | Low |
| Create New Repair shortcut from workspace | Button | HTML has "New Workspace" / "Start Workspace" button to create a new work order | Med |

---

## EndoCarts — PARTIAL

Quotes and Catalog tabs are built using **hardcoded mock data** from `endoCartData.ts`. No API calls for quotes or catalog data.

### Tabs
| Tab | HTML Status | React Status |
|-----|-------------|--------------|
| Quotes | Built | Built — uses hardcoded mock data, not live API |
| Catalog | Built | Built — uses hardcoded mock data |
| Models | Built | Built — uses hardcoded mock data |

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| API-wired quotes list | Data | React uses QUOTES constant, not DB; no backend controller | High |
| API-wired catalog parts | Data | React uses CATALOG constant, not DB | High |
| API-wired cart models | Data | React uses MODELS constant, not DB | High |
| Scope Inventory tab API call | Data | React calls getEndoCartScopeInventory (may be real) | Med |
| New Quote modal | Modal | Create a new EndoCart quote | High |
| Quote detail — BOM tab | Tab | Bill of Materials for the quote | Med |

---

## Dashboard — MINOR

Unified repair table with real data, stat strip, and toolbar filters are built.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Scope Type filter (All/Flexible/Rigid/Instrument/Camera/Carts) | Filter | Segment buttons filtering the repair table | Med |
| Department Size filter (Large/Small/All) | Filter | Segment button filter | Low |
| Location filter (In House/Outsourced/Hot List) | Filter | Segment button filter; shows "Outsourced" count badge | Med |
| Generate Tech Sheets button | Button | Generates technician work sheets for current filtered set | High |
| Export CSV button | Button | Exports current filtered repairs to CSV | Med |
| Print button | Button | Prints the current table view | Low |
| Quick Edit modal (row inline edit) | Modal | Click repair → small modal to edit status, tech, notes without leaving dashboard | High |
| TAT/SLA column — visual indicator | UI | HTML shows colored TAT badge (green/amber/red based on days); verify React has this | Med |
| Date Approved and Est. Delivery columns | Columns | Present in HTML; verify in React UnifiedTable columnDefs | Med |

---

## Development List — MINOR

Split-layout list + detail with Details and Activity tabs built.

### Missing Elements
| Element | Type | HTML Behavior | Priority |
|---------|------|---------------|----------|
| Activity tab content | Tab | HTML shows activity/comment thread on selected item; React tab exists but verify content | Low |
| Priority/Status/Assignee editable fields | Fields | All fields in detail pane are editable in HTML | Med |

---

## Cross-Cutting Gaps (Affect Multiple Screens)

| Element | Type | Screens Affected | Priority |
|---------|------|-----------------|----------|
| Editable Save pattern (dirty tracking + Ctrl+S) | Pattern | Clients, Departments, Repairs Scope In, Contracts Specs | High |
| Receiving page (`/receiving`) | Page | Exists in React pages but not analyzed — verify it is routed and functional | Med |
| New Work Order wizard (global) | Workflow | Dashboard, Repairs | High |
| Print buttons | Buttons | Dashboard, Repairs Outgoing, Contracts | Med |
| Export to CSV | Buttons | Quality, Loaners, Financial, Administration | Med |
| "Generate CSA" document workflow | Workflow | Contracts | High |
| Angulation data display (read + edit) | Data | Repairs Details tab (Angulation IN section shows all dashes) | High |
