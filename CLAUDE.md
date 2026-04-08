# redesign-matched — Claude Instructions

> **Start here:** Read `.codesight/CODESIGHT.md` (and `.codesight/wiki/index.md`) before exploring the tree — it contains a pre-computed project map, import graph, hot files, and architecture summary so you don't have to rediscover everything.

## What this repo is

Full-stack rewrite of TSI WinScope from vanilla HTML/JS into:
- **Frontend**: React 19 + TypeScript + Ant Design 5 (Vite)
- **Backend**: ASP.NET Core 8 Web API (C#, raw SqlClient — no EF Core)
- **Database**: Azure SQL — `tsi-sql-jb2026.database.windows.net` / WinscopeNet
- **Visual reference**: `C:/Projects/tsi-redesign` — the old HTML pages are the design spec

The goal is for every screen in redesign-matched to visually match its counterpart in tsi-redesign while running on the new stack.

---

## Repo Structure

```
redesign-matched/
├── client/src/
│   ├── api/               # one file per domain: clients.ts, repairs.ts, etc.
│   ├── components/shell/  # AppShell, Sidebar, Topbar, navItems.ts, RouteGuard
│   ├── pages/             # one folder per screen (XxxPage, XxxList, XxxDetailPane, types.ts)
│   ├── theme/             # antdTheme.ts (Ant Design token overrides) + tokens.css (CSS vars)
│   └── router.tsx         # React Router v7
├── server/TSI.Api/
│   ├── Controllers/       # one controller per domain
│   ├── Models/            # C# records per domain
│   └── Program.cs
└── scripts/
    └── migrate-data.ps1   # BCP migration: local SQL → Azure SQL
```

---

## Deployment

| Target | Service | Trigger |
|--------|---------|---------|
| Frontend | Azure Static Web Apps | push to main (`.github/workflows/deploy-client.yml`) |
| Backend | Azure App Service `tsi-redesign-matched-api` | push to main (`.github/workflows/deploy-server.yml`) |

- Azure connection string is in App Service env var `ConnectionStrings__DefaultConnection` — NOT in source
- `clean: true` is required on the deploy step — prevents BadImageFormatException from overlapping deploys
- Frontend URL: `https://happy-plant-03638db0f.6.azurestaticapps.net`

---

## Screens Built (All Phases Complete)

### Phase 1–3

| Screen | Route | Status |
|--------|-------|--------|
| Login | /login | Complete |
| Dashboard | /dashboard | Complete — StatStrip + repair table |
| Repairs | /repairs | Complete — split-layout, 6 tab stubs |
| Clients | /clients | Complete — split-layout, 4 tab stubs |
| Departments | /departments | Complete — split-layout, 4 tab stubs |
| Contracts | /contracts | Complete — split-layout, Specs tab wired, 6 stubs |
| Inventory | /inventory | Complete — split-layout, Inventory + Sizes tabs wired |
| Quality | /quality | Complete — full-width, QC Inspections tab wired |

### Phase 4 (built 2026-04-02 via agent team)

| Screen | Route | Status |
|--------|-------|--------|
| Loaners | /loaners | Complete — split-layout, tab stubs |
| Financial | /financial | Complete — split-layout, tab stubs |
| Suppliers | /suppliers | Complete — split-layout, tab stubs |
| Scope Models | /scope-models | Complete — split-layout, tab stubs |
| Instruments | /instruments | Complete — split-layout, tab stubs |
| Onsite Services | /onsite-services | Complete — split-layout, tab stubs |
| Acquisitions | /acquisitions | Complete — split-layout, tab stubs |
| Product Sales | /product-sales | Complete — split-layout, tab stubs |
| Outsource Validation | /outsource-validation | Complete — split-layout, tab stubs |
| Reports | /reports | Complete — full-width layout |
| Administration | /administration | Complete — full-width layout |
| Workspace | /workspace | Complete — split-layout, tab stubs |
| EndoCarts | /endocarts | Complete — split-layout, tab stubs |
| Development List | /development-list | Complete — full-width layout |

All nav items wired. Shell rewritten in plain CSS (no Ant Design Layout) to match reference design.

---

## Azure SQL — Migration Complete (2026-04-02)

All 18 tables migrated with full production data. Migration ran in ~41 minutes, 18/18 succeeded.

Re-run one table if needed: `.\scripts\migrate-data.ps1 -AzurePassword "p@ss" -Tables "tblRepair" -SkipTruncate`
Reuse exports: `.\scripts\migrate-data.ps1 -AzurePassword "p@ss" -SkipExport`

**Migration tables (3 tiers, 18 tables):**
- Tier 1 (lookups): tblRepairStatuses, tblServiceLocations, tblRepairLevels, tblDeliveryMethod, tblRepairReasons, tblPaymentTerms, tblPricingCategory, tblManufacturers, tblScopeTypeCategories
- Tier 2 (core): tblSalesRep, tblScopeType, tblClient, tblTechnicians, tblDepartment, tblScope, tblRepairItem
- Tier 3 (txn): tblRepair, tblRepairItemTran

---

## Coding Patterns

### Backend controller
```csharp
[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);
}
```
- Always `await using` for SqlConnection and SqlCommand
- Pagination via `OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`
- Models are C# `record` types
- Stats always on a separate `/stats` route

### Frontend API client
```typescript
// client/src/api/clients.ts
import apiClient from './client';
export const getClients = (params) => apiClient.get('/clients', { params });
export const getClientStats = () => apiClient.get('/clients/stats');
```

### Page structure (split-layout screens)
```
XxxPage.tsx        — container: global stat strip + split layout
XxxList.tsx        — 260–320px left panel: search, list items, collapse toggle
XxxDetailPane.tsx  — right panel: header + tab bar + tab content panels
types.ts           — TypeScript interfaces matching backend models
```

---

## Design System Rules

**All colors must use CSS variables — zero hardcoded hex in .tsx files.**

Key tokens (defined in `client/src/theme/tokens.css`):
```
--primary: #2E75B6      --navy: #1B3A5C         --sidebar: #1E293B
--danger: #B71234       --success: #16A34A      --warning: #F59E0B
--neutral-50/200/900    --muted: #6B7280        --card: #fff
--border: #E5E7EB       --border-dk: #B8C8E0    --primary-light: #E8F0FE
```

RGB tokens for rgba() usage (can't use CSS vars inside rgba()):
```
--primary-rgb: 46, 117, 182
--danger-rgb: 183, 18, 52
--amber-rgb: 245, 158, 11
--navy-rgb: 27, 58, 92
--success-rgb: 22, 163, 74
--muted-rgb: 107, 114, 128
```
Usage: `rgba(var(--primary-rgb), 0.13)` — NOT `rgba(var(--primary), 0.13)`

**Component standards:**
- Split left panel: selected row = `borderLeft: '2px solid var(--amber)'` + `background: '#FEF3C7'`
- Stat strip chips: `iconBg` uses rgba with rgb token; `iconColor` uses CSS var; `valueColor` uses CSS var
- Tab active: 2px bottom border + `var(--primary)` color + 600 weight, no background fill
- Drawer width: 600px universal; header = `var(--primary-dark)` bg
- Ant Design theme: `fontSize: 13`, `controlHeight: 32` — see `client/src/theme/antdTheme.ts`

---

## Mandatory Agent Rules

These apply to every agent working in this repo — no exceptions.

### 1. SQL Column Verification
Before writing any SQL column reference, confirm the column exists on the correct table in:
`C:/Projects/tsi-redesign/tasks/db-schema-dump.json`

- Never assume a column exists — look it up
- Trace the join chain: know which table alias owns each field
- Columns often exist on a related table (e.g. `dblDiscountPct` is on `tblClient`, not `tblRepair`)
- When uncertain, use `NULL AS columnName` as a placeholder and flag it — a wrong column name that compiles but fails at runtime against Azure SQL is worse than a null

### 2. No Silent Error Swallowing
Never use `.catch(() => {})` in frontend API calls. Always surface failures:
```typescript
// ✗ Wrong — hides real problems
.catch(() => {})

// ✓ Right — user sees the failure
.catch(() => message.error('Failed to load data'))
```

### 3. Live Smoke Test After Every Deploy
Green pipeline ≠ working feature. After any push that triggers a deploy:

**Backend:** Hit the real Azure API endpoint with a known record key and confirm real data returns.
```bash
curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/repairs/577712/full"
```

**Frontend:** Load `https://happy-plant-03638db0f.6.azurestaticapps.net`, navigate to the changed screen, click into a real record, confirm it renders.

**The task is not done until the live environment is confirmed working.**

### 4. TypeScript Unused Imports
TS6133/TS6196 errors fail the Azure deploy pipeline. After any file change, run:
```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Remove all unused imports before committing.

---

## Known Gotchas

- **Company name is "Total Scope Inc." (TSI)** — NEVER use "Technical Services Inc." anywhere in the codebase. All forms, headers, footers must say "Total Scope Inc."
- `tblClient` has NO email or contact name columns — those fields return null
- `tblDepartment` contact: `sContactFirst`, `sContactLast`, `sContactPhoneVoice`, `sContactEMail` (EMail not Email)
- `staticwebapp.config.json` must have `navigationFallback` for SPA deep-link routing on Azure
- Verify all SQL column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` before writing queries
- `tblRepair` has triggers — use `DISABLE TRIGGER ALL ON tblRepair` before INSERT, re-enable after. Same for `tblScope`
- `tblRepair.sRequisition` column does NOT exist — use `NULL AS sRequisition` placeholder

---

## Git Workflow

- Commit locally freely
- Push triggers both CI/CD pipelines automatically
- Auto-push after any API/query/data fix; push other changes only when Joe asks
- `deploy-server.yml` path filter is `server/**` — workflow_dispatch needed for workflow-only changes


# redesign-matched — Project Context

**Stack:** raw-http | none | javascript

0 routes | 0 models | 1 env vars | 545 import links


**High-impact files** (change carefully):
- client\src\pages\repairs\types.ts (imported by 45 files)
- client\src\api\client.ts (imported by 33 files)
- client\src\api\repairs.ts (imported by 25 files)
- client\src\pages\clients\types.ts (imported by 20 files)
- client\src\pages\contracts\types.ts (imported by 16 files)

**Required env vars:** VITE_API_BASE_URL

---

## Instructions for Claude Code

### Two-Step Rule (mandatory)
**Step 1 — Orient:** Use wiki articles to find WHERE things live.
**Step 2 — Verify:** Read the actual source files listed in the wiki article BEFORE writing any code.

Wiki articles are structural summaries extracted by AST. They show routes, models, and file locations.
They do NOT show full function logic, middleware internals, or dynamic runtime behavior.
**Never write or modify code based solely on wiki content — always read source files first.**

Read in order at session start:
1. `.codesight/wiki/index.md` — orientation map (~200 tokens)
2. `.codesight/wiki/overview.md` — architecture overview (~500 tokens)
3. Domain article (e.g. `.codesight/wiki/auth.md`) → check "Source Files" section → read those files
4. `.codesight/CODESIGHT.md` — full context map for deep exploration

Routes marked `[inferred]` in wiki articles were detected via regex — verify against source before trusting.
If any source file shows ⚠ in the wiki, re-run `npx codesight --wiki` before proceeding.

Or use the codesight MCP server for on-demand queries:
   - `codesight_get_wiki_article` — read a specific wiki article by name
   - `codesight_get_wiki_index` — get the wiki index
   - `codesight_get_summary` — quick project overview
   - `codesight_get_routes --prefix /api/users` — filtered routes
   - `codesight_get_blast_radius --file src/lib/db.ts` — impact analysis before changes
   - `codesight_get_schema --model users` — specific model details

Only open specific files after consulting codesight context. This saves ~16,447 tokens per conversation.
