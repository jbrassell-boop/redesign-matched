# Visual Audit & Component Library — Design Spec

**Date:** 2026-04-02
**Goal:** Get all 22 screens visually matching the tsi-redesign HTML reference by extracting shared components and auditing every screen.

---

## Approach: Bottom-Up (Component Library First)

**Phase 1** — Build shared component library (~10 components)
**Phase 2** — Screen-by-screen audit (all 22 screens, fix + swap to components)
**Phase 3** — Polish pass (spacing, typography, consistency)

## Fidelity: Spirit Match

Same design language, same feel. Pragmatic with Ant Design — accept its rendering for complex components (tables, modals, tabs) as long as tokens, colors, and spacing align with the reference. Not pixel-perfect, but unmistakably the same design.

---

## Phase 1: Shared Component Library

### Components to Build

| Component | File | Purpose |
|-----------|------|---------|
| `StatStrip` + `StatChip` | `components/shared/StatStrip.tsx` + `.css` | Horizontal KPI chip strip. Props: chips array (icon, iconBg, iconColor, value, valueColor, label). Click-to-filter support. |
| `SplitLayout` | `components/shared/SplitLayout.tsx` + `.css` | Left list panel (280px, collapsible) + right detail pane. Collapse toggle button. |
| `DetailHeader` | `components/shared/DetailHeader.tsx` + `.css` | Title + subtitle + status badge + action buttons row. |
| `TabBar` | `components/shared/TabBar.tsx` + `.css` | Custom tab row: 2px bottom border active, 13px font, 600 weight active, muted inactive. No Ant Tabs. |
| `Field` | `components/shared/Field.tsx` + `.css` | Uppercase 10-11px muted label + readonly display value (28px min-height, neutral-50 bg, neutral-200 border). |
| `FormGrid` | `components/shared/FormGrid.tsx` + `.css` | 2/3/4-column CSS grid. Props: cols (2-4), gap. Children use `span2`/`span3` classes. |
| `StatusBadge` | `components/shared/StatusBadge.tsx` + `.css` | Pill-shaped badge. Props: status string maps to color scheme (active=green, pending=amber, overdue=red, etc.). |
| `DataTable` | `components/shared/DataTable.tsx` + `.css` | Ant Table wrapper with reference-matching header styles: 11px uppercase muted, sticky, neutral-100 bg. |
| `SectionCard` | `components/shared/SectionCard.tsx` + `.css` | Card with uppercase muted header (10.5-11px, 700 weight) + white body. |
| `ModalShell` | `components/shared/ModalShell.tsx` + `.css` | Ant Modal/Drawer wrapper: primary-colored header, white body, footer with action buttons. 600px default width. |

### Styling Rules

- One `.css` file per component, imported by the component
- All colors via CSS variables from `tokens.css` — zero hardcoded hex in `.tsx`
- Typography enforced by components: card headers 10.5-11px uppercase, labels 12px, body 13px
- Spacing on 4px grid, enforced internally by components
- No CSS-in-JS, no styled-components — plain CSS + CSS variables

### Token Adjustments

- Tighten `antdTheme.ts` to better match reference (table header styles, tab styles, button heights)
- Add any missing tokens to `tokens.css` if the reference uses values we don't have
- Ensure RGB variants exist for any color used in rgba() backgrounds

---

## Phase 2: Screen-by-Screen Audit

### Process Per Screen

1. Open reference HTML (`C:/Projects/tsi-redesign/<page>.html`) and React page side-by-side
2. Catalog visual gaps: spacing, typography, colors, layout proportions, component rendering
3. Replace inline styles with shared components
4. Tune component props until spirit matches
5. Preview verify

### Screen Groups

**Split-layout screens (16):**
Repairs, Clients, Departments, Contracts, Inventory, Loaners, Financial, Suppliers, Scope Models, Instruments, Onsite Services, Acquisitions, Product Sales, Outsource Validation, Workspace, EndoCarts

All share: `SplitLayout` + list panel + `DetailHeader` + `TabBar` + `Field`/`FormGrid` in tabs

**Full-width screens (4):**
Dashboard, Quality, Reports, Administration

Use: `StatStrip` + `DataTable` or custom content areas

**Special screens (2):**
Login, Development List — unique layouts, audited individually

### Audit Order

1. **Repairs** — most complex screen, validates all component patterns
2. **Dashboard** — most visible, validates StatStrip + DataTable
3. **Clients** — validates split-layout + Field patterns for simpler screens
4. **Remaining 19** — batched, leveraging established components

---

## Phase 3: Polish Pass

- Consistent spacing across all screens (4px grid)
- Typography hierarchy enforced (no ad-hoc font sizes)
- Responsive sidebar behavior verified (collapse at 1440px)
- Dark chrome (topbar + sidebar) consistency
- Remove any remaining inline styles that should be in components
- Verify all CSS variables are used correctly (no hardcoded colors)

---

## Out of Scope

- New features, tabs, API endpoints, or data wiring
- Responsive/mobile layouts (reference is desktop-only)
- Dark mode
- Accessibility audit
- Performance optimization (lazy loading, code splitting)
- Wiring tab stubs to real data — stubs stay as stubs

## In Scope

- ~10 shared components extracted and styled
- All 22 screens audited against reference HTML
- Visual gaps fixed (spacing, colors, typography, layout)
- Inline styles replaced with component usage
- CSS variable enforcement (no hardcoded colors in .tsx)
