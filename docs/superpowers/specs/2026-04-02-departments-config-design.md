# Departments Config — Design Spec

**Date:** 2026-04-02
**Goal:** Redesign the Departments screen as a configuration hub for managing department-level settings — scopes, sub-groups, contacts, and addresses. Departments sit under clients; this screen handles the department-specific setup that feeds into the Repairs Cockpit context.

---

## Users & Purpose

**Primary users:** Account managers / admin staff who configure department records.

**Use cases:**
- Manage department address (billing and service location)
- Manage department contacts (who receives estimates for this department)
- View and manage scopes (instruments) assigned to this department
- Manage sub-groups within the department
- Review department-level repair history and KPIs

---

## Layout

Split-pane: 280px left list panel + flex right detail panel.

### Left Panel (280px)
- Search bar at top (debounced)
- Scrollable department list
- Each item:
  - Department name (bold, blue link color)
  - Client name (muted, truncated)
  - Active badge
  - Scope count badge (navy bg, white text)
- Selected item: amber left border + highlight background
- Collapsible via toggle button

### Right Panel (flex)

**Toolbar row:**
- Department name (large, bold)
- Client name (subtitle, clickable → navigates to client)
- Department ID badge
- Active/Inactive toggle
- Save indicator + Save button

**KPI Strip (5 chips):**
| Chip | Color | Value |
|------|-------|-------|
| Status | green/red | Active/Inactive |
| Client | navy | Client name |
| Scopes | navy | Count of instruments |
| Open Repairs | amber | Count |
| Avg TAT | blue | Average days in repair |

**Tab bar + tab content below**

---

## Tabs

### Info Tab (default)
Two-column address layout with inline editing:

**Left column: Billing Address**
*Billing Address* section card:
- Address 1, Address 2
- City, State, Zip
- Phone
- Contact Name, Contact Email

**Right column: Service Location**
*Service Location* section card:
- Location Name
- Address 1, Address 2
- City, State, Zip
- Phone

All fields editable inline. Changes tracked via save indicator.

### Contacts Tab
Table of department-level contacts:

| Column | Notes |
|--------|-------|
| Name | First + Last |
| Phone | Formatted |
| Email | Clickable mailto |
| Primary | Star icon — primary contact for estimates |
| Active | Toggle |

- "Add Contact" button
- Inline editing on row click
- Primary contact flows to the Repairs Cockpit "Send Estimate To" card

### Scopes Tab
Table of instruments assigned to this department:

| Column | Notes |
|--------|-------|
| Serial # | Clickable → opens scope detail drawer |
| Model | Scope model name |
| Manufacturer | Mfr name |
| Type | Flexible/Rigid (colored badge) |
| Category | Scope category |
| Active | Toggle |
| Last Repair | Date of most recent repair |

- Search bar in table header
- Row click opens a 600px scope detail drawer showing:
  - Serial #, Model, Manufacturer, Type, Category
  - Repair history for this scope (mini table)
  - Current status

### Sub-Groups Tab
Shuttle widget (dual-panel) for managing sub-groups:

**Left panel: Available sub-groups**
- List of all sub-groups not assigned to this department
- Search/filter

**Right panel: Assigned sub-groups**
- List of sub-groups assigned to this department
- Drag or button to move between panels

Simpler alternative (if shuttle is too complex for v1): simple table with "Add" button and delete action per row.

### Repairs Tab
Table of all repairs for this department:

| Column | Notes |
|--------|-------|
| WO# | Clickable → opens Repairs Cockpit |
| Date In | Formatted date |
| Status | StatusBadge |
| Scope Type | Name |
| Serial # | Number |
| TAT | Days, color-coded |
| Amount | Currency |

- KPI strip at top: Total Repairs, Open, Avg TAT, Total Revenue
- Search/filter in table header
- Pagination

---

## Interactions

**Save flow:** Same as Clients — dirty state tracking, save indicator, Ctrl+S shortcut.

**Scope detail drawer:** 600px slide-out from right. Shows scope instrument detail + repair history for that serial number. Read-only from here. Close via X button or click outside.

**Sub-groups shuttle:** Drag items between panels or use arrow buttons. Changes saved on explicit Save.

**Navigation to client:** Client name in toolbar is clickable → navigates to `/clients/:clientKey` with that client selected.

**Navigation to repair:** WO# in repairs tab is clickable → navigates to `/repairs/:repairKey`.

---

## New API Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `GET /departments/{id}/full` | All department data including both addresses |
| `PUT /departments/{id}` | Update department fields |
| `GET /departments/{id}/contacts` | Department contacts (already exists) |
| `POST /departments/{id}/contacts` | Add contact |
| `PUT /departments/{id}/contacts/{key}` | Update contact |
| `PUT /departments/{id}/contacts/{key}/primary` | Set primary contact |
| `DELETE /departments/{id}/contacts/{key}` | Remove contact |
| `GET /departments/{id}/scopes` | Scopes list (already exists) |
| `GET /departments/{id}/scopes/{scopeKey}` | Scope detail with repair history |
| `GET /departments/{id}/sub-groups` | Sub-groups (already exists) |
| `PUT /departments/{id}/sub-groups` | Update sub-group assignments (bulk) |
| `GET /departments/{id}/repairs` | Repair history with pagination |
| `GET /departments/{id}/kpis` | Total repairs, open count, avg TAT, total revenue |

---

## Out of Scope

- Scope creation/editing (instruments screen)
- Department creation (done from Clients screen)
- Contract management
- Bulk department operations
