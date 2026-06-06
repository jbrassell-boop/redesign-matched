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
| **Every `pendingContract*` stored procedure** | ❌ **0 of any type** |
| `dbo.pendingContractConvert` | ❌ **absent** |
| `dbo.contractBillingScheduleCreate` | ❌ **absent** |
| `tblContractTypes` | ✅ but **empty** (0 rows) |
| `tblContractInstallmentTypes` (invoice freq) | ✅ but **empty** (0 rows) |

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

## 🔴 BLOCKED — the CONVERT engine

`POST /api/pending-contracts/{key}/convert` runs the **full pre-flight
validation** (ported from `frmPendingContractConvert.btnSave_Click`):

- invoice frequency selected,
- effective date valid,
- contract length is a whole number ≥ 1,
- termination ≥ effective,
- contract name non-empty **and unique** against `tblContract`,
- PO# non-empty and ≤ 20 chars,
- **all scopes carry a serial** (`lScopeKey != 0`); zero-scope is a soft confirm.

…and then returns **HTTP 501** because the two procedures that actually perform
the conversion are not provisioned in the cloud DB:

1. `dbo.pendingContractConvert` — inserts the `tblContract` row and migrates the
   pending scopes / departments / affiliates onto it (returns `lContractKey` +
   `ErrMsg`).
2. `dbo.contractBillingScheduleCreate` — builds the `tblContractInstallment`
   rows for the chosen invoice frequency.

The convert SP body is **not available to port** (it is not in this DB, and the
legacy production body was not transcribed — blindly re-authoring a financial
"create the real contract + billing schedule" procedure from memory is unsafe).
The `tblContract` target columns DO all exist (`sContractName1`,
`sContractNumber`, `dtDateEffective`, `dtDateTermination`,
`lContractLengthInMonths`, `lContractTypeKey`, `lInstallmentTypeID tinyint`,
`lSalesRepKey`, `lClientKey`, …), so the engine is reconstructable — it just
must be done deliberately, not faked.

### To unblock convert (options, pick one)
- **A. Port the SPs.** Obtain `dbo.pendingContractConvert` +
  `dbo.contractBillingScheduleCreate` from the legacy WinScopeNet DB
  (`sp_helptext`), review, and add them to the cloud DB via a migration. Then
  swap the controller's 501 stub for a real SP call. Lowest risk to behavior.
- **B. Re-implement inline.** Write the convert as a transaction in the
  controller (insert `tblContract`, copy scopes → `tblContractScope`, depts →
  `tblContractDepartments`, affiliates → `tblContractAffiliates`, mark the
  pending row `sStatus='Converted'`, then build installments). Requires a
  careful column-by-column spec of each target table + the billing-schedule
  math; must be transaction-safe and idempotent.

Either way it needs `tblContractTypes` and `tblContractInstallmentTypes` to be
**seeded** (both are currently empty), or the create modal / convert dialog
dropdowns have nothing to show. See "Seed data" below.

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
