# Pending Contracts — deferred / blocked items

Feature: deal origination ("pending contracts") in the redesign-matched cloud
stack. A deal-in-progress is staged in five dedicated tables
(`tblPendingContract*`) separate from `tblContract`, assembled
(scopes / departments / affiliates), and finally **converted** into a real
`tblContract`.

This note records what was built, what was intentionally deferred, and the one
piece that is **blocked** in the cloud database.

---

## DB reality (verified 2026-06-05, `localhost` → `WinscopeWeb`)

| Object | Present? |
|---|---|
| `tblPendingContract` | ✅ (IDENTITY `lPendingContractKey`) |
| `tblPendingContractScope` | ✅ (IDENTITY `lPendingContractScopeKey`) |
| `tblPendingContractDepartments` | ✅ (composite PK `lPendingContractKey,lDepartmentKey`) |
| `tblPendingContractAffiliates` | ✅ (composite PK `lPendingContractKey,lDepartmentKey`) |
| `tblPendingContractAgreementTemplates` | ✅ (empty — 0 rows) |
| `dbo.pendingContractConvert` | ✅ **provisioned by migration 002** (ported verbatim) |
| `dbo.contractBillingScheduleCreate` | ✅ **provisioned by migration 002** (ported verbatim) |
| `tblContractTypes` | ✅ **seeded by migration 002** (6 rows) |
| `tblContractInstallmentTypes` (invoice freq) | ✅ **seeded by migration 002** (5 rows) |

All five tables carry the cloud audit columns
(`Created_UserKey/_datetime`, `Updated_*`, `Deleted_*`) and all five were
empty at build time.

### Consequence for the backend
The legacy app (and a separate prior cloud attempt under
`C:\Projects\Total-Scope-Inc`) wrap a large family of `pendingContract*` stored
procedures. **None of those procedures exist in the cloud DB.** Rather than
wrap procs that aren't there, `PendingContractsController` talks to the five
tables directly with inline parameterized SQL — the established convention in
this codebase (`ContractsController`, `DepartmentsController`). Every CRUD /
scopes / departments / affiliates path was verified end-to-end against the live
schema in a rolled-back transaction.

---

## ✅ RESOLVED — the CONVERT engine (migration 002, 2026-06-06)

`POST /api/pending-contracts/{key}/convert` runs the **full pre-flight
validation** (ported from `frmPendingContractConvert.btnSave_Click`):

- invoice frequency selected,
- effective date valid,
- contract length is a whole number ≥ 1,
- termination ≥ effective,
- contract name non-empty **and unique** against `tblContract`,
- PO# non-empty and ≤ 20 chars,
- **all scopes carry a serial** (`lScopeKey != 0`); zero-scope is a soft confirm.

…and then **EXECs the two real procedures** (was HTTP 501):

1. `dbo.pendingContractConvert` — inserts the `tblContract` row and migrates the
   pending scopes / departments / affiliates onto it, flips the pending row to
   `sStatus='Converted'`, returns `(lContractKey, ErrMsg)`. Self-manages its own
   transaction (a non-empty `ErrMsg` means it caught an error and rolled back).
2. `dbo.contractBillingScheduleCreate` — builds the `tblContractBillSchedule`
   rows for the chosen invoice frequency.

**How it was provisioned:** `server/migrations/002_pending_contract_convert.sql`
scripts both procedures **verbatim** from production WinScopeNet
(`10.0.0.15\Goldmine`) — the only change is `CREATE` → `CREATE OR ALTER`. Both
are pure single-DB DML (no linked servers, no `fnDatabaseKey`, no `THROW`), and a
column-by-column manifest of everything they touch was diffed against the live
cloud schema (all present; no unpopulated NOT-NULL/no-default columns) before
porting. The migration also seeds `tblContractTypes` (6) +
`tblContractInstallmentTypes` (5) with the exact legacy keys/text — the values
are load-bearing because the schedule proc branches on the literal strings
`'CPO'`, `'Once'`, `'Monthly'`, `'Quarterly'`, `'Annual'`.

**Verified end-to-end (rolled back, no artifacts):** a staged Capitated-Service /
Monthly / 12-month pending contract converted to a `tblContract` with 2 scopes +
1 dept + 1 affiliate migrated, `dblAmtTotal`/`dblAmtInvoiced` computed correctly,
**12 monthly schedule rows** (Jan–Dec 2026 @ $100), and the pending row flipped
to `Converted`.

**C# wiring** (`PendingContractsController.ConvertToContract`): the convert proc
is called standalone (it owns its transaction); the schedule proc — which has no
internal transaction — is wrapped in its own `SqlTransaction` so its rows are
all-or-nothing. A schedule failure is **non-fatal** (the contract is already
committed): the endpoint returns 200 with `scheduleBuilt=false` and the schedule
is regenerable.

> **Deploy note:** migration 002 must be applied to each target WinscopeWeb DB
> (it is idempotent). It is already applied to `localhost\WinscopeWeb`.

---

## ⏸ DEFERRED — CSA "Create Agreement"

Legacy CSA generation (`pendingContractAgreementGet` + a Word template under
`tblPendingContractAgreementTemplates`) ran **server-side Word COM automation
while impersonating an admin** to mail-merge a `.docx`. That model does not port
to the cloud (no Office/COM on the host, no desktop impersonation).

Deferred to a future **templated-PDF** effort (server-side HTML/PDF render or a
headless doc service). The UI exposes a "Create Agreement" button that shows a
DevNotice explaining the deferral rather than calling anything.

---

## ⏸ DEFERRED — access gating

Legacy restricted pending-contract **delete** (and some assemble actions) to
**five named users**. The cloud has no equivalent per-user allow-list yet, only
a coarse `Admin` / `User` role from the JWT (`ClaimTypes.Role`).

Current behavior:
- `DELETE /{key}` is gated on `User.IsInRole("Admin")` (server) and the Delete
  button only renders for Admins (client).

Future: introduce a dedicated claim/permission (e.g. `contracts:origination`)
or a named allow-list table so non-admin deal owners can manage their own
pipeline without full Admin.

---

## ⏸ BEST-EFFORT (partial) — the assemble workspace

Built and fully functional:
- **List** page (Active / All-incl-Dead filter, red "Dead" badge, search).
- **New Pending Contract** modal (client + type + auto-named, server-side dedup).
- **Detail** pane with **Specifications** (read-only summary) and the
  **convert-critical Scopes sub-grid** — add inventory scope, add a model-only
  line, **assign a serial to promote a model-only line**, remove. The
  all-serials-required rule is surfaced inline.
- **Departments** and **Affiliates** tabs (add available / remove, with
  composite-PK revive-or-insert so re-adding a removed link does not error).
- **Convert** dialog (effective date, length→auto termination, PO# ≤ 20,
  invoice frequency, auto contract name, client-side guards mirroring legacy).

Deferred (stubbed with a DevNotice on the Specs tab):
- Inline **edit** of header fields (address, sales rep, term, agreement
  template). The backend `PATCH /{key}` already supports all of these — only the
  editable Specs UI is unbuilt.
- A dedicated **Notes** tab.
- Model-only scope quantity / unit-cost inline editing UI (the backend
  `PATCH /{key}/scopes/{rowKey}` supports `quantity`/`unitCost`/`cost`).

---

## Seed data needed (independent of code)

These lookups are empty in the cloud DB and should be seeded for the feature to
be usable end-to-end:
- `tblContractTypes` — the contract-type dropdown (create modal).
- `tblContractInstallmentTypes` — the invoice-frequency dropdown (convert).
- `tblPendingContractAgreementTemplates` — only needed once CSA generation is
  un-deferred.

---

## Backend surface (for reference)

`api/pending-contracts`
- `GET /` (`search`, `includeInactive`, paging) · `GET /{key}`
- `POST /` (create + auto-name dedup) · `PATCH /{key}` · `DELETE /{key}` (admin)
- `GET /{key}/scopes` · `/scopes/available` · `POST /scopes` (inventory) ·
  `POST /scopes/models` (model-only) · `PATCH /scopes/{rowKey}` (cost/qty/serial) ·
  `DELETE /scopes/{rowKey}`
- `GET /{key}/departments` · `/departments/available` · `POST /departments` ·
  `DELETE /departments/{deptKey}`
- `GET /{key}/affiliates` · `/affiliates/available` · `POST /affiliates` ·
  `DELETE /affiliates/{deptKey}`
- `GET /agreement-templates`
- `POST /{key}/convert` — **pre-flight real, engine 501 (blocked)**

Lookups added: `GET /api/lookups/contract-types`,
`GET /api/lookups/invoice-frequencies`.
