# Invoice Finalize — Deferred Pieces (GP push, Crystal print, Avalara)

Date: 2026-06-05
Branch: `joe/po-create-flows` (worktree)
Endpoint shipped: `POST /api/repairs/{repairKey}/finalize-invoice` (`RepairsController.FinalizeInvoice`)

This documents the parts of the legacy invoice-finalize flow
(`WSRepairOpen.subInvoice`, ~line 20328) that were **intentionally NOT built**
in the cloud finalize endpoint, why, and what Steve / accounting must decide
before each can ship. Read alongside the endpoint, whose XML comment cross-refs
the legacy line numbers.

## What WAS built (for context)

The cloud finalize endpoint ports the **safe core** of the legacy FINAL branch:

- **Gates as hard 400s** (legacy silently downgrades to draft; an API should
  reject so the caller knows *why*): PO# required, ≥1 approved line item,
  tracking-if-tracking-required, outsource-vendor+cost-if-outsourced. Gate
  *conditions* mirror legacy `subInvoice` exactly. **All gate reads and the
  approved-total computation run INSIDE the transaction**, after acquiring
  `UPDLOCK,HOLDLOCK` on `tblRepair` and on the approved `tblRepairItemTran`
  set — so a concurrent line-item/repair edit cannot slip between "gates
  passed" and "amount written", and the invoice total is computed from the
  *same locked set* the detail insert reads (they can't diverge). Finalize
  rolls back if zero detail rows result.
- **Invoice state flip**: find-or-create the repair's single `tblInvoice` row,
  `bFinalized` 0→1, stamp dates. `lSalesRepKey` is populated from
  repair→dept→client on both create and flip (so GP staging and any future
  reader see a real rep).
- **Idempotent by default**: a plain `POST` against an **already-finalized**
  invoice is a no-op — it returns the existing invoice (`alreadyFinalized:true`)
  **without** bumping the suffix, rewriting detail, or re-staging. This prevents
  a retry / double-click from double-staging to GP after the first staging row
  has been drained. An **explicit** re-issue (`{ reissue: true, reason }` on the
  request body) is the only path that voids-and-re-stages: it bumps
  `sTranNumberSuffix` and replaces only its own *un-drained* staging row, never
  touching rows the on-prem job already processed (`bProcessed=1`).
- **Detail rows**: inserts `tblInvoiceDetl` from approved `tblRepairItemTran`
  (the draft path skips detail — finalize adds it).
- **GP staging**: writes one row to `dbo.tblGP_InvoiceStaging` — a faithful
  **inline C# port** of `dbo.invoiceAfterInsertNew` (that proc does **not**
  exist on the cloud DB; the staging **table** does). Guard, batch-number
  derivation, and GPID lookups match the legacy proc; the rep GPID is resolved
  by COALESCE over invoice→repair→dept→client (then the South-link `S`-prefix
  swap). The delete-then-insert only clears **un-drained** (`bProcessed=0`)
  rows, and only an explicit re-issue (not a plain retry) ever reaches it. The
  existing on-prem 30-minute job drains staging → GP.

Verified against `localhost\WinscopeWeb` in rolled-back transactions: fresh
finalize (North + South, create→detail→stage), gate reject under lock,
zero-total staging-skip, idempotent no-op preserving a seeded drained
(`bProcessed=1`) row without re-staging, and explicit re-issue (suffix bump +
re-stage with a non-empty rep GPID).

### DB-verification findings that shaped the build (2026-06-05)

Probed `localhost\WinscopeWeb` (the Dev `DefaultConnection`):

| Object | Exists on cloud DB? | Decision |
| --- | --- | --- |
| `dbo.invoiceInsert` | **No** | Don't call. Flip the lean draft row instead (matches the cloud's lean invoice model; the legacy 200-line address-snapshot insert is not reproduced). |
| `dbo.invoiceDetailInsert` | **No** | Port inline: INSERT `tblInvoiceDetl` from approved `tblRepairItemTran`. |
| `dbo.invoiceAfterInsertNew` | **No** | Port inline (see GP staging above). |
| `dbo.invoiceVoid` | **No** | Re-issue voids in place (`bIsVoid=1`/suffix bump), not via the proc. |
| `dbo.fnDatabaseKey()` | **No** | Cloud is single-DB; use WO-prefix (`S…`) for the South sales-rep-link swap instead of legacy North/South `lDatabaseKey` routing. |
| `dbo.fn_FormatDate`, `dbo.fn_DateDiffWeekDays` | Yes | Available, but staging batch uses `CONVERT(varchar(8), …, 112)` inline to avoid a proc dependency. |
| `tblInvoice` (incl. `bFinalized`, `sTranNumberSuffix`, `dtGPProcessDate`, audit cols) | Yes | Used directly. |
| `tblInvoiceDetl` (incl. `lRepairItemTranKey`, `dblItemAmount`, `dblItemValue`) | Yes | Used directly. |
| `dbo.tblGP_InvoiceStaging` | **Yes** (0 rows) | Staging is buildable — write directly. |
| Triggers on the 3 invoice tables | None | Clean inserts. |

Net: the staging path was reclassified from "defer (table missing)" to "build"
once the table was confirmed present and the proc logic was confirmed portable.

---

## DEFERRED #1 — Inline PO → GP push (`GPIntegratePO` / `GPIntegration.LoadPOs`)

**Legacy:** `subInvoice` ~line 20811 calls `GPIntegratePO(False)` after staging,
which pushes the vendor/outsource PO straight into Great Plains via
`GPIntegration.LoadPOs` (a direct GP company-DB connection).

**Why deferred:**
- The cloud API is hosted in Philly (BrightLogix); **GP is on-prem at
  `10.0.0.18` with `sa` creds**. The cloud has no route, no service account,
  and no business justification to reach into the on-prem GP box synchronously
  during a user request.
- The legacy call is itself a *synchronous side-effect of the Save button* —
  exactly the accounting pain point the cloud rebuild is meant to decouple
  (intent vs. confirmed; reconcile asynchronously).
- The endpoint already **stages** the invoice; the existing on-prem drain job
  handles invoice → GP. The PO push is a *separate* integration, not required
  for the invoice itself to reach GP.

**What Steve / accounting must decide:**
1. Does the **outsource PO** need to reach GP at finalize time, or can it ride
   the same staging-table + drain-job pattern as the invoice (preferred)?
2. If a dedicated push is required: network path Philly → on-prem GP, a scoped
   **service account** (not `sa`), and whether it's push (cloud → GP) or pull
   (on-prem job → cloud staging). Cloud-stages-only is the safer default.
3. Owner: Steve (integration) + Dave/Erin (GP accounts).

**Until decided:** finalize stages the invoice and returns `gpPushDeferred:true`.
No PO is pushed. Note: the legacy `GPIntegratePO` inline call was already
commented-out in the surrounding `LoadPOs` block (legacy ~20806-20809), so
production has been relying on the drain job + manual PO handling here anyway.

---

## DEFERRED #2 — Crystal Report invoice print/preview

**Legacy:** `subInvoice` ~line 20857 instantiates `ClassCrystalReport` and
renders the invoice (`frmtlkReportViewer`, Telerik/Crystal), with printer-tray
selection and copy counts.

**Why deferred:**
- Crystal / Telerik Reporting + `System.Drawing.Printing` printer-tray code is
  **Windows-desktop / full-framework**; it does not run in ASP.NET Core on
  Linux (the cloud host). There is no Crystal runtime in the container.
- Invoice-form generation is a known cloud gap (repair invoices are Crystal,
  "Steve only" per the reference notes); not something to reinvent under a
  finalize endpoint.

**What must happen:**
1. Choose a cloud-native render path: server-side **HTML → PDF** (e.g. a
   headless-Chromium or a .NET PDF lib) rebuilding the invoice layout, OR a
   thin service that still renders Crystal on a Windows box.
2. Decide whether print is even an *API* concern or a client-side
   "download PDF" affordance after finalize.
3. Owner: Steve (report templates).

**Until decided:** the client surfaces finalize success but no PDF. The existing
"Email Invoice" / "Create Label" buttons already show "requires configuration —
contact IT" placeholders; print follows the same posture.

---

## DEFERRED #3 — Avalara sales-tax transaction

**Legacy:** `subInvoice` ~line 20742-20775 calls
`clsTax.CreateAvalaraTransaction` (and `VoidAvalaraTranaction` on re-issue),
then writes the returned tax back via `dbo.invoiceUpdateSalesTax`.

**Why deferred:**
- Avalara is a live external tax service with **credentials + a company
  account**; calling it on finalize commits a real tax transaction. That needs
  accounting sign-off and the cloud's Avalara config — neither is in scope, and
  guessing it risks duplicate/incorrect tax filings.
- On the cloud DB the jurisdiction amounts (`dblJuris1/2/3Amt`) are currently
  null/zero, so staging's `dblTaxAmount` computes to 0 — **consistent and
  harmless**, just not Avalara-calculated.

**What must happen:**
1. Decide whether the cloud calls Avalara directly at finalize, or tax is
   computed elsewhere (GP, a batch job) and the cloud only records it.
2. Provision Avalara credentials + map the cloud's address/jurisdiction data.
3. Owner: Steve (integration) + accounting.

**Until decided:** finalize records `dblTaxAmount = juris1+2+3` (currently 0).
No Avalara call is made. `SalesTaxFlag` is left as-is on the invoice row.

---

## Other legacy steps intentionally NOT ported (lower-stakes)

These are real legacy side-effects of `subInvoice` that are out of scope for a
minimal-correct finalize and can be added later if the cloud needs them:

- **Report/bar-code tables** (`invoiceInstrument`, `invoiceReportNonInstrument`,
  `barCodeAddtoReport`) — feed Crystal; moot until print exists.
- **Loaner tran update** (`repairUpdateLoanerTran`), **first-repair flag**
  (`departmentUpdateFirstRepair`), **pricing-list update** (`UpdatePricingList`)
  — ancillary bookkeeping; revisit per business need.
- **Billed-invoice email to distributor / AR void email** — needs SMTP config
  (same "contact IT" posture as Email Invoice).
- **40-day rule & new-instrument-detail-without-tech gate** — apply to the
  **instrument** (`sRigidOrFlexible='I'`) path; this endpoint serves scope
  repairs (R/F/C) and rejects `I` with a 400. Port them with the instrument
  invoice flow.

## Schema note — no migration added

All objects the endpoint writes (`tblInvoice`, `tblInvoiceDetl`,
`tblGP_InvoiceStaging`) already exist on the cloud DB. **No migration was
added.** The missing legacy *procs/functions* were ported inline rather than
recreated as DB objects, so there is nothing to migrate. If a future decision is
to recreate `invoiceAfterInsertNew` as a real proc (e.g. to share with a batch
path), that becomes a deliberate migration + a Steve review.
