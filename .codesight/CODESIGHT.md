# redesign-matched — AI Context Map

> **Start here.** Read this file, then `.codesight/pages.md`, then the domain wiki article for your task.

---

## What This App Is

Full-stack rewrite of TSI WinScope — an endoscope repair management system for Total Scope Inc. (TSI). Replaces legacy vanilla HTML/JS with a modern React + .NET stack while visually matching the reference designs in `C:/Projects/tsi-redesign`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, React Router v7 |
| UI Framework | Ant Design 6 with custom token theme |
| HTTP Client | Axios with JWT interceptors (`client/src/api/client.ts`) |
| Backend | ASP.NET Core 8 Web API, C#, raw SqlClient (no EF Core) |
| Database | Azure SQL — `tsi-sql-jb2026.database.windows.net / WinscopeNet` |
| Auth | JWT Bearer (HS256), token stored in `sessionStorage` |
| Deploy | Azure Static Web Apps (frontend) + Azure App Service (backend) |

---

## URLs

| Environment | URL |
|-------------|-----|
| Local frontend | `http://localhost:5173` |
| Local backend | `http://localhost:5000` |
| Production frontend | `https://happy-plant-03638db0f.6.azurestaticapps.net` |
| Production API | `https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net` |

---

## Folder Structure

```
redesign-matched/
├── client/src/
│   ├── api/               # One file per domain — Axios calls to backend
│   │   └── client.ts      # Axios base + JWT interceptor (imported by ALL api files)
│   ├── components/
│   │   ├── common/        # Guards, bulk select, export, alerts, autosave
│   │   ├── inspector/     # DevInspectorPanel (dev tool for field registry)
│   │   ├── shared/        # Reusable UI primitives (DataTable, SectionCard, TabBar, etc.)
│   │   └── shell/         # AppShell, Sidebar, Topbar, navItems, CommandPalette, NewOrderWizard
│   ├── contexts/          # InspectorContext for field registry dev tool
│   ├── hooks/             # useAuth, useAlerts, useAutosave, useDensity, useTabBadges, etc.
│   ├── pages/             # One folder per screen — see pages.md for route map
│   ├── theme/
│   │   ├── tokens.css     # ALL CSS variables (colors, spacing, typography, shadows, z-index)
│   │   ├── antdTheme.ts   # Ant Design token overrides
│   │   └── hover.css      # Hover state utilities
│   ├── types/             # Shared TypeScript interfaces
│   ├── router.tsx         # All React Router routes
│   ├── App.tsx            # Root: ConfigProvider + ServiceLocationProvider + RouterProvider
│   └── main.tsx           # Entry point
│
├── server/TSI.Api/
│   ├── Controllers/       # 28 controllers, one per domain — [ApiController] + [Authorize]
│   ├── Models/            # C# record types per domain
│   ├── Data/AppDbContext.cs
│   ├── Services/JwtService.cs
│   ├── Registry/          # JSON field registry files per domain (for FieldVerifier tool)
│   └── Program.cs         # Middleware pipeline, CORS, JWT config
│
├── docs/
│   ├── field-registry/    # clients.json — field metadata for field verifier tool
│   └── superpowers/plans/ # Implementation plans
│
└── scripts/
    └── migrate-data.ps1   # BCP migration: local SQL → Azure SQL
```

---

## Key Entry Points

| Purpose | File |
|---------|------|
| React entry | `client/src/main.tsx` |
| Route definitions | `client/src/router.tsx` |
| Axios config + auth | `client/src/api/client.ts` |
| Theme/color tokens | `client/src/theme/tokens.css` |
| Ant Design overrides | `client/src/theme/antdTheme.ts` |
| Nav items list | `client/src/components/shell/navItems.ts` |
| .NET entry + middleware | `server/TSI.Api/Program.cs` |
| DB schema reference | `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` |
| Visual reference | `C:/Projects/tsi-redesign/` (old HTML pages = design spec) |

---

## Safe vs. Unsafe to Edit

| Safe to edit | Do NOT touch |
|---|---|
| `client/src/**/*.tsx`, `*.ts`, `*.css` | `client/dist/` (build output) |
| `server/TSI.Api/Controllers/`, `Models/` | `server/TSI.Api/bin/`, `obj/` (build artifacts) |
| `server/TSI.Api/Program.cs` | Prod DB: `10.0.0.15\Goldmine` or `TSSAPP02` (read-only) |
| `client/src/theme/tokens.css` | `client/node_modules/` |
| `.github/workflows/` | `staticwebapp.config.json` navigationFallback (SPA routing) |

---

## Critical Rules

1. **SQL columns** — always verify against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` before writing a query. Never assume a column exists.
2. **No silent error swallowing** — never `.catch(() => {})`. Always `message.error(...)` at minimum.
3. **No hardcoded hex colors** — all colors must use CSS variables from `tokens.css`.
4. **TypeScript unused imports** — TS6133/TS6196 break Azure deploy. Run `cd client && npx tsc --noEmit` before committing.
5. **Company name** — always "Total Scope Inc." Never "Technical Services Inc."
6. **Production DB** — never write to prod. All prod changes go via Word doc → Steve deploys.
7. **tblRepair triggers** — use `DISABLE TRIGGER ALL ON tblRepair` before INSERT, re-enable after. Same for `tblScope`.
8. **`tblRepair.sRequisition`** — column does NOT exist. Use `NULL AS sRequisition`.
9. **Calendar events** — never delete from `tblSiteServicesCalendar`. Additive only.

---

## Deployment Workflow

1. Edit locally, `cd client && npx tsc --noEmit` to check TypeScript
2. `git push origin main` → triggers both CI/CD pipelines automatically
3. `deploy-client.yml` builds Vite and deploys to Azure Static Web Apps
4. `deploy-server.yml` publishes .NET and deploys to Azure App Service (path filter: `server/**`)
5. After deploy: smoke test live endpoint + load real screen in browser
6. `deploy-server.yml` needs `workflow_dispatch` for workflow-only changes (no `server/**` file changed)

Azure backend connection string is in App Service env var `ConnectionStrings__DefaultConnection` — NOT in source.

---

## High-Impact Files (change carefully)

| File | Imported by |
|------|-------------|
| `client/src/pages/repairs/types.ts` | 45 files |
| `client/src/api/client.ts` | 33 files |
| `client/src/api/repairs.ts` | 25 files |
| `client/src/pages/clients/types.ts` | 20 files |
| `client/src/pages/contracts/types.ts` | 16 files |
| `client/src/pages/departments/types.ts` | 14 files |
| `client/src/api/departments.ts` | 13 files |
| `client/src/components/shared/StatStrip.tsx` | 12 files |

---

## Page Architecture Patterns

**Split-layout screens** (most screens): `XxxPage.tsx` → `XxxList.tsx` (260–320px left) + `XxxDetailPane.tsx` (right). Selected row: `borderLeft: '2px solid var(--amber)'` + `background: '#FEF3C7'`.

**Full-width screens**: Dashboard, Quality, Reports, Administration, Development List — full-width table layout.

**Shared UI primitives** (always use these, don't reinvent):
- `DataTable`, `SectionCard`, `DetailHeader`, `TabBar`, `StatStrip`, `StatusBadge`
- `Field`, `FormGrid`, `ModalShell`, `EmptyState`, `SplitLayout`, `PairedTable`
- Import from `client/src/components/shared/index.ts`

---

## Backend Pattern

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
- Pagination: `OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`
- Models are C# `record` types
- Stats always on a separate `/stats` route
- Nullable FK in SQL: always `ISNULL(col, 0)` — `Convert.ToInt32(DBNull.Value)` throws

---

_Last updated: 2026-04-09_
