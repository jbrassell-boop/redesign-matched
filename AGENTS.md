# Project Context

This is a javascript project using raw-http.

Middleware includes: auth.

High-impact files (most imported, changes here affect many other files):
- client\src\pages\repairs\types.ts (imported by 45 files)
- client\src\api\client.ts (imported by 33 files)
- client\src\api\repairs.ts (imported by 25 files)
- client\src\pages\clients\types.ts (imported by 20 files)
- client\src\pages\contracts\types.ts (imported by 16 files)
- client\src\pages\departments\types.ts (imported by 14 files)
- client\src\api\departments.ts (imported by 13 files)
- client\src\components\shared\StatStrip.tsx (imported by 12 files)

Required environment variables (no defaults):
- VITE_API_BASE_URL (client\src\api\client.ts)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
