# Dev Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable "Inspect" panel to the portal that shows any screen's mapped DB fields — SQL query, API endpoint, and live production value — without leaving the portal.

**Architecture:** A React context (`InspectorContext`) holds toggle state and caches the field registry (fetched once). It derives the active screen automatically from the current route path, requiring zero per-page changes. A non-blocking Ant Design `Drawer` (mask=false) renders in `AppShell` alongside all portal pages. The existing `/api/field-verifier/*` endpoints serve the inspector with no server changes.

**Tech Stack:** React 18, TypeScript, React Router v6 `useLocation`, Ant Design Drawer, existing ASP.NET Core field-verifier API endpoints.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| **Create** | `client/src/types/fieldRegistry.ts` | Shared `FieldEntry` + `ScreenRegistry` types and `FIELD_VERIFIER_API` constant |
| **Create** | `client/src/contexts/InspectorContext.tsx` | Toggle state, route-based screen detection, registry cache, selected field ID |
| **Create** | `client/src/components/inspector/InspectorFieldDetail.tsx` | Read-only field detail: SQL, live value, preview rows, link to `/verify` |
| **Create** | `client/src/components/inspector/DevInspectorPanel.tsx` | Ant Design Drawer — field list view and field detail view |
| **Modify** | `client/src/components/shell/Topbar.tsx` | Add Inspect toggle button |
| **Modify** | `client/src/components/shell/AppShell.tsx` | Wrap with `InspectorProvider`, mount `DevInspectorPanel` |
| **Modify** | `client/src/pages/FieldVerifier/index.tsx` | Use shared types; read `?screen=` + `?field=` query params for deep-link |

---

## Task 1: Shared Types and API Constant

**Files:**
- Create: `client/src/types/fieldRegistry.ts`
- Modify: `client/src/pages/FieldVerifier/index.tsx` (import from shared types)
- Modify: `client/src/pages/FieldVerifier/VerifierCard.tsx` (import from shared types)

- [ ] **Step 1: Create shared types file**

```typescript
// client/src/types/fieldRegistry.ts

export const FIELD_VERIFIER_API = 'http://localhost:5000/api/field-verifier';

export interface FieldEntry {
  id: string;
  label: string;
  sqlTable: string;
  sqlQuery: string;
  apiEndpoint: string;
  responseProperty: string;
  status: 'unverified' | 'confirmed' | 'flagged';
  notes: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface ScreenRegistry {
  screen: string;
  lastUpdated: string;
  fields: FieldEntry[];
}

// Maps route pathname → registry screen name
// Must stay in sync with SCREEN_FILES in FieldVerifier/index.tsx
export const ROUTE_TO_SCREEN: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/departments': 'Departments',
  '/repairs': 'Repairs',
  '/inventory': 'Inventory',
  '/contracts': 'Contracts',
  '/onsite-services': 'Onsite Services',
  '/product-sale': 'Product Sale',
  '/financial': 'Financial',
  '/suppliers': 'Suppliers',
  '/scope-model': 'Scope Model',
};
```

- [ ] **Step 2: Update FieldVerifier/index.tsx to import from shared types**

Replace the `FieldEntry` and `ScreenRegistry` interface declarations and the `const API` line at the top of `client/src/pages/FieldVerifier/index.tsx`:

```typescript
// Remove these lines:
//   export interface FieldEntry { ... }
//   export interface ScreenRegistry { ... }
//   const API = 'http://localhost:5000/api/field-verifier';

// Add at top:
import { FIELD_VERIFIER_API, type FieldEntry, type ScreenRegistry } from '../../types/fieldRegistry';

// Replace all uses of API with FIELD_VERIFIER_API
// Replace `export interface FieldEntry` with re-export:
export type { FieldEntry, ScreenRegistry };
```

After the edit, `index.tsx` should have no local `FieldEntry`/`ScreenRegistry` declarations — it re-exports them from the shared types file. The `SCREEN_FILES` const stays in `index.tsx` since it's only used there.

- [ ] **Step 3: Update VerifierCard.tsx to import from shared types**

In `client/src/pages/FieldVerifier/VerifierCard.tsx`, replace:

```typescript
// Old:
const API = 'http://localhost:5000/api/field-verifier';
// ... and the import of FieldEntry from './index'
import type { FieldEntry } from './index';

// New:
import { FIELD_VERIFIER_API, type FieldEntry } from '../../types/fieldRegistry';
// Replace all API references with FIELD_VERIFIER_API
```

- [ ] **Step 4: Verify the app still compiles**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors. If there are import errors, they will all be in `FieldVerifier/` files referencing the moved types — fix by ensuring the re-export is present in `index.tsx`.

- [ ] **Step 5: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/types/fieldRegistry.ts \
        client/src/pages/FieldVerifier/index.tsx \
        client/src/pages/FieldVerifier/VerifierCard.tsx
git commit -m "refactor: extract field registry types and API const to shared module"
```

---

## Task 2: InspectorContext

**Files:**
- Create: `client/src/contexts/InspectorContext.tsx`

- [ ] **Step 1: Create the context**

```typescript
// client/src/contexts/InspectorContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { FIELD_VERIFIER_API, ROUTE_TO_SCREEN, type ScreenRegistry } from '../types/fieldRegistry';

interface InspectorContextValue {
  enabled: boolean;
  toggle: () => void;
  activeScreen: string | null;       // e.g. 'Repairs'
  registry: ScreenRegistry[];        // all 11 screens, cached after first fetch
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  loading: boolean;
  error: string;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [registry, setRegistry] = useState<ScreenRegistry[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchedRef = useRef(false);
  const location = useLocation();

  // Derive active screen from current route
  const activeScreen = ROUTE_TO_SCREEN[location.pathname] ?? null;

  // Reset selected field when navigating to a different screen
  useEffect(() => {
    setSelectedFieldId(null);
  }, [activeScreen]);

  // Fetch registry the first time inspect mode is enabled
  const toggle = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    if (next && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${FIELD_VERIFIER_API}/registry`);
        const data: ScreenRegistry[] = await res.json();
        setRegistry(data);
      } catch {
        setError('Could not load field registry');
        fetchedRef.current = false; // allow retry
      } finally {
        setLoading(false);
      }
    }
  }, [enabled]);

  return (
    <InspectorContext.Provider value={{ enabled, toggle, activeScreen, registry, selectedFieldId, setSelectedFieldId, loading, error }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error('useInspector must be used within InspectorProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/contexts/InspectorContext.tsx
git commit -m "feat: add InspectorContext — toggle, route-based screen detection, registry cache"
```

---

## Task 3: InspectorFieldDetail Component

**Files:**
- Create: `client/src/components/inspector/InspectorFieldDetail.tsx`

- [ ] **Step 1: Create the component**

```typescript
// client/src/components/inspector/InspectorFieldDetail.tsx
import { useState, useEffect } from 'react';
import { Button, Spin, Tag } from 'antd';
import { TableOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { FIELD_VERIFIER_API, type FieldEntry } from '../../types/fieldRegistry';

interface Props {
  field: FieldEntry;
  screenFile: string; // e.g. 'repairs' — used for deep-link to /verify
  onBack: () => void;
}

export function InspectorFieldDetail({ field, screenFile, onBack }: Props) {
  const [liveValue, setLiveValue] = useState('');
  const [liveError, setLiveError] = useState('');
  const [loadingValue, setLoadingValue] = useState(false);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-fetch live value when field changes
  useEffect(() => {
    setLiveValue('');
    setLiveError('');
    setPreviewColumns([]);
    setPreviewRows([]);
    setShowPreview(false);
    if (field.sqlQuery) fetchLiveValue();
  }, [field.id]);

  async function fetchLiveValue() {
    setLoadingValue(true);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/live-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: field.sqlQuery }),
      });
      const data = await res.json();
      if (data.error) setLiveError(data.error);
      else setLiveValue(data.value);
    } catch {
      setLiveError('Could not reach API');
    } finally {
      setLoadingValue(false);
    }
  }

  async function fetchPreviewRows() {
    setLoadingPreview(true);
    setShowPreview(true);
    try {
      const res = await fetch(`${FIELD_VERIFIER_API}/preview-rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: field.sqlQuery }),
      });
      const data = await res.json();
      if (data.error) setPreviewError(data.error);
      else { setPreviewColumns(data.columns ?? []); setPreviewRows(data.rows ?? []); }
    } catch {
      setPreviewError('Could not reach API');
    } finally {
      setLoadingPreview(false);
    }
  }

  const statusColor = field.status === 'confirmed' ? 'green' : field.status === 'flagged' ? 'gold' : 'default';
  const deepLink = `/verify?screen=${encodeURIComponent(screenFile)}&field=${encodeURIComponent(field.id)}`;

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E74B5', fontSize: 12, padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ArrowLeftOutlined style={{ fontSize: 10 }} /> All fields
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1 }}>Field</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A202C' }}>{field.label}</div>
        </div>
        <Tag color={statusColor} style={{ marginTop: 4 }}>{field.status}</Tag>
      </div>

      {/* SQL Table */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>SQL Table</div>
        <code style={{ fontSize: 12, color: '#00257A', background: '#EEF2F8', padding: '2px 6px', borderRadius: 3 }}>
          {field.sqlTable || '—'}
        </code>
      </div>

      {/* SQL Query */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>SQL Query</div>
        <pre style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: 4, fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', color: '#1A202C', maxHeight: 100, overflowY: 'auto' }}>
          {field.sqlQuery || '(not set)'}
        </pre>
      </div>

      {/* API Endpoint */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>API Endpoint</div>
        <code style={{ fontSize: 12, color: '#2E74B5', background: '#EEF2F8', padding: '2px 6px', borderRadius: 3 }}>
          {field.apiEndpoint || '—'}
        </code>
        {field.responseProperty && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#8896AA' }}>→ <code style={{ fontSize: 11 }}>{field.responseProperty}</code></span>
        )}
      </div>

      {/* Live Value */}
      <div style={{ marginBottom: 12, padding: '10px 12px', background: '#F0F7FF', border: '1px solid #BFD6F6', borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: '#44697D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Live value from DB
          {!loadingValue && field.sqlQuery && (
            <button
              onClick={fetchLiveValue}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E74B5', fontSize: 10, marginLeft: 6, padding: 0 }}
            >
              Refresh
            </button>
          )}
        </div>
        {loadingValue ? (
          <Spin size="small" />
        ) : liveError ? (
          <span style={{ color: '#B71234', fontSize: 12 }}>{liveError}</span>
        ) : liveValue ? (
          <span style={{ fontSize: 22, fontWeight: 700, color: '#00257A' }}>{liveValue}</span>
        ) : (
          <span style={{ color: '#8896AA', fontSize: 12 }}>—</span>
        )}
      </div>

      {/* Sample rows toggle */}
      {field.sqlQuery && (
        <div style={{ marginBottom: 12 }}>
          <Button
            type="link"
            size="small"
            icon={<TableOutlined />}
            style={{ padding: 0, fontSize: 11, color: '#2E74B5' }}
            loading={loadingPreview}
            onClick={() => showPreview ? setShowPreview(false) : fetchPreviewRows()}
          >
            {showPreview ? 'Hide sample rows' : 'Show sample rows'}
          </Button>
          {showPreview && !loadingPreview && (
            <div style={{ marginTop: 6, overflowX: 'auto' }}>
              {previewError ? (
                <span style={{ color: '#B71234', fontSize: 11 }}>{previewError}</span>
              ) : previewRows.length === 0 ? (
                <span style={{ color: '#8896AA', fontSize: 11 }}>No rows</span>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {previewColumns.map(col => (
                        <th key={col} style={{ textAlign: 'left', padding: '2px 6px 2px 0', borderBottom: '2px solid #BFD6F6', color: '#00257A', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : '#EEF5FF' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '2px 6px 2px 0', fontFamily: 'monospace', color: cell === '(null)' ? '#8896AA' : '#1A202C', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {field.notes && (
        <div style={{ marginBottom: 12, padding: '6px 10px', background: '#FFF3CD', borderRadius: 4, fontSize: 11, color: '#856404' }}>
          {field.notes}
        </div>
      )}

      {/* Deep link to full verifier */}
      <a
        href={deepLink}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: '#2E74B5', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        Open in Field Verifier ↗
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/components/inspector/InspectorFieldDetail.tsx
git commit -m "feat: add InspectorFieldDetail — read-only field panel with live value and sample rows"
```

---

## Task 4: DevInspectorPanel (Drawer)

**Files:**
- Create: `client/src/components/inspector/DevInspectorPanel.tsx`

- [ ] **Step 1: Create the panel component**

```typescript
// client/src/components/inspector/DevInspectorPanel.tsx
import { Drawer, Spin, Tag } from 'antd';
import { useInspector } from '../../contexts/InspectorContext';
import { InspectorFieldDetail } from './InspectorFieldDetail';
import { SCREEN_FILES_REVERSE } from '../../types/fieldRegistry';
import type { FieldEntry } from '../../types/fieldRegistry';

// Needed to look up screen file slug from screen display name
// e.g. 'Repairs' → 'repairs', 'Onsite Services' → 'onsite-services'
// This map must be added to fieldRegistry.ts in the next step

export function DevInspectorPanel() {
  const { enabled, toggle, activeScreen, registry, selectedFieldId, setSelectedFieldId, loading, error } = useInspector();

  const screen = activeScreen ? registry.find(s => s.screen === activeScreen) : null;
  const selectedField = screen?.fields.find(f => f.id === selectedFieldId) ?? null;
  const screenFile = activeScreen ? SCREEN_FILES_REVERSE[activeScreen] ?? activeScreen.toLowerCase() : '';

  return (
    <Drawer
      open={enabled}
      onClose={toggle}
      placement="right"
      width={420}
      mask={false}
      title={
        <span style={{ fontSize: 13, fontWeight: 700, color: '#00257A' }}>
          {selectedField ? selectedField.label : activeScreen ? `${activeScreen} Fields` : 'Dev Inspector'}
        </span>
      }
      styles={{ body: { padding: '16px 20px', overflowY: 'auto' } }}
      zIndex={500}
    >
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <Spin tip="Loading field registry…" />
        </div>
      )}

      {error && (
        <div style={{ color: '#B71234', fontSize: 13, padding: 16 }}>{error}</div>
      )}

      {!loading && !error && !activeScreen && (
        <div style={{ color: '#8896AA', fontSize: 13 }}>
          Navigate to a portal screen to see its fields.
        </div>
      )}

      {!loading && !error && activeScreen && !screen && (
        <div style={{ color: '#8896AA', fontSize: 13 }}>
          No field registry found for <strong>{activeScreen}</strong>.
        </div>
      )}

      {!loading && !error && screen && !selectedField && (
        <FieldList
          fields={screen.fields}
          onSelect={setSelectedFieldId}
        />
      )}

      {!loading && !error && screen && selectedField && (
        <InspectorFieldDetail
          field={selectedField}
          screenFile={screenFile}
          onBack={() => setSelectedFieldId(null)}
        />
      )}
    </Drawer>
  );
}

function FieldList({ fields, onSelect }: { fields: FieldEntry[]; onSelect: (id: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 12 }}>
        {fields.length} registered field{fields.length !== 1 ? 's' : ''}
      </div>
      {fields.map(field => {
        const statusColor = field.status === 'confirmed' ? '#16A34A' : field.status === 'flagged' ? '#D97706' : '#8896AA';
        return (
          <div
            key={field.id}
            onClick={() => onSelect(field.id)}
            style={{
              padding: '9px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 4,
              border: '1px solid #DDE3EE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EEF5FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {field.label}
              </div>
              <div style={{ fontSize: 11, color: '#8896AA', fontFamily: 'monospace', marginTop: 1 }}>
                {field.sqlTable}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              <code style={{ fontSize: 10, color: '#44697D' }}>{field.responseProperty}</code>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Add `SCREEN_FILES_REVERSE` to the shared types file**

In `client/src/types/fieldRegistry.ts`, add after `ROUTE_TO_SCREEN`:

```typescript
// Maps screen display name → registry file slug
// Used by DevInspectorPanel to construct deep-links to /verify
export const SCREEN_FILES_REVERSE: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Clients': 'clients',
  'Departments': 'departments',
  'Repairs': 'repairs',
  'Inventory': 'inventory',
  'Contracts': 'contracts',
  'Onsite Services': 'onsite-services',
  'Product Sale': 'product-sale',
  'Financial': 'financial',
  'Suppliers': 'suppliers',
  'Scope Model': 'scope-model',
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/components/inspector/DevInspectorPanel.tsx \
        client/src/types/fieldRegistry.ts
git commit -m "feat: add DevInspectorPanel drawer — field list and detail views"
```

---

## Task 5: Inspect Toggle in Topbar

**Files:**
- Modify: `client/src/components/shell/Topbar.tsx`

- [ ] **Step 1: Import `useInspector` and add the button**

In `client/src/components/shell/Topbar.tsx`, add the import:

```typescript
import { useInspector } from '../../contexts/InspectorContext';
```

Inside the `Topbar` component body (after the existing hooks), add:

```typescript
const { enabled: inspectorEnabled, toggle: toggleInspector } = useInspector();
```

In the JSX, insert the Inspect button **before** the `<span style={{ opacity: 0.4 }}>|</span>` separator. Place it directly after the Work Orders `div`:

```tsx
{/* Inspect toggle */}
<button
  onClick={toggleInspector}
  title={inspectorEnabled ? 'Close Dev Inspector' : 'Open Dev Inspector'}
  style={{
    height: 28,
    padding: '0 10px',
    borderRadius: 5,
    border: inspectorEnabled ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.25)',
    background: inspectorEnabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
    color: 'var(--card)',
    fontSize: 11,
    fontWeight: inspectorEnabled ? 700 : 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  }}
>
  {/* Magnifying glass icon */}
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
  Inspect
</button>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/components/shell/Topbar.tsx
git commit -m "feat: add Inspect toggle button to Topbar"
```

---

## Task 6: Wire Into AppShell + FieldVerifier Deep-Link

**Files:**
- Modify: `client/src/components/shell/AppShell.tsx`
- Modify: `client/src/pages/FieldVerifier/index.tsx`

- [ ] **Step 1: Wrap AppShell with InspectorProvider and mount the panel**

In `client/src/components/shell/AppShell.tsx`, add imports:

```typescript
import { InspectorProvider } from '../../contexts/InspectorContext';
import { DevInspectorPanel } from '../inspector/DevInspectorPanel';
```

Wrap the return in `InspectorProvider` and add `DevInspectorPanel` inside the layout div:

```tsx
export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  // ... existing code unchanged ...

  return (
    <InspectorProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Sidebar collapsed={collapsed} onCollapse={handleCollapse} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.2s ease',
          willChange: 'margin-left',
        }}>
          <Topbar sidebarCollapsed={collapsed} />
          <main role="main" id="main-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', marginTop: 64 }}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
        <CommandPalette />
        <DevInspectorPanel />
        <div aria-live="polite" id="status-announcer" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }} />
      </div>
    </InspectorProvider>
  );
};
```

- [ ] **Step 2: Add deep-link support to FieldVerifier/index.tsx**

The `/verify` page is outside `AppShell` and `InspectorProvider`, so it reads query params directly using `useSearchParams`.

In `client/src/pages/FieldVerifier/index.tsx`, add:

```typescript
import { useSearchParams } from 'react-router-dom';
```

Inside `FieldVerifierPage`, after the existing `useState` declarations, add:

```typescript
const [searchParams] = useSearchParams();

// On first load, navigate to screen + field from deep-link params
useEffect(() => {
  if (screens.length === 0) return; // not loaded yet
  const screenParam = searchParams.get('screen'); // e.g. 'repairs'
  const fieldParam = searchParams.get('field');   // e.g. 'rep_status'
  if (!screenParam) return;

  // Find the display name that matches this slug
  const screenName = Object.entries(SCREEN_FILES).find(([, slug]) => slug === screenParam)?.[0];
  if (!screenName) return;

  setActiveScreen(screenName);
  if (fieldParam) {
    const screen = screens.find(s => s.screen === screenName);
    const idx = screen?.fields.findIndex(f => f.id === fieldParam) ?? -1;
    if (idx >= 0) setActiveFieldIndex(idx);
  }
}, [screens]); // runs once screens are loaded
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Projects/redesign-matched/client
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/components/shell/AppShell.tsx \
        client/src/pages/FieldVerifier/index.tsx
git commit -m "feat: wire InspectorProvider into AppShell and add /verify deep-link support"
```

---

## Task 7: End-to-End Smoke Test

- [ ] **Step 1: Start the API**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api
ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile
```

Expected: API listening on `http://localhost:5000`

- [ ] **Step 2: Start the dev server**

```bash
cd C:/Projects/redesign-matched/client
npm run dev
```

Expected: Vite dev server on `http://localhost:5173`

- [ ] **Step 3: Test the Inspect button**

1. Open `http://localhost:5173`, log in
2. Navigate to `/repairs`
3. Click "Inspect" in the topbar — drawer should open on the right
4. Verify: field list shows 11 Repairs fields, portal stays interactive behind the drawer

- [ ] **Step 4: Test field detail**

1. Click any field in the list (e.g. "Status")
2. Verify: SQL query appears, live value loads within 2 seconds
3. Click "Show sample rows" — table of 5 rows should appear
4. Click "← All fields" — returns to field list
5. Navigate to `/clients` — drawer updates to show Clients fields automatically

- [ ] **Step 5: Test deep-link**

1. Click "Open in Field Verifier ↗" on any field
2. Verify: `/verify` opens in a new tab, scrolled to that exact field card

- [ ] **Step 6: Commit the session**

```bash
cd C:/Projects/redesign-matched
git add -A
git commit -m "feat: dev inspector — inspect mode wired up and smoke tested"
git push origin main
```

---

## Self-Review

**Spec coverage check:**
- ✅ Toggle in topbar — Task 5
- ✅ Panel shows fields for current screen automatically — InspectorContext uses `useLocation` 
- ✅ Click field → SQL + API endpoint + live value — InspectorFieldDetail
- ✅ Sample rows on demand — InspectorFieldDetail
- ✅ Portal stays interactive (mask=false) — DevInspectorPanel Drawer props
- ✅ Link back to full Field Verifier — deep-link in InspectorFieldDetail
- ✅ Field Verifier reads deep-link params — Task 6 Step 2
- ✅ No server changes needed — all uses existing endpoints
- ✅ Zero per-page annotation needed — route-based screen detection in context

**Placeholder scan:** No TBDs, all code complete.

**Type consistency:**
- `FieldEntry` — defined in `fieldRegistry.ts`, used identically in VerifierCard, InspectorFieldDetail, DevInspectorPanel ✅
- `ScreenRegistry` — same ✅
- `FIELD_VERIFIER_API` — single source in `fieldRegistry.ts`, imported everywhere ✅
- `SCREEN_FILES_REVERSE` — added to `fieldRegistry.ts` in Task 4 Step 2, imported in DevInspectorPanel ✅
- `useInspector()` — exported from `InspectorContext.tsx`, used in Topbar and DevInspectorPanel ✅
- `InspectorProvider` — wraps AppShell in Task 6, so Topbar (inside AppShell) can safely call `useInspector()` ✅
