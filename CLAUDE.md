# redesign-matched — Claude Instructions

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

## Screens Built (Phases 1–3)

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

**Phase 4 screens not started**: Loaners, Financial, Suppliers, Scope Model, Instruments, Onsite Services, Acquisitions, Product Sale, Outsource Validation, Reports, Administration, Workspace, EndoCarts, Development List

Nav items for all of the above exist in `client/src/components/shell/navItems.ts` but have no routes or pages yet.

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

## Known Gotchas

- `tblClient` has NO email or contact name columns — those fields return null
- `tblDepartment` contact: `sContactFirst`, `sContactLast`, `sContactPhoneVoice`, `sContactEMail` (EMail not Email)
- `staticwebapp.config.json` must have `navigationFallback` for SPA deep-link routing on Azure
- Verify all SQL column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` before writing queries

---

## Git Workflow

- Commit locally freely
- Push triggers both CI/CD pipelines automatically
- Auto-push after any API/query/data fix; push other changes only when Joe asks
- `deploy-server.yml` path filter is `server/**` — workflow_dispatch needed for workflow-only changes
