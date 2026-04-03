# Workspace — Personal Dashboard Design Spec

**Date:** 2026-04-02
**Goal:** Build a customizable personal dashboard with a widget grid, role-based presets, morning briefing, and edit mode. Each user sees what matters to them — different from the shared operational Dashboard.

---

## Users & Purpose

Every user in the system. Workspace is their personal landing page showing their work, their stats, their priorities. Customizable per user.

---

## Layout

Full viewport height minus topbar (64px). 3-column CSS grid with 12px gap.

### Toolbar Row
- Left: "My Workspace" title (16px, 800 weight, primary-dark) + greeting ("Good morning, Sarah" — muted)
- Right: Role preset selector (dropdown: Processor / Manager / Billing / Custom) + "Edit Layout" button

### Widget Grid
3-column grid. Widgets can span 1, 2, or 3 columns. Rows auto-flow. Scrollable if content exceeds viewport.

---

## Widgets

### Morning Briefing (default: span 2)
**Header:** Dark navy background (#1B3A5C), white text. "Morning Briefing — Yesterday" + date.

**Body:** 6 stat boxes in a flex row:
| Stat | Color |
|------|-------|
| Received | navy |
| Shipped | green |
| Approved | blue |
| Revenue | green (currency) |
| Avg TAT | amber (days) |
| Overdue | red |

Each shows a large number (20px, 800 weight) + uppercase label below.

**Data source:** `GET /dashboard/briefing` — returns yesterday's aggregate stats from tblRepair.

### My Tasks (default: span 1)
**Header:** Muted with badge count.

**Body:** Task list. Each row: priority dot (red/amber/blue/gray) + task description. Clickable.

**Data source:** `GET /dashboard/tasks?assignedTo=me` — filtered to current user.

### My Repair Queue (default: span 2)
**Header:** Muted with badge counts ("4 needs attention", "12 assigned").

**Body:** Compact table: WO# (clickable → cockpit), Client, Scope, TAT (color-coded), Status (badge), Next Action (text hint).

**"Next Action" logic:** Derived from repair status:
- Received → "Print D&I"
- D&I Complete → "Build estimate"
- Pending Approval → "Follow up"
- Approved → "Assign tech"
- QC Complete → "Ship"
- Shipped → "Invoice"

**Data source:** `GET /dashboard/repairs?assignedTo=me&sort=urgency`

### Overdue / At Risk (default: span 1)
**Header:** Red background (#FEE2E2), red text. Warning icon.

**Body:** Mini list: WO# (clickable → cockpit) + TAT days (red/amber).

**Data source:** `GET /dashboard/repairs?overdue=true`

### Outstanding Invoices (available in library)
**Header:** Muted.

**Body:** 4 stat rows:
- Total Outstanding (currency, bold)
- Past Due 30+ (red)
- Past Due 60+ (red, bold)
- Invoiced This Month (green)

**Data source:** `GET /dashboard/invoices?segment=summary`

### Contracts Expiring (available in library)
**Header:** Muted.

**Body:** Mini table: Client, Expires (date), Days (badge — red if <30, amber if <60).

**Data source:** `GET /contracts/expiring`

### Analytics (default: span 2)
**Header:** Muted. "Analytics — This Month"

**Body:** 4 large stat boxes in a flex row:
- Total Repairs (navy)
- Revenue (green, currency)
- Avg TAT (blue, days)
- Avg Margin (green, percentage)

**Data source:** `GET /dashboard/analytics`

### Quick Links (default: span 1)
**Header:** Muted.

**Body:** 2x2 grid of colored buttons:
- New Repair (blue) → opens new repair flow
- Inventory (green) → /inventory
- Reports (purple) → /reports
- Clients (amber) → /clients

### Team Performance (available in library, manager preset)
**Header:** Muted.

**Body:** Table: Tech name, Repairs Completed (this week), Avg TAT, Utilization %.

**Data source:** Future — needs user/team model.

### Recent Activity (available in library)
**Header:** Muted.

**Body:** Timeline of recent events: "WO-1847 shipped", "WO-1852 received", "Estimate sent to Mercy Health". Timestamps.

**Data source:** Future — needs activity log.

---

## Role Presets

### Processor (default)
1. Morning Briefing (span 2) + My Tasks (span 1)
2. My Repair Queue (span 2) + Overdue/At Risk (span 1)
3. Analytics (span 2) + Quick Links (span 1)

### Manager
1. Morning Briefing (span 2) + Overdue/At Risk (span 1)
2. Analytics (span 2) + Outstanding Invoices (span 1)
3. Contracts Expiring (span 1) + Team Performance (span 1) + Quick Links (span 1)

### Billing
1. Morning Briefing (span 2) + Outstanding Invoices (span 1)
2. Analytics (span 2) + Contracts Expiring (span 1)
3. Quick Links (span 1)

### Custom
Whatever the user has arranged. Persists to localStorage.

---

## Edit Mode

Toggled by "Edit Layout" button.

**Active state:**
- Widgets get a dashed border outline
- Remove button (X) appears top-right of each widget
- Widget picker drawer slides in from right (300px)

**Widget picker drawer:**
- List of all available widgets (those not currently on the grid)
- Each shows: widget name + description
- "Add" button on each → adds widget to the next available grid slot

**Exiting edit mode:** Click "Done Editing" button (replaces "Edit Layout"). Layout saved to localStorage.

**v1 simplification:** No drag-and-drop reordering. Widgets add to the end. Remove and re-add to change position. Full drag support is a future polish item.

---

## Data Architecture

Each widget fetches its own data independently. No shared data store between widgets.

**Widget component interface:**
```typescript
interface WidgetConfig {
  id: string;           // unique widget type identifier
  title: string;        // display name
  defaultSpan: 1 | 2 | 3;
  component: React.ComponentType;
}
```

**Layout persistence:**
```typescript
interface WorkspaceLayout {
  preset: 'processor' | 'manager' | 'billing' | 'custom';
  widgets: Array<{ id: string; span: 1 | 2 | 3 }>;
}
// Stored in localStorage as 'tsi_workspace_layout'
```

---

## New API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /dashboard/briefing` | Yesterday's stats: received, shipped, approved, revenue, avg TAT, overdue count |

Most other data sources already exist (repairs, tasks, invoices, analytics). The briefing endpoint is the only new one needed.

---

## Out of Scope

- Drag-and-drop widget reordering (v1 uses add/remove)
- Server-side layout persistence (v1 uses localStorage)
- Team Performance widget data (needs user model)
- Recent Activity widget data (needs activity log)
- Widget resize (widgets use their preset span)
- Custom widget creation
