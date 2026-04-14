# Middleware & Auth Reference

---

## Auth Pattern

### Frontend

Token stored in `sessionStorage` under key `tsi_token`.

```typescript
// client/src/api/client.ts — the Axios instance used by all API modules
import apiClient from './client';   // import this, not axios directly

getToken()    // returns token string or null
setToken(t)   // writes to sessionStorage
removeToken() // clears sessionStorage
```

**Request interceptor** (automatic): attaches `Authorization: Bearer <token>` to every request.

**Response interceptor** (automatic): on 401 → clears token + redirects to `/login`.

**Route protection**: `client/src/components/common/RouteGuard.tsx` — wrap any protected route; redirects to `/login` if no token.

### Backend

JWT Bearer authentication in `Program.cs`. Token validated with HS256. Secret is in App Service env var (not in source).

```csharp
// All protected controllers use:
[Authorize]
public class XxxController(IConfiguration config) : ControllerBase { ... }

// Auth controller issues tokens:
// POST /api/auth/login → { token: "..." }
// POST /api/auth/logout
```

---

## Environment Variables

| Variable | Required | Where | Purpose |
|----------|----------|-------|---------|
| `VITE_API_BASE_URL` | Yes | `client/.env` | API base URL (e.g. `http://localhost:5000/api` for local, Azure URL for prod) |
| `ConnectionStrings__DefaultConnection` | Yes | Azure App Service env | Azure SQL connection string (not in source) |
| JWT secret | — | Azure App Service env | HS256 signing key (not in source) |

Local dev: `VITE_API_BASE_URL` — Vite proxies `/api` → `http://localhost:5000` automatically (see `vite.config.ts`), so you can leave this blank for local dev.

---

## CORS

Configured in `server/TSI.Api/Program.cs`. Allowed origins:
- `http://localhost:5173` (Vite dev)
- `http://localhost:5176` (alternate dev port)
- `https://happy-plant-03638db0f.6.azurestaticapps.net` (production)

---

## .NET Pipeline (Program.cs order)

1. Exception handler (custom JSON error responses)
2. HTTPS redirection
3. CORS (`AllowSpecificOrigins`)
4. Authentication (JWT Bearer)
5. Authorization
6. Controller endpoint mapping

---

## Azure SQL Connection

- Server: `tsi-sql-jb2026.database.windows.net`
- Database: `WinscopeNet`
- Auth: SQL login `tsiadmin` (password in App Service env)
- Local dev: `Trusted_Connection=True` on `localhost` only

**Production read-only servers** (never write):
- `10.0.0.15\Goldmine` (APP01 — WinScopeNet legacy)
- `TSSAPP02` / `192.168.20.6` (Nashville South)

---

## SPA Routing (Azure Static Web Apps)

`staticwebapp.config.json` must keep `navigationFallback` set — required for React Router deep links to work on Azure. Do not remove this.

---

## DB Schema Reference

Before writing any SQL column name, verify it exists:
```
C:/Projects/tsi-redesign/tasks/db-schema-dump.json
```
Trace join chains — many fields live on related tables, not the primary table in a query.

---

_Last updated: 2026-04-09_
