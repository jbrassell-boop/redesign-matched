# TSI Portal Redesign — Design System

Canonical visual standards for the redesign-matched portal. All new pages must conform to this document. If a design question isn't answered here, ask before diverging.

**Source of truth:** `client/src/theme/tokens.css` (CSS variables) + `client/src/theme/antdTheme.ts` (Ant Design ConfigProvider).

---

## 1. Theme

- **Font:** Inter (loaded from Google Fonts), fallback `sans-serif`.
- **App background:** `var(--bg)` — `#F9FAFB`.
- **Sidebar / topbar:** `var(--sidebar)` — `#1E293B` (dark navy).
- **Card surface:** `var(--card)` — `#fff`.
- **Compact density:** base font size is 13px. Inputs and buttons are short (32px). Labels run small (9.5px–12px, often uppercase).

## 2. Color tokens

All colors live in `tokens.css` as CSS variables. **Do not introduce hardcoded hex or rgb values in application code.** If you need a color that isn't in the token set, add it to `tokens.css` first and use the variable.

| Purpose | Variable | Value |
|---|---|---|
| Primary brand | `--primary` | `#2E75B6` |
| Primary (dark) | `--primary-dark` | `#1B3A5C` |
| Primary (light bg) | `--primary-light` | `#E8F0FE` |
| Danger / error | `--danger` | `#B71234` |
| Success | `--success` | `#16A34A` |
| Warning / amber | `--warning` | `#F59E0B` |
| Text | `--text` | `#111827` |
| Muted text | `--muted` | `#5B6370` |
| Label | `--label` | `#374151` |
| Border (default) | `--border` | `#E5E7EB` |
| Border (dark) | `--border-dk` | `#B8C8E0` |
| Background | `--bg` | `#F9FAFB` |
| Sidebar / topbar | `--sidebar` | `#1E293B` |

Status badges, stat-strip tints, print-form palette, and other specialized colors are also tokenized — see `tokens.css`.

## 3. Spacing scale

Use these tokens for `padding`, `margin`, `gap`, and positional offsets. Do not use raw pixel literals for these properties.

| Token | Value |
|---|---|
| `--sp-1` | 4px |
| `--sp-1-5` | 6px |
| `--sp-2` | 8px |
| `--sp-2-5` | 10px |
| `--sp-3` | 12px |
| `--sp-3-5` | 14px |
| `--sp-4` | 16px |
| `--sp-4-5` | 18px |
| `--sp-5` | 20px |
| `--sp-6` | 24px |
| `--sp-8` | 32px |
| `--sp-10` | 40px |
| `--sp-12` | 48px |

Rule: if a value doesn't fit the scale, reach for the nearest token rather than adding a one-off. Only add a new spacing token when the same off-scale value appears three or more times across the codebase.

## 4. Typography scale

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | 12px | small labels, metadata |
| `--text-sm` | 13px | body default (inputs, tables) |
| `--text-base` | 13px | alias for body |
| `--text-lg` | 15px | subheadings |
| `--text-xl` | 18px | section titles |
| `--text-2xl` | 24px | page titles, KPI values |

## 5. Control heights

Interactive controls (buttons, inputs, selects) use these heights. **The values in `tokens.css` and `antdTheme.ts` must agree.**

| Token | Value | Purpose |
|---|---|---|
| `--control-height-sm` | 28px | Extra-compact (inline filters) |
| `--control-height` | 32px | Standard toolbar / input |
| `--control-height-lg` | 40px | Form inputs, primary actions |
| `--control-height-icon` | 32px | Icon-only square buttons |

AntD ConfigProvider `controlHeight`/`controlHeightSM`/`controlHeightLG` are mirrored in `antdTheme.ts` from the `SIZES` constant.

## 6. Radius, shadow, z-index

| Token | Value |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |
| `--radius-pill` | 9999px |
| `--shadow-card` | subtle 1px card shadow |
| `--shadow-dropdown` | dropdown / popover |
| `--shadow-modal` | modal / drawer |
| `--z-dropdown` | 100 |
| `--z-sticky` | 200 |
| `--z-drawer` | 400 |
| `--z-overlay` | 500 |
| `--z-modal` | 900 |
| `--z-toast` | 1000 |

## 7. Ant Design sync contract

`antdTheme.ts` exports a `ThemeConfig` that maps AntD tokens to the TSI palette. It is wrapped around the whole app in `App.tsx` via `<ConfigProvider>`. The JS constants in `antdTheme.ts` must match the CSS variables in `tokens.css`:

| `antdTheme.ts` (JS) | `tokens.css` (CSS var) |
|---|---|
| `COLORS.primary` | `--primary` |
| `COLORS.error` | `--danger` |
| `COLORS.success` | `--success` |
| `COLORS.warning` | `--warning` |
| `COLORS.bgBase` | `--bg` |
| `COLORS.textBase` | `--text` |
| `COLORS.border` | `--border` |
| `COLORS.sidebar` | `--sidebar` |
| `COLORS.primaryLight` | `--primary-light` |
| `SIZES.controlHeight` | `--control-height` |
| `SIZES.controlHeightSM` | `--control-height-sm` |
| `SIZES.controlHeightLG` | `--control-height-lg` |

**When changing any value, update both files in the same commit.**

## 8. Layout

- **Shell:** dark topbar + dark sidebar + main content area. Sidebar is a persistent nav; topbar holds the logo, service-location picker, and user menu.
- **List / detail pattern:** many entity pages use a left list + right detail pane (Repairs, Clients, Departments, Instruments, Inventory, Onsite Services, Suppliers). New entity pages should follow this pattern.
- **Fixed context zone:** toolbar + record selector + tab bar stack at the top of a detail view and persist as the user tabs through. Background `#DDE6F5`, bottom border `var(--border-dk)`.

## 9. Shared components (use first, build second)

Located in `client/src/components/shared/`. Prefer these over inline JSX:

| Component | Purpose |
|---|---|
| `SectionCard` | Card container with title + body |
| `DetailHeader` | Title bar with actions for detail views |
| `Field` | Label + value display field |
| `FormGrid` | 2-column form layout (`gap: var(--sp-2) var(--sp-3)`) |
| `ModalShell` | Consistent modal wrapper |
| `TabBar` | Page-level tab navigation |
| `DataTable` | AntD Table preset with TSI defaults |
| `StatStrip` | KPI chip strip |
| `StatusBadge` | Colored status pill |
| `PairedTable` | Two-column key/value table |
| `CategoryPicker` | Category dropdown |
| `EvalChecklist` | Checkbox list for inspections |
| `PipelineBar` | Stage progress bar |
| `SplitLayout` | List + detail split |
| `InlineExpandRow` | Expandable row content |

## 10. Ground rules for new pages

1. **Tokens first.** Never hardcode colors or spacing in new code. Use `var(--*)`.
2. **Shared components before custom.** If `SectionCard`, `Field`, `FormGrid`, `DetailHeader`, or `ModalShell` fit, use them.
3. **AntD via ConfigProvider only.** Don't apply per-component AntD theme overrides; extend `antdTheme.ts` if you need a global change.
4. **BEM-ish kebab-case CSS class names.** Component files are PascalCase.
5. **Inline `style={{ }}` is a last resort.** Prefer a CSS file next to the component.
6. **Print views are their own world.** Styles under `pages/repairs/forms/*` are intentionally hardcoded for 8.5×11 paper — do not tokenize them without a reason.
7. **When in doubt, ask before diverging.** Joe is the design authority for the redesign.

## 11. Templates to copy

- Toolbar with filters → `pages/dashboard/DashboardToolbar.tsx`
- List + detail drawer → `pages/repairs/RepairDetailPane.tsx`
- Data table → `components/shared/DataTable.tsx`
- Form layout → `components/shared/FormGrid.css` + `components/shared/Field.tsx`
- Tokenized CSS example → `theme/hover.css`

---

## 12. For downstream consumers (WinScope Cloud)

**This repo is the source of truth for the TSI design system.** If you are building a React/AntD app that should share the TSI visual language (e.g. Steve's `winscope-net-production/Claude/` modernization), your local `tokens.css` and `antdTheme.ts` should be a **re-sync** from this repo, not a fork.

**Sync rules:**
1. `client/src/theme/tokens.css` and `client/src/theme/antdTheme.ts` here are canonical. Any snapshot you keep locally (e.g. under `reference/joseph-ui/`) should be periodically refreshed from this repo's `main` branch.
2. Do not add TSI palette colors or spacing tokens locally without first adding them here. One source, one truth.
3. When you pull a new version, review the sync contract in §7 — if a CSS variable changed, the matching JS constant in `antdTheme.ts` must change too. Drift breaks AntD components.
4. Shared React components under `client/src/components/shared/` are also canonical. Copy them across rather than reinventing.

**Current drop (2026-04-20) includes:**
- Half-step spacing tokens: `--sp-1-5` (6px), `--sp-2-5` (10px), `--sp-3-5` (14px), `--sp-4-5` (18px)
- Control-height tokens: `--control-height`, `--control-height-sm`, `--control-height-lg`, `--control-height-icon`
- `SIZES` constant block in `antdTheme.ts` so control heights have a single JS source
- Written sync contract in §7 (JS constants ↔ CSS variables)

If you're tracking alignment, re-sync `client/src/theme/` and `client/src/components/shared/` from this branch after merge.

---

_Last audit: 2026-04-20. Open audit items: abstract `ToolbarBase` (5 page-specific toolbars duplicate ~800 LOC), abstract `LayoutListDetail` (7 pages reimplement the split), clean residual orphan pixel values (`5px`/`7px`/`15px`/`30px`/`36px`) into the spacing scale or leave as documented exceptions._
