# Agent Team Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure a 4-teammate agent team (3 screen-builders + 1 screen-reviewer) with quality-gate hooks so Phase 4 screens can be built in parallel with autonomous review.

**Architecture:** Subagent definitions in `~/.claude/agents/` define reusable roles. Builders claim tasks from a shared list, build backend then frontend, then message the reviewer. The reviewer writes an approval file on PASS; a `TaskCompleted` hook blocks completion until that file exists. A persistent Azure MCP server runs in a dedicated terminal.

**Tech Stack:** Claude Code agent teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1), bash hooks, ASP.NET Core 8 / React 19 / Ant Design 5 / Azure SQL

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `~/.claude.json` | Modify | Set `teammateMode: "in-process"` |
| `~/.claude/agents/screen-builder.md` | Create | Screen-builder role definition |
| `~/.claude/agents/screen-reviewer.md` | Create | Screen-reviewer role definition |
| `.claude/settings.json` | Create | Project-level hook registration |
| `.claude/hooks/task-completed.sh` | Create | Blocks task done until reviewer approves |
| `.claude/review-approvals/.gitkeep` | Create | Dir for reviewer approval files |

---

## Task 1: Set teammate display mode

**Files:**
- Modify: `~/.claude.json`

- [ ] **Step 1: Add teammateMode to global config**

Open `~/.claude.json` and add `"teammateMode": "in-process"` at the top level. The file already has other keys — add this alongside them:

```json
{
  "teammateMode": "in-process",
  "mcpServers": {
    "azure": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@azure/mcp@latest", "server", "start"],
      "env": {}
    }
  }
}
```

Use Python to safely merge (don't overwrite existing keys):

```bash
python3 -c "
import json, os
path = os.path.expanduser('~/.claude.json')
with open(path) as f:
    d = json.load(f)
d['teammateMode'] = 'in-process'
with open(path, 'w') as f:
    json.dump(d, f, indent=2)
print('done')
"
```

- [ ] **Step 2: Verify**

```bash
python3 -c "
import json, os
with open(os.path.expanduser('~/.claude.json')) as f:
    d = json.load(f)
print('teammateMode:', d.get('teammateMode'))
"
```

Expected output: `teammateMode: in-process`

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: set agent team display mode to in-process"
```

---

## Task 2: Create screen-builder subagent definition

**Files:**
- Create: `~/.claude/agents/screen-builder.md`

- [ ] **Step 1: Create the agents directory if needed**

```bash
mkdir -p ~/.claude/agents
```

- [ ] **Step 2: Write the screen-builder definition**

Create `~/.claude/agents/screen-builder.md` with this exact content:

```markdown
---
name: screen-builder
description: Builds complete screens (backend + frontend) for redesign-matched Phase 4. Claims a screen task, builds the ASP.NET Core controller + React pages, then messages screen-reviewer.
---

You are a screen builder for the TSI redesign-matched project — a full-stack rewrite of TSI WinScope.

## Your Stack
- **Backend**: ASP.NET Core 8 Web API, C#, raw Microsoft.Data.SqlClient (no EF Core)
- **Frontend**: React 19 + TypeScript + Ant Design 5, built with Vite
- **Database**: Azure SQL — tsi-sql-jb2026.database.windows.net / WinscopeNet
- **Visual reference**: C:/Projects/tsi-redesign — old HTML pages, these are the design spec
- **DB schema**: C:/Projects/tsi-redesign/tasks/db-schema-dump.json — verify column names here before writing SQL

## Your Workflow

1. Claim a `build-screen-{Name}` task from the shared task list
2. Read CLAUDE.md at the project root for full patterns and rules
3. Look up the screen's HTML reference in C:/Projects/tsi-redesign
4. Check DB schema in db-schema-dump.json for correct column names
5. Build backend first (controller → models), then frontend (types → api client → Page → List → DetailPane)
6. Message `screen-reviewer` with: "Ready for review: {ScreenName}"
7. Wait for PASS or FAIL feedback
8. On FAIL: fix the itemized issues, then message reviewer again
9. On PASS: mark the task complete

## Backend Pattern

Every controller follows this exact shape:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/{route}")]
[Authorize]
public class {Name}Controller(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        // build WHERE clause from params
        // count query first
        // data query with OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        // return Ok(new { items, totalCount, page, pageSize })
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id) { ... }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() { ... }
}
```

Rules:
- Always `await using` for SqlConnection and SqlCommand
- Pagination: `OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`
- Models are C# `record` types in `server/TSI.Api/Models/`
- Stats always on a separate `/stats` route
- Never use EF Core

## Frontend Pattern

File structure for every screen:

```
client/src/pages/{name}/
  {Name}Page.tsx       — container: split layout (flex row)
  {Name}List.tsx       — left panel 280px: search input + list items
  {Name}DetailPane.tsx — right panel: header + tab bar + tab panels
  types.ts             — TypeScript interfaces matching backend records
client/src/api/
  {name}.ts            — API functions using apiClient
```

Split layout template (RepairsPage.tsx is the reference):

```tsx
return (
  <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
    <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--neutral-200)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>{Title}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length} records</span>
      </div>
      <{Name}List ... />
    </div>
    <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
      <{Name}DetailPane ... />
    </div>
  </div>
);
```

## Design System Rules — CRITICAL

**Zero hardcoded hex in .tsx files. All colors use CSS variables.**

```css
/* Available tokens (defined in client/src/theme/tokens.css) */
--primary: #2E75B6      --navy: #1B3A5C         --sidebar: #1E293B
--danger: #B71234       --success: #16A34A      --warning: #F59E0B
--neutral-50/200/900    --muted: #6B7280        --card: #fff
--border: #E5E7EB       --border-dk: #B8C8E0    --primary-light: #E8F0FE

/* RGB tokens for rgba() — use these inside rgba(), NOT the hex vars */
--primary-rgb: 46, 117, 182
--danger-rgb: 183, 18, 52
--amber-rgb: 245, 158, 11
--navy-rgb: 27, 58, 92
--success-rgb: 22, 163, 74
--muted-rgb: 107, 114, 128
```

Usage: `rgba(var(--primary-rgb), 0.13)` — NOT `rgba(var(--primary), 0.13)`

Selected row in left panel: `borderLeft: '2px solid var(--amber)'` + `background: '#FEF3C7'`

## Route Registration

After building the page, add the route in `client/src/router.tsx`. Import the page and add:
```tsx
{ path: '/{route}', element: <RouteGuard><{Name}Page /></RouteGuard> }
```

## API Client

Add to `client/src/api/{name}.ts`:
```typescript
import apiClient from './client';
export const get{Name}s = (params: any) => apiClient.get('/{route}', { params }).then(r => r.data);
export const get{Name}Detail = (id: number) => apiClient.get(`/{route}/${id}`).then(r => r.data);
export const get{Name}Stats = () => apiClient.get('/{route}/stats').then(r => r.data);
```
```

- [ ] **Step 3: Verify file exists**

```bash
ls ~/.claude/agents/screen-builder.md
```

Expected: file listed

---

## Task 3: Create screen-reviewer subagent definition

**Files:**
- Create: `~/.claude/agents/screen-reviewer.md`

- [ ] **Step 1: Write the screen-reviewer definition**

Create `~/.claude/agents/screen-reviewer.md` with this exact content:

```markdown
---
name: screen-reviewer
description: Reviews completed screens for redesign-matched. Checks visual match against tsi-redesign reference, design system compliance, and backend/frontend patterns. Writes approval file on PASS.
---

You are the screen reviewer for the TSI redesign-matched project. You receive messages from screen-builder teammates when a screen is ready for review.

## Your Workflow

When a builder messages you "Ready for review: {ScreenName}":

1. Find the built screen files:
   - Backend: `server/TSI.Api/Controllers/{Name}Controller.cs` and `server/TSI.Api/Models/{Name}.cs`
   - Frontend: `client/src/pages/{name}/` (all .tsx files) and `client/src/api/{name}.ts`
2. Find the reference HTML: `C:/Projects/tsi-redesign/{name}.html` (try variations: lowercase, hyphenated)
3. Run your checklist (below)
4. Reply to the builder with PASS or FAIL + itemized findings
5. On PASS: write the approval file

## Review Checklist

### Backend
- [ ] Controller uses `[ApiController]`, `[Route("api/{route}")]`, `[Authorize]`
- [ ] Constructor takes `IConfiguration config`, creates connection via `new SqlConnection(config.GetConnectionString("DefaultConnection")!)`
- [ ] All SqlConnection and SqlCommand use `await using`
- [ ] Pagination uses `OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`
- [ ] Models are C# `record` types
- [ ] Stats endpoint exists on `/stats` route
- [ ] No EF Core (no DbContext, no .Include(), no LINQ to SQL)

### Frontend
- [ ] File structure: `{Name}Page.tsx`, `{Name}List.tsx`, `{Name}DetailPane.tsx`, `types.ts`
- [ ] API client file exists at `client/src/api/{name}.ts`
- [ ] Route registered in `client/src/router.tsx`
- [ ] Left panel is 280px wide, flex layout matches RepairsPage.tsx pattern
- [ ] **Zero hardcoded hex colors** in any .tsx file — grep for `#[0-9A-Fa-f]{3,6}` to check
- [ ] rgba() calls use `rgba(var(--{name}-rgb), opacity)` not `rgba(var(--{name}), opacity)`
- [ ] Selected row uses `borderLeft: '2px solid var(--amber)'` and `background: '#FEF3C7'`
- [ ] Tab active state: 2px bottom border + var(--primary) color + 600 weight, no background fill

### Visual Match
- [ ] Compare rendered structure against the reference HTML in C:/Projects/tsi-redesign
- [ ] Header area matches (title, action buttons)
- [ ] List panel matches (columns, search)
- [ ] Detail pane tab labels match

## Writing Approval

On PASS, write the approval file:

```bash
echo "APPROVED $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .claude/review-approvals/{screen-name}.approved
```

The screen-name should be lowercase-hyphenated (e.g., `loaners`, `scope-model`, `onsite-services`).

## Response Format

**PASS:**
```
PASS: {ScreenName}
All checks passed. Approval file written.
```

**FAIL:**
```
FAIL: {ScreenName}
Issues found:
1. [specific file:line] hardcoded color #2E75B6 — use var(--primary)
2. [ControllerName.cs] missing stats endpoint
3. [DetailPane] tab active state uses background fill — remove it
```
```

- [ ] **Step 2: Verify**

```bash
ls ~/.claude/agents/
```

Expected: both `screen-builder.md` and `screen-reviewer.md` listed

---

## Task 4: Create review approval directory and hook script

**Files:**
- Create: `.claude/review-approvals/.gitkeep`
- Create: `.claude/hooks/task-completed.sh`
- Create: `.claude/settings.json`

- [ ] **Step 1: Create approval directory**

```bash
mkdir -p .claude/review-approvals
touch .claude/review-approvals/.gitkeep
```

- [ ] **Step 2: Create the hook script**

Create `.claude/hooks/task-completed.sh`:

```bash
#!/usr/bin/env bash
# TaskCompleted hook — blocks task completion until screen-reviewer has approved.
# Claude Code passes event data as JSON on stdin.

set -euo pipefail

# Read the task data from stdin
INPUT=$(cat)

# Extract task title (e.g. "build-screen-Loaners")
TASK_TITLE=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null || echo "")

# Only gate tasks that follow the build-screen-* pattern
if [[ "$TASK_TITLE" != build-screen-* ]]; then
  exit 0
fi

# Derive screen name: strip prefix, lowercase, replace spaces with hyphens
SCREEN=$(echo "$TASK_TITLE" | sed 's/^build-screen-//' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

APPROVAL_FILE=".claude/review-approvals/${SCREEN}.approved"

if [ -f "$APPROVAL_FILE" ]; then
  exit 0
fi

echo "BLOCKED: Screen '${SCREEN}' has not been approved by screen-reviewer yet. Message screen-reviewer to request review before marking this task complete."
exit 2
```

- [ ] **Step 3: Make hook executable**

```bash
chmod +x .claude/hooks/task-completed.sh
```

- [ ] **Step 4: Create project settings.json to register hooks**

Create `.claude/settings.json`:

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/task-completed.sh"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Verify hook runs correctly for a non-screen task (should exit 0)**

```bash
echo '{"title": "some-other-task"}' | bash .claude/hooks/task-completed.sh
echo "Exit code: $?"
```

Expected: no output, exit code 0

- [ ] **Step 6: Verify hook blocks a screen task without approval**

```bash
echo '{"title": "build-screen-Loaners"}' | bash .claude/hooks/task-completed.sh
echo "Exit code: $?"
```

Expected:
```
BLOCKED: Screen 'loaners' has not been approved by screen-reviewer yet. ...
Exit code: 2
```

- [ ] **Step 7: Verify hook passes after approval file exists**

```bash
echo "APPROVED test" > .claude/review-approvals/loaners.approved
echo '{"title": "build-screen-Loaners"}' | bash .claude/hooks/task-completed.sh
echo "Exit code: $?"
rm .claude/review-approvals/loaners.approved
```

Expected: no output, exit code 0

- [ ] **Step 8: Commit**

```bash
git add .claude/
git commit -m "feat: add agent team hooks and review approval scaffold"
```

---

## Task 5: Configure Azure MCP as persistent terminal process

**Files:** None — runtime only

- [ ] **Step 1: Update Claude Code to point at localhost instead of npx**

This was already done in the session (azure MCP pointing at `http://localhost:5008`). Verify:

```bash
claude mcp list
```

Expected:
```
azure: http://localhost:5008 (HTTP) - ✗ Failed to connect
```

(Failed is expected — the server isn't running yet)

- [ ] **Step 2: Create a startup script for the Azure MCP server**

Create `.claude/start-azure-mcp.sh`:

```bash
#!/usr/bin/env bash
# Run in a dedicated terminal. Keeps Azure MCP server alive on port 5008.
echo "Starting Azure MCP server on port 5008..."
npx -y @azure/mcp@latest server start --transport http --port 5008
```

```bash
chmod +x .claude/start-azure-mcp.sh
```

- [ ] **Step 3: Commit**

```bash
git add .claude/start-azure-mcp.sh
git commit -m "chore: add Azure MCP startup script"
```

- [ ] **Step 4: Document usage**

To activate before any Claude Code session:
```bash
# Open a dedicated terminal and run:
bash .claude/start-azure-mcp.sh
# Leave it running. Claude Code connects automatically.
```

---

## Task 6: Verify full team setup

**Files:** None — verification only

- [ ] **Step 1: Start the Azure MCP server in a separate terminal**

```bash
bash .claude/start-azure-mcp.sh
```

- [ ] **Step 2: In Claude Code, verify MCP connection**

```bash
claude mcp list
```

Expected:
```
azure: http://localhost:5008 (HTTP) - ✓ Connected
```

- [ ] **Step 3: Verify subagent definitions are discoverable**

In a Claude Code session, ask Claude:
```
What subagent types are available?
```

Expected: `screen-builder` and `screen-reviewer` should appear in the list.

- [ ] **Step 4: Run a smoke-test team**

In Claude Code:
```
Create a small agent team: spawn one screen-builder teammate and one screen-reviewer teammate. Have the builder say hello to the reviewer and the reviewer respond. Then clean up the team.
```

Expected: Both teammates spawn, exchange messages via SendMessage, team cleans up.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "chore: complete agent team infrastructure setup"
```

---

## Phase 4 Launch Prompt (reference)

Once setup is verified, use this prompt to kick off Phase 4 builds:

```
Create an agent team for Phase 4 screen builds. Spawn 3 teammates using the screen-builder agent type and 1 teammate using the screen-reviewer agent type.

Create tasks for these 14 screens (all independent, no dependencies):
- build-screen-Loaners (route: /loaners, layout: split, ref: C:/Projects/tsi-redesign/loaners.html)
- build-screen-Financial (route: /financial, layout: split)
- build-screen-Suppliers (route: /suppliers, layout: split)
- build-screen-ScopeModel (route: /scope-model, layout: split)
- build-screen-Instruments (route: /instruments, layout: split)
- build-screen-OnsiteServices (route: /onsite-services, layout: split)
- build-screen-Acquisitions (route: /acquisitions, layout: split)
- build-screen-ProductSale (route: /product-sale, layout: split)
- build-screen-OutsourceValidation (route: /outsource-validation, layout: split)
- build-screen-Reports (route: /reports, layout: full-width)
- build-screen-Administration (route: /administration, layout: full-width)
- build-screen-Workspace (route: /workspace, layout: TBD)
- build-screen-EndoCarts (route: /endocarts, layout: split)
- build-screen-DevelopmentList (route: /development-list, layout: full-width)

Builders self-claim tasks. Each builder should message screen-reviewer when a screen is ready. Do not mark tasks complete until reviewer sends PASS.
```
