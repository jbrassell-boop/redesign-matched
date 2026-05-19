# Happy-Plant WO Lifecycle Smoke Test — 2026-05-19

Test repair: **SR26138019** (lRepairKey 579184) — IBI Healthcare - GA, Surgery dept, scope LTF-VH.
Host: <https://happy-plant-03638db0f.6.azurestaticapps.net>
API: <https://tsi-redesign-api.azurewebsites.net>
DB: Azure SQL `tsi-sql-rm-8067.WinscopeWeb` (BACPAC of prod data, 2026-05-18).

## Scope of test

Walk the cockpit (`/repairs/579184`) through every tab and the two header workflow buttons (Next Stage, Change Status), plus tech assignment and note creation. The goal was to surface every gap Steve will hit on smoke-test day before he hits it.

## Pass / fail by surface

| Surface | Result | Notes |
| --- | --- | --- |
| Scope In tab | PASS | Inbound shipping, ship/bill addresses, sales rep "Debbie Hightower", pricing "Hospital 2026", invoice options all populated. |
| Details tab | PASS w/ caveat | Renders but **Next Stage button shows "null"** — see Bug 1. |
| Outgoing tab | PASS | Outbound shipping + invoice draft/email/void buttons present. |
| Expense tab | PASS | Labor / Inventory / Shipping / Outsource / Commission / GPO breakdown; margin calc. |
| Inspections tab | PASS | D&I Intake marked Recorded (OM05-1); Post-Repair section reachable. |
| Financials tab | PASS | Revenue / Margins / Expenses sections (all $0 on this WO — expected). |
| History tab | PASS | Scope lifecycle stats; repair list. |
| Status Log tab | PASS w/ caveat | All entries display "12:00 AM" — `tblRepairStatusLog.ChangeDate` is a `DATE` column, not `DATETIME`. UI loses the change time. |
| Notes tab | PASS w/ caveat | POST + GET both 200. Note saved. **Author shows "System"** instead of the logged-in user — current-user-from-JWT capture missing. |
| Change Status flow | PASS (after fix) | Modal confirms picked status; PUT /status now writes header + log. Initially 500'd — see Bug 2. |
| Next Stage flow | FAIL | See Bug 1. |
| Update Techs flow | PASS | Modal picker; PUT updates `tech` + `techKey` correctly. **Picker is a single mixed list** of internal techs + outsource vendors + oddities (000, AED, AES) — see Bug 3. |

## Bugs / gaps

### Bug 1 — Next Stage prompt says "Move this repair to 'null'?" (NOT FIXED)

**Where:** `client/src/pages/repairs/RepairDetailPane.tsx:64-78` (`STATUS_NEXT_MAP`) and lines 353-356.

**Root cause:** `GET /api/repairs/statuses` (`RepairsController.cs:678-704`) filters with `WHERE ISNULL(bIsReadOnly, 0) = 0`. That excludes the system-managed milestone statuses (IDs 1, 6, 10, 12, 13 — Waiting on Inspection, Waiting for Approved, Scheduled to Ship, Scheduled to Ship Tomorrow, Shipping Today or Tomorrow). The frontend uses this list both to populate the Change Status dropdown (correct — these shouldn't be manually pickable) AND to look up the *display name* of the next status from `STATUS_NEXT_MAP`. The lookup misses, returns undefined, and `\`Move this repair to "${nextStatusName}"?\`` renders the JS string `null`.

**Fix:** the cleanest path is to change `STATUS_NEXT_MAP` from `Record<number, number>` to `Record<number, { id: number; name: string }>` so display name doesn't depend on the dropdown list. Alternative: backend `/repairs/statuses?includeReadOnly=true`.

**Impact:** the Next Stage button is unusable. Change Status is still available as a workaround, so this is annoying but not blocking smoke testing.

### Bug 2 — PUT /repairs/{id}/status returned 500 (FIXED, commit 36a831a)

**Where:** `server/TSI.Api/Controllers/RepairsController.cs:723-726` (and a sibling INSERT at line 663).

**Root cause:** the INSERT into `tblRepairStatusLog` named the timestamp column `dtStatusChange` (and `dtStatusDate` in the sibling INSERT). Actual column per the schema and the legacy `emailSalesRepReport.sql` proc is **`ChangeDate`**.

**Fix shipped:** commit `36a831a` renames both to `ChangeDate`. Verified end-to-end after deploy: PUT returns 200 and the status-history endpoint shows the new entry.

**Latent risk found while fixing:** the `UPDATE tblRepair` + `INSERT tblRepairStatusLog` pair is **not wrapped in a transaction**. The very test case that exposed the bug demonstrated the failure mode: status mutated but log entry missing. Recommend wrapping in `await using var tx = conn.BeginTransaction();` and committing only after both writes succeed.

### Bug 3 — Current user not captured for status changes or note authorship

**Where:**
- `tblRepairStatusLog` is INSERTed without a `lUpdated_UserKey` (the API doesn't extract claim from JWT and pass it).
- Notes save with author = "System" instead of "JBrassell".

**Impact:** any audit trail across the system loses the "who did what". Should be a single change at the auth layer that flows through every controller that touches the user-attributable columns.

### Bug 4 — Status Log loses the change time

`tblRepairStatusLog.ChangeDate` appears to be a `DATE` not `DATETIME`. UI shows every entry at `12:00 AM`. If sub-day ordering matters for ops, this needs the column promoted (additive ALTER, safe on prod) and `GETDATE()` to start writing the time portion.

### Bug 5 — Tech picker mixes humans + vendors

The Update Technicians dropdown contains internal techs (Joe Brassell, Allen Martello, Bill Hurd…), outsource vendors (Olympus, Storz, Quality Surgical Repairs…), and questionable entries (000, AED, AES). For repair-tech assignment vs outsource routing these should be separate picklists.

## What was fixed in this session

| Commit | Files | Why |
| --- | --- | --- |
| 36a831a | `server/TSI.Api/Controllers/RepairsController.cs` | Rename `dtStatusChange` / `dtStatusDate` → `ChangeDate` so status changes log correctly. |

Auto-deployed via `deploy-server.yml` (30s build+deploy). Verified live.

## Test data left on the repair

The test changed SR26138019:

- Status: Received → In the Drying Room (then) → Additional Evaluation Time Needed.
- Primary technician: Joe Brassell (techKey 60).
- One Notes-tab entry from "System" dated 5/19/2026 at 6:06 PM, body starting `[smoke-test 5/19] …`.

The "In the Drying Room" status log row is missing because that change happened *before* the column-name fix was deployed.

## Recommended order of attack

1. **Bug 1** — frontend two-line change to `STATUS_NEXT_MAP`. Unblocks Next Stage button.
2. **Bug 3 + Bug 4** — group together: capture current user from JWT, write to `Created_UserKey` / `Updated_UserKey` / `lAuthorUserKey` columns, and promote `ChangeDate` to `DATETIME` so the moment is preserved.
3. **Bug 5** — split the tech picker. UX call, no urgency.
4. Wrap the UPDATE + INSERT in a transaction (Bug 2 followup).
