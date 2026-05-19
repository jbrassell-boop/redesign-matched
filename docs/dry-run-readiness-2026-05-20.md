# Happy-Plant Dry-Run Readiness — 2026-05-20

Follow-on to `smoke-test-findings-2026-05-19.md` and `multi-scope-lifecycle-findings-2026-05-19.md`. Yesterday I deep-walked Repairs + Receiving + the New Repair Wizard and shipped 6 fixes. Today I smoke-walked the 12 remaining modules — load each page, check for 500s, click one detail row, exercise one simple action. This doc rolls everything up into a green/yellow/red dry-run readiness assessment.

Host: <https://happy-plant-03638db0f.6.azurestaticapps.net>
API: <https://tsi-redesign-api.azurewebsites.net>

## TL;DR

**Ready for a focused 2-3 tester dry-run:** Yes. The Repair lifecycle path (Wizard → Cockpit → Status changes → QC → Shipping → Draft Invoice) is solid end-to-end.

**Ready for a full-team dry-run:** Not quite — three modules (Administration, GL Accounts, Onsite Services) are visibly broken in ways a tester would notice and report. Two of those are pending PRs (Steve has them queued).

## Module-by-module readiness

| Module | Status | Notes |
| --- | --- | --- |
| **Repairs cockpit** | 🟢 GREEN | Walked Flex/Rigid/Camera end-to-end yesterday. All 9 cockpit tabs render. Status changes, Next Stage, tech assignment, notes, draft invoice all work. Inspections tab shows correct OM05 form per scope type. |
| **New Repair Wizard** | 🟢 GREEN | 4-step Client→Dept→Scope→Intake. Scope-by-serial lookup works. |
| **Receiving** | 🟢 GREEN | Walk-in intake form works. Pending arrivals list empty (expected — happy-plant doesn't have migration 014 yet; portal pipeline is on Steve's plate). |
| **Dashboard / Workspace** | 🟢 GREEN | Performance is fast, stats accurate. |
| **Quality** | 🟢 GREEN | 5 tabs, 36,130 records load. Minor cosmetic: stat strip shows 300 vs table's 36,130 (likely location-filtered stat strip). |
| **Suppliers** | 🟡 YELLOW | List works (453 records). Role-count badges all show 0 (Parts/Repair/Acquisition/Carts) — supplier-role join broken. Detail tab works. |
| **Inventory** | 🟡 YELLOW | 442 items, renders fine. Two items have timestamp-as-name ("Added 01/09/2023 15:02:23") — placeholder data from a migration issue. 411 marked Low Stock (likely just min not configured). |
| **Repair Items** | 🟡 YELLOW | 2,049 items, renders fine. First row has empty description (null sName cosmetic bug). |
| **Outsource Validation** | 🟡 YELLOW | 833 records, real data. **VENDOR column empty for every row** — join broken. 623/833 marked negative-margin (75%) which is either a data quality issue or column definition mismatch. |
| **Scope Model** | 🟡 YELLOW | 10,769 records render. Manufacturer/Category/Length/Diameter/FOV columns **all empty for every row** — multiple joins broken or columns mapped wrong. |
| **Loaners** | 🟡 YELLOW | 2,013 records, real data. Detail panel has 4 bugs: "Invalid Date" on date columns, "0" raw user-key for Created By, status mismatch (list says Available, detail says Repair), tracking# field reused for free text. |
| **Endocarts (Carts)** | 🟡 YELLOW | Loads at `/endocarts` (URL `/carts` 404s — sidebar covers this). Data is **demo/seed** (clients like "HCA West Kendall", reps named "Sarah Chen") not real WinscopeWeb data. Testers will be confused if they look here. |
| **Acquisitions** | 🟡 YELLOW | Empty data, page renders. Either no data exists or join issue — needs investigation. |
| **Onsite Services** | 🔴 RED → 🟡 YELLOW | All zeros until Steve merges **PR #32** (port to real `tblSiteServices`). |
| **Financial / GL Accounts tab** | 🔴 RED | "Failed to load data" — `tblGP_InvoiceStaging` doesn't exist in WinscopeWeb. Other Financial tabs work; just GL Accounts. |
| **Administration** | 🔴 RED | All 4 endpoints (/stats, /users, /security-groups, /pricing-lists) return 500. Root cause: controller references `sFirstName`+`sLastName` but WinscopeWeb has `sUserFullName`. Same schema-mismatch pattern as Bug 5 yesterday. Admins can't manage users. |

## Recommended dry-run scope

**Tell testers to walk this happy path:**

1. Log in → Dashboard renders
2. Click + Work Orders → Repair Order → walk the 4-step wizard for a real customer
3. Search for a recent repair from the Repairs list, open the cockpit
4. Walk it forward via Next Stage from where it sits
5. Add a note, assign yourself as tech
6. Click Draft Invoice when at "Scheduled to Ship"
7. Look at Outgoing, Financials, History tabs

**Tell testers to scan (read-only) but not depend on:**

- Suppliers list, Inventory list, Repair Items catalog — fine to browse for spot-checking client data, but counts/columns will look off
- Quality QC Inspections list — fine to browse
- Receiving — pending arrivals always 0 (no portal pipeline yet)

**Tell testers to skip entirely until Steve merges PRs:**

- Administration (broken — fix not in queue yet, I should send a PR)
- Financial > GL Accounts (waiting on Avalara/GP integration design, deferred)
- Onsite Services (PR #32 in Steve's queue)
- Carts/Endocarts (demo data only — confusing if they look here)

## Pre-dry-run punch list

| # | Action | Owner |
| --- | --- | --- |
| 1 | Wait for Steve to merge **PRs #25, #32, #34, #52, #53, #54, #55** — closes 7 of the visible cosmetic bugs | Steve |
| 2 | Send a PR for **Administration sFirstName/sLastName → sUserFullName** fix (similar to Bug 5 — small ~20-line patch) | Me, next session |
| 3 | Decide whether to fix the **Outsource Validation vendor join** + **Scope Model joins** before dry-run, or accept the cosmetic gaps and tell testers | Joe call |
| 4 | Optionally fix **Loaner detail formatter bugs** (Invalid Date, raw userKey) — small, visible to any tester who clicks a loaner | Me, next session if Joe agrees |
| 5 | Pick **dry-run date + 2-3 testers + scenario doc** | Joe |
| 6 | Set up a **feedback channel** — shared Slack/Notes/etc where testers paste WO# + tab + what broke | Joe |

## My read on timing

If Steve merges what's queued + I fix Administration + Loaner detail in the next session, we could run a focused dry-run with 2-3 testers **end of next week**. Full team dry-run is probably 2-3 sessions further out — I'd want to also fix the data-display gaps in Outsource Validation and Scope Model, and at minimum diagnose Acquisitions and Suppliers role-counts.

The Repair lifecycle path itself is genuinely solid. That's the big one.
