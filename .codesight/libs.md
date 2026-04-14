# Libraries & CSS/Theme Reference

---

## CSS Design System

### Token File: `client/src/theme/tokens.css`

All colors/spacing MUST use these variables. Zero hardcoded hex in `.tsx` files.

**Primary palette:**
```css
--primary: #2E75B6          /* blue — buttons, links, active states */
--primary-dark: #1B3A5C     /* dark navy — drawer headers */
--primary-light: #E8F0FE    /* light blue — selected bg tints */
--navy: #1B3A5C
--danger: #B71234           /* red — errors, delete actions */
--success: #16A34A          /* green */
--warning: #F59E0B          /* amber — highlighted rows, warnings */
--amber: #F59E0B
```

**RGB tokens (for rgba() — can't use hex vars inside rgba()):**
```css
--primary-rgb: 46, 117, 182
--danger-rgb: 183, 18, 52
--amber-rgb: 245, 158, 11
--navy-rgb: 27, 58, 92
--success-rgb: 22, 163, 74
--muted-rgb: 107, 114, 128
--purple-rgb: 124, 58, 237
```
Usage: `rgba(var(--primary-rgb), 0.13)` — NOT `rgba(46, 117, 182, 0.13)`

**Layout colors:**
```css
--sidebar: #1E293B          --sidebar-lt: #334155
--sidebar-text: #CBD5E1     --topbar: #1E293B
--neutral-50/100/200/500/700/900
--text: #111827             --muted: #6B7280
--label: #374151            --card: #fff
--bg: #F9FAFB               --border: #E5E7EB
--border-dk: #B8C8E0
```

**Selection / highlight (split-layout selected row):**
```css
--amber-light: #FEF3C7      /* selected row bg */
--amber-border: #FDE68A     /* selected row border */
```
Selected row pattern: `borderLeft: '2px solid var(--amber)'` + `background: 'var(--amber-light)'`

**Status badge variables:** `--badge-blue-*`, `--badge-green-*`, `--badge-amber-*`, `--badge-red-*`, `--badge-purple-*`, `--badge-cyan-*`, `--badge-teal-*`, `--badge-orange-*`

**Spacing scale:**
```css
--sp-1: 4px  --sp-2: 8px  --sp-3: 12px  --sp-4: 16px
--sp-5: 20px --sp-6: 24px --sp-8: 32px  --sp-10: 40px  --sp-12: 48px
```

**Typography:**
```css
--text-xs: 12px  --text-sm: 13px  --text-base: 13px
--text-lg: 15px  --text-xl: 18px  --text-2xl: 24px
```

**Shadows / z-index layers:**
```css
--shadow-card / --shadow-dropdown / --shadow-modal
z-index: dropdown(100), sticky(200), drawer(400), overlay(500), modal(900), toast(1000), cmd(1100)
```

**Border radius:**
```css
--radius-sm: 4px  --radius-md: 6px  --radius-lg: 8px  --radius-xl: 12px  --radius-pill: 9999px
```

---

## Ant Design Theme: `client/src/theme/antdTheme.ts`

Custom token overrides. Key settings:
- `fontSize: 13`, `controlHeight: 32` (compact sizing)
- Primary color synced to `--primary` (#2E75B6)
- Dark sidebar via Menu component tokens
- Tab active: 2px bottom border + `--primary` color, no background fill
- Drawer width: 600px universal

Do NOT override Ant Design styles with inline CSS if a token exists in `antdTheme.ts`.

---

## Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.x | UI framework |
| React Router | v7 | Client-side routing |
| Ant Design | 6.x | Component library |
| Axios | 1.x | HTTP client |
| xlsx | 0.18.5 | Excel export |
| Vite | 8.x | Build tool / dev server |

---

## Shared UI Components: `client/src/components/shared/`

Import from the barrel: `import { DataTable, SectionCard, ... } from '../../components/shared'`

| Component | Purpose |
|-----------|---------|
| `DataTable` | Standardized Ant Design table wrapper |
| `DetailHeader` | Right-panel header with title + action buttons |
| `EmptyState` | Consistent empty/no-data display |
| `Field` | Label + value display for detail panes |
| `FormGrid` | 2-column form layout grid |
| `ModalShell` | Standard modal wrapper (600px) |
| `PairedTable` | Two side-by-side tables |
| `SectionCard` | Titled card section for form groups |
| `SplitLayout` | Left list panel + right detail panel container |
| `StatStrip` | KPI chip strip across top of split pages |
| `StatusBadge` | Colored status badge using badge token palette |
| `TabBar` | Custom tab navigation (not Ant Design Tabs) |

---

## Common Components: `client/src/components/common/`

| Component/Hook | Purpose |
|---|---|
| `RouteGuard` | Redirect to /login if no JWT token |
| `AlertBanner` | Top-of-page dismissible alert banners |
| `AutosaveIndicator` | Save status indicator (saving / saved / error) |
| `BulkActionBar` | Floating bar when rows are bulk-selected |
| `ContextMenu` | Right-click context menu |
| `ExportButton` | CSV/Excel export trigger |
| `InlineEditor` | Click-to-edit field |
| `alertsController.ts` | Business logic: `evaluateRepair()`, `evaluateClient()` |
| `useBulkSelect.ts` | Hook: multi-row selection state |
| `exportUtils.ts` | xlsx export helpers |

---

## Hooks: `client/src/hooks/`

| Hook | Purpose |
|------|---------|
| `useAuth` | Get current user from sessionStorage JWT |
| `useAlerts` | Alert state management |
| `useAutosave` | Debounced autosave with status feedback |
| `useDensity` | Compact/normal density toggle (data attribute) |
| `useKeyboardNav` | Arrow-key navigation for list panels |
| `useTabBadges` | Fetch badge counts per tab (parallel fetch) |
| `useServiceLocation` | Multi-location context (wraps app root) |

---

_Last updated: 2026-04-09_
