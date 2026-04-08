# redesign-matched — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**redesign-matched** is a javascript project built with raw-http.

## Scale

1 middleware layers · 1 environment variables

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `client\src\pages\repairs\types.ts` — imported by **45** files
- `client\src\api\client.ts` — imported by **33** files
- `client\src\api\repairs.ts` — imported by **25** files
- `client\src\pages\clients\types.ts` — imported by **20** files
- `client\src\pages\contracts\types.ts` — imported by **16** files
- `client\src\pages\departments\types.ts` — imported by **14** files

## Required Environment Variables

- `VITE_API_BASE_URL` — `client\src\api\client.ts`

---
_Back to [index.md](./index.md) · Generated 2026-04-08_