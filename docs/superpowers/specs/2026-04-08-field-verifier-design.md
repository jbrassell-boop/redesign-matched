# Field Verifier — Design Spec
**Date:** 2026-04-08  
**Project:** TSI Portal Redesign (`redesign-matched`)  
**Author:** Joe Brassell

---

## Purpose

A standalone internal tool (React route within the existing portal client) that lets Joe systematically verify every database field in the TSI cloud portal — screen by screen, field by field — and produces developer-ready SQL artifacts committed directly to the repo. The developer (and Claude) read those artifacts to build controllers, queries, and response models correctly.

---

## Problem Being Solved

The new cloud portal pulls data from WinScope's SQL Server database. There are 10+ screens and hundreds of fields. Without a systematic process, wrong columns get mapped silently. This tool:

1. Lets Joe walk through every field with live SQL data visible
2. Produces exact, copy-paste SQL for each field
3. Commits that SQL as structured JSON to the repo so Claude and the developer always have ground truth

---

## Architecture

### Repo Location
```
redesign-matched/
  client/src/pages/FieldVerifier/         ← React UI
    index.tsx                             ← Route entry point
    VerifierCard.tsx                      ← Single field card component
    DeveloperView.tsx                     ← Developer read-only table view
  server/TSI.Api/Controllers/
    FieldVerifierController.cs            ← API: live SQL values + registry CRUD
  server/TSI.Api/Models/
    FieldRegistry.cs                      ← Model for field registry entries
  docs/field-registry/                    ← JSON output (committed to repo)
    dashboard.json
    clients.json
    repairs.json
    departments.json
    inventory.json
    contracts.json
    onsite-services.json
    product-sale.json
    financial.json
    suppliers.json
    scope-model.json
```

### Route
`/verify` — placed **outside** the `RouteGuard` block in `router.tsx` (parallel to `/login`), so no JWT auth is required to access it. Not shown in main portal nav. The `FieldVerifierController` uses `[AllowAnonymous]` to match.

---

## Field Registry JSON Schema

One file per screen. Written/updated by the API whenever Joe confirms or edits a field.

```json
{
  "screen": "Dashboard",
  "lastUpdated": "2026-04-08T10:23:00",
  "fields": [
    {
      "id": "dash_open_repairs",
      "label": "Total Open Repairs",
      "sqlTable": "RepairOrders",
      "sqlQuery": "SELECT COUNT(*) FROM dbo.RepairOrders WHERE Status = 'Open'",
      "apiEndpoint": "GET /api/dashboard",
      "responseProperty": "openRepairCount",
      "status": "confirmed",
      "notes": "",
      "verifiedAt": "2026-04-08T10:23:00",
      "verifiedBy": "Joe"
    }
  ]
}
```

**Field statuses:** `unverified` | `confirmed` | `flagged`

---

## Joe's Experience (Verifier Mode)

### Screen List Sidebar
- Lists all portal screens in order: Dashboard, Clients, Departments, Repairs, Inventory, Contracts, Onsite Services, Product Sale, Financial, Suppliers, Scope Model
- Each screen shows a colored progress pill: gray (unverified), amber (has flags), green (all confirmed)
- Click a screen to jump to its first unverified field

### Field Card (main area)
One card visible at a time:

```
┌─────────────────────────────────────────┐
│  Screen: Dashboard                       │
│  Field:  Total Open Repairs              │
│                                         │
│  SQL:    SELECT COUNT(*) FROM            │
│          dbo.RepairOrders                │
│          WHERE Status = 'Open'           │
│                                         │
│  Live Value:  47                         │
│                                         │
│  [ ✓ Confirm ]  [ ✗ Flag ]  [ ✎ Edit ] │
└─────────────────────────────────────────┘
```

- **Live Value** is fetched in real time from WinScope SQL via the API
- **Confirm** → marks confirmed, auto-advances to next field, writes JSON to repo
- **Flag** → prompts for a note, marks flagged, advances
- **Edit** → opens inline form to correct `sqlQuery`, `sqlTable`, `responseProperty`, `notes`; re-fetches live value on save; then confirm

### Progress Bar (top of page)
```
Overall: 47 / 210 fields confirmed  [████████░░░░░░░░░░░░] 22%
```

---

## Developer's Experience (Developer View)

Separate tab within `/verify`. Read-only table of all confirmed fields:

| Screen | Label | SQL Query | API Endpoint | Response Property | Status | Last Verified |
|--------|-------|-----------|-------------|-------------------|--------|---------------|

- Filterable by screen and status
- Copy button on every SQL snippet
- Export JSON button per screen (downloads the `docs/field-registry/<screen>.json` file)
- Flagged fields highlighted amber with Joe's notes visible

---

## How JSON Gets to GitHub

When Joe confirms or edits a field, the `FieldVerifierController` writes the updated `docs/field-registry/<screen>.json` file to disk. These files are part of the repo — the developer commits them as part of his normal workflow. On the developer's next Claude session, Claude reads the field registry files and uses them as ground truth for writing controllers, models, and queries.

**File path config:** The API cannot hardcode the path because it differs between machines. A `FieldRegistryPath` key in `appsettings.Development.json` holds the absolute path (e.g., `C:/Projects/redesign-matched/docs/field-registry`). The controller injects `IConfiguration` (already the project standard) and reads this key.

**Initial seeding:** Before first use, a one-time seeding script (or manual JSON files) pre-populates each screen's JSON with all known fields set to `unverified`. This gives Joe a complete queue to work through from day one.

---

## Re-Verification

Every field can be re-verified at any time:
- A "Re-verify" button appears on confirmed fields
- Triggers the same card flow for that single field
- Logs a new `verifiedAt` timestamp on confirm
- Useful after SQL schema changes or portal updates

---

## Screen Order / Field Coverage

Verification proceeds in this order, matching the portal's logical flow:
1. Dashboard
2. Clients
3. Departments
4. Repairs
5. Inventory
6. Contracts
7. Onsite Services
8. Product Sale
9. Financial
10. Suppliers
11. Scope Model

Each screen's fields are pre-populated in the registry as `unverified` entries when the app is first set up, based on the existing React components and API response models.

---

## Out of Scope

- User authentication for the verifier (internal tool, trust-based)
- Automated SQL validation (Joe confirms manually — human judgment is the point)
- Mobile layout (desktop only)
