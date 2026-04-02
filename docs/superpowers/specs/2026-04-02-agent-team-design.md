# Agent Team Design — redesign-matched Phase 4

**Date:** 2026-04-02
**Scope:** Phase 4 screen build (14 screens) using CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

---

## Context

Phase 4 has 14 unbuilt screens: Loaners, Financial, Suppliers, Scope Model, Instruments, Onsite Services, Acquisitions, Product Sale, Outsource Validation, Reports, Administration, Workspace, EndoCarts, Development List.

Each screen follows an identical pattern:
- **Backend**: 1 controller + C# record models + raw SqlClient queries
- **Frontend**: XxxPage.tsx + XxxList.tsx + XxxDetailPane.tsx + types.ts
- **Visual reference**: `C:/Projects/tsi-redesign` HTML pages

Screens are independent — no shared files, no cross-screen dependencies. This makes them ideal for parallel execution via agent teams.

---

## Team Structure

### Workflow

```
Lead (Joe's session)
  → assigns screens as tasks on shared task list
  → 3 × screen-builder teammates self-claim screens
  → each builder pings screen-reviewer on completion
  → reviewer approves or sends back with feedback
  → TaskCompleted hook blocks done status until reviewer approves
```

### Teammates

| Role | Count | Responsibility |
|------|-------|---------------|
| `screen-builder` | 3 | Build one complete screen at a time (backend → frontend). Self-claims next screen when done. |
| `screen-reviewer` | 1 | Validate each completed screen against tsi-redesign reference and CLAUDE.md standards. Approves or rejects with specific feedback. |

**Team size rationale:** 3 builders × ~5 tasks each = 15 task slots covers all 14 screens with room. 4 total teammates stays within the recommended 3–5 range.

---

## Display Mode

**Windows 11 = in-process mode only.** Split panes require tmux/iTerm2 which are not supported on Windows Terminal.

Set in `~/.claude.json`:
```json
{
  "teammateMode": "in-process"
}
```

Navigate teammates with `Shift+Down` to cycle. Press `Enter` to view a teammate's session, `Escape` to interrupt.

---

## Subagent Definitions

Two role definitions in `~/.claude/agents/`:

### `screen-builder.md`

System prompt covers:
- Full CLAUDE.md coding patterns (controller shape, frontend file structure, CSS var rules)
- Where to find the visual reference: `C:/Projects/tsi-redesign`
- Where to find the DB schema: `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`
- Workflow: build backend first, then frontend, then message `screen-reviewer` with screen name
- Never hardcode hex colors — all CSS vars from `tokens.css`
- Always `await using` for SqlConnection/SqlCommand
- Pagination pattern, stats on `/stats` route

### `screen-reviewer.md`

System prompt covers:
- Compare built screen against `C:/Projects/tsi-redesign` HTML reference
- Check design system compliance: no hardcoded hex, correct CSS vars, correct component patterns
- Check backend: controller shape, record types, pagination, stats route
- Check frontend: file structure (Page/List/DetailPane/types), split layout dimensions, tab behavior
- Respond to builder with explicit PASS or FAIL + itemized feedback
- On PASS: mark the task complete

---

## Quality Gates (Hooks)

Hooks in `.claude/settings.json` (project scope) enforce review before completion:

### `TaskCompleted` hook
Runs when a teammate tries to mark a task done. Blocks completion if the screen-reviewer has not sent a PASS for that screen.

Implementation: a lightweight shell script that checks a local approval log file written by the reviewer before allowing task completion.

### `TeammateIdle` hook
Runs when a builder goes idle. If the builder's current screen hasn't been reviewed yet, sends feedback to keep the builder waiting or to ping the reviewer.

---

## Task Structure

Each screen = 1 task on the shared task list. Lead creates all 14 tasks at team start.

**Task naming:** `build-screen-{ScreenName}` (e.g., `build-screen-Loaners`)

**Task body includes:**
- Screen name and route (from navItems.ts)
- Reference HTML file path in tsi-redesign
- Any known DB table(s) involved
- Special notes (e.g., full-width vs split layout)

No task dependencies — all screens are independent and can be claimed in any order.

---

## Superflow Integration

This team is designed for the superflow pattern:
- **Lead (Joe)** plans screen assignments and creates tasks
- **Builders** execute backend + frontend without interrupting the lead
- **Reviewer** gates quality autonomously
- Lead only intervenes if a screen gets rejected multiple times

Builders use `isolation: "worktree"` equivalent via separate context windows — they do not share file state, so no conflict risk.

---

## Files to Create

| File | Purpose |
|------|---------|
| `~/.claude/agents/screen-builder.md` | Reusable screen-builder teammate role |
| `~/.claude/agents/screen-reviewer.md` | Reusable screen-reviewer teammate role |
| `.claude/hooks/check-review-approval.sh` | TaskCompleted hook script |
| `.claude/settings.json` | Project-level hook registration |

---

## Screens — Phase 4 Backlog

| Screen | Route | Layout | Notes |
|--------|-------|--------|-------|
| Loaners | /loaners | split | |
| Financial | /financial | split | |
| Suppliers | /suppliers | split | |
| Scope Model | /scope-model | split | |
| Instruments | /instruments | split | |
| Onsite Services | /onsite-services | split | |
| Acquisitions | /acquisitions | split | |
| Product Sale | /product-sale | split | |
| Outsource Validation | /outsource-validation | split | |
| Reports | /reports | full-width | likely |
| Administration | /administration | full-width | likely |
| Workspace | /workspace | TBD | |
| EndoCarts | /endo-carts | split | |
| Development List | /development-list | full-width | likely |
