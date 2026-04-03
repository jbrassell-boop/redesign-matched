# Clients Config — Design Spec

**Date:** 2026-04-02
**Goal:** Redesign the Clients screen as a configuration hub for account managers to manage client records — pricing, contacts, flags, and department relationships. Not a daily-driver screen; processors see client context in the Repairs Cockpit sidebar.

---

## Users & Purpose

**Primary users:** Account managers / admin staff who set up and maintain client records.

**Use cases:**
- Add/edit client information (address, phone, billing)
- Manage contacts (who receives estimates, who approves work)
- Set pricing tiers and payment terms
- Configure client flags (PO required, credit hold, GPO member, etc.)
- View department list and drill into department config
- Review client-level metrics (revenue, open repairs, scope count)

---

## Layout

Split-pane: 280px left list panel + flex right detail panel (current layout is correct for a config screen).

### Left Panel (280px)
- Search bar at top (debounced)
- "New Client" button
- Scrollable client list
- Each item: client name, city/state, active badge, open repairs count
- Selected item: amber left border + highlight background
- Collapsible via toggle button

### Right Panel (flex)

**Toolbar row:**
- Client name (large, bold)
- Client ID badge (#3502)
- Active/Inactive toggle
- Save indicator (Ready / Unsaved / Saving / Saved)
- Save button (Ctrl+S shortcut)
- Overflow menu: Deactivate, Delete (with confirmation modals)

**KPI Strip (7 chips):**
| Chip | Color | Value |
|------|-------|-------|
| Status | green/red | Active/Inactive |
| Rep | navy | Sales rep name |
| Pricing | blue | Pricing category name |
| Terms | blue | Payment terms name |
| Revenue YTD | green | Dollar amount |
| Open Repairs | amber/navy | Count |
| Scopes | navy | Count |

**Tab bar + tab content below**

---

## Tabs

### Info Tab (default)
Two-column form layout with inline editing:

**Left column:**

*Company Information* section card:
- Company Name (editable)
- Address 1, Address 2
- City, State, Zip
- Phone, Fax

*Billing Information* section card:
- Billing Email
- Payment Terms (dropdown)
- Pricing Category (dropdown)
- Sales Rep (dropdown)

**Right column:**

*Account Settings* section card:
- Customer Since (date, read-only)
- Contract Number
- Distributor (dropdown)
- GPO flag (toggle)
- New Customer flag (toggle)

All fields editable inline — click to edit, tab between fields. Changes tracked as "Unsaved" in the save indicator until Save is clicked.

### Contacts Tab
Table of client contacts with inline add/edit:

| Column | Notes |
|--------|-------|
| Name | First + Last |
| Title/Role | Free text |
| Phone | Formatted |
| Fax | Formatted |
| Email | Clickable mailto |
| Primary | Star icon — one contact marked primary (used by cockpit sidebar) |
| Active | Toggle |

- "Add Contact" button above table
- Row click → inline edit mode (fields become editable in place)
- Delete via row action menu

### Departments Tab
Table of departments linked to this client:

| Column | Notes |
|--------|-------|
| Name | Clickable → navigates to Department Config |
| Service Location | Location name |
| Active | Badge |
| Scopes | Count |
| Open Repairs | Count |

- "Add Department" button
- Row click navigates to `/departments/:deptKey`

### Flags Tab
Table of client-level flags with inline management:

| Column | Notes |
|--------|-------|
| Flag Type | Category (Billing, Service, Quality, etc.) |
| Flag | Description text |
| Visible on D&I | Toggle (shown on D&I printout) |
| Visible on Blank | Toggle |
| Active | Toggle |

- "Add Flag" button opens a row in edit mode
- Inline editing for all fields
- These flags appear in the Repairs Cockpit flags bar

### Repair History Tab
Table of all repairs for this client:

| Column | Notes |
|--------|-------|
| WO# | Clickable → opens Repairs Cockpit |
| Date In | Formatted date |
| Status | StatusBadge |
| Department | Name |
| Scope Type | Name |
| Serial # | Number |
| TAT | Days, color-coded |
| Amount | Currency |

- KPI strip at top: Total Repairs, Open, Avg TAT, Total Revenue
- Search/filter in table header
- Pagination

---

## Interactions

**Save flow:** Fields tracked for dirty state. Save indicator shows "Unsaved" with amber dot when changes pending. Save button enabled. Ctrl+S shortcut. After save: "Saved" with green checkmark, fades to "Ready" after 2 seconds.

**Deactivate:** Confirmation modal — "Deactivate [Client Name]? This will hide them from active lists but preserve all history." Confirm/Cancel.

**Delete:** Confirmation modal with danger variant — "Delete [Client Name]? This cannot be undone. X repairs and X departments are linked to this client." Only available if no linked repairs exist.

**Primary contact:** Star icon on contacts table. Clicking star on a non-primary contact makes it primary (unmarks the previous one). This contact appears in the Repairs Cockpit "Send Estimate To" card.

---

## New API Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `GET /clients/{id}/full` | All client data including settings, rep, pricing, terms |
| `PUT /clients/{id}` | Update client fields (name, address, phone, settings) |
| `POST /clients` | Create new client |
| `PUT /clients/{id}/deactivate` | Soft deactivate |
| `DELETE /clients/{id}` | Hard delete (only if no linked repairs) |
| `POST /clients/{id}/contacts` | Add contact |
| `PUT /clients/{id}/contacts/{contactKey}` | Update contact |
| `PUT /clients/{id}/contacts/{contactKey}/primary` | Set as primary contact |
| `DELETE /clients/{id}/contacts/{contactKey}` | Remove contact |
| `POST /clients/{id}/flags` | Add flag |
| `PUT /clients/{id}/flags/{flagKey}` | Update flag |
| `DELETE /clients/{id}/flags/{flagKey}` | Remove flag |
| `GET /clients/{id}/repairs` | Repair history with pagination |
| `GET /clients/{id}/kpis` | Total repairs, open count, avg TAT, total revenue |

---

## Out of Scope

- Contract management (separate Contracts screen)
- Invoice generation
- Email/communication from client screen
- Client portal configuration
- Bulk client operations
