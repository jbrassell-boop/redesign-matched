# Dashboard Unified Cockpit — Design Spec

**Date:** 2026-04-02
**Goal:** Replace the 11-tab Dashboard with a unified cockpit — one powerful table with a view selector toolbar. Serves processors (repair queue → click into cockpit) and managers (filters, analytics, batch operations) from the same screen.

---

## Users & Roles

**Processors:** Scan the repair table, find their WOs, click into the Repairs Cockpit. Use stat strip chips to filter by status. Use search to find specific WOs/clients/serials.

**Managers:** Use view selector to switch between Repairs, Shipping, Invoices, Flags, Emails, Tasks, Tech Bench. Use toolbar filters (type, group by) for analysis. Use batch actions for daily operations (send estimates, ship notifications).

---

## Layout

Full-width viewport. Top to bottom:

### 1. Stat Strip (always visible)
6 clickable chips using shared `StatStrip` component:

| Chip | Color | Clicks to |
|------|-------|-----------|
| Open Repairs | navy | Filter: all open |
| Urgent | red | Filter: urgent only |
| Pending QC | amber | Filter: Pending QC status |
| Ship Ready | navy | Filter: Pending Ship status |
| Shipped Today | green | Filter: shipped today |
| Received Today | muted | Filter: received today |

Clicking a chip sets the status filter on the table. Clicking the active chip clears the filter.

### 2. Unified Toolbar

Single row with:

**View selector** (segmented button group, left):
- Repairs (default)
- Shipping
- Invoices
- Flags
- Emails
- Tasks
- Tech Bench

Switching view changes the table columns, data source, and available filters.

**Separator**

**Type filter** (segmented, Repairs view only):
- All | Flexible | Rigid

**Group By** dropdown (Repairs view only):
- None | Client | Status | Tech | Scope Type

**Flex spacer**

**Search** input: "Search WO, client, serial..." (debounced 300ms)

**Action buttons** (right):
- Export CSV
- Print

**Batch action buttons** (appear when rows are selected):
- View-specific: "Send Estimates" (Emails view), "Mark Shipped" (Shipping view), etc.

### 3. Data Table (remaining viewport, scrollable)

Uses shared `DataTable` component with view-specific columns:

**Repairs view columns:**
| Column | Width | Notes |
|--------|-------|-------|
| (expand) | 32px | Arrow to expand detail row |
| Date In | 80px | Formatted date |
| Client | flex | Client name |
| Dept | 120px | Department name |
| WO# | 100px | Clickable → navigates to Repairs Cockpit |
| Scope Type | 120px | Scope type name |
| Serial # | 100px | Serial number |
| TAT | 60px | Days, color-coded (green <7, amber 7-14, red >14) |
| Status | 110px | StatusBadge |
| Amount | 90px | Currency, right-aligned |
| Tech | 60px | Technician initials |

Urgent rows: 3px red left border.

Row expansion: Shows complaint/notes inline below the row.

**Shipping view columns:**
| Column | Notes |
|--------|-------|
| WO# | Clickable → cockpit |
| Client | Name |
| Status | Ship Ready / Shipped / etc. |
| Ship Date | Date |
| Tracking # | Tracking number |
| Weight | Ship weight |
| Delivery | Service level |

**Invoices view columns:**
| Column | Notes |
|--------|-------|
| Invoice # | Invoice number |
| WO# | Clickable → cockpit |
| Client | Name |
| Status | Draft / Invoiced / Paid |
| Amount | Currency |
| Date | Invoice date |

**Flags view columns:**
| Column | Notes |
|--------|-------|
| WO# | Clickable → cockpit |
| Client | Name |
| Flag Type | Category |
| Flag | Description |
| Visible on D&I | Yes/No badge |

**Emails view columns:**
| Column | Notes |
|--------|-------|
| Date | Sent/pending date |
| Type | Estimate / Approval / Ship Notification |
| WO# | Clickable → cockpit |
| Client | Name |
| To | Recipient |
| Status | Sent / Pending / Failed badge |

**Tasks view columns:**
| Column | Notes |
|--------|-------|
| Priority | Dot (red/amber/blue/gray) |
| Task | Description |
| WO# | Clickable → cockpit (if linked) |
| Assigned | User name |
| Due | Date, color-coded |
| Status | Open / Complete badge |

**Tech Bench view columns:**
| Column | Notes |
|--------|-------|
| WO# | Clickable → cockpit |
| Client | Name |
| Scope | Model + Serial |
| Tech | Assigned technician |
| Status | Current repair status |
| TAT | Days |
| Urgency | Dot indicator |

### 4. Footer

- Left: "Showing X of Y records"
- Right: Page size selector (25/50/100) + pagination controls

---

## Interactions

**Stat chip click:** Sets status filter on Repairs view. Auto-switches to Repairs view if on another view.

**View switch:** Changes table columns and data source. Preserves search text. Clears view-specific filters.

**Row click (Repairs view):** Navigates to `/repairs/:repairKey` (Repairs Cockpit).

**Row expand (Repairs view):** Toggles inline detail row showing complaint text and notes.

**Batch selection:** Checkbox column appears. Selected count shown in toolbar. View-specific batch action buttons appear.

**Group By (Repairs view):** Groups table rows with collapsible group headers showing group name + count.

---

## API Endpoints

Existing endpoints cover most views:
- `GET /dashboard/stats` — stat strip (exists)
- `GET /dashboard/repairs` — repairs view (exists, add type/groupBy params)
- `GET /dashboard/shipping` — shipping view (exists)
- `GET /dashboard/invoices` — invoices view (exists)
- `GET /dashboard/flags` — flags view (exists)
- `GET /dashboard/emails` — emails view (exists)
- `GET /dashboard/tasks` — tasks view (exists)
- `GET /dashboard/techbench` — tech bench view (exists)

**New/modified:**
- `GET /dashboard/repairs` — add `type` param (Flexible/Rigid/All), `groupBy` param
- `POST /dashboard/emails/batch-send` — batch send estimates/notifications (future)

---

## Out of Scope

- Email sending infrastructure (batch action buttons exist but don't send yet)
- Real-time updates (no WebSocket)
- Saved filter presets
- Custom column visibility
