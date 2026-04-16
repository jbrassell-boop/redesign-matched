# Site Service Invoice Form — Design Spec
Date: 2026-04-16

## Developer Quick Start

This feature is designed to be a near-copy of the existing repair invoice. The fastest path:

1. **Copy** `client/src/pages/repairs/forms/InvoiceForm.tsx` → `client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx`
2. **Copy** `client/src/pages/repairs/forms/InvoiceForm.css` → `client/src/pages/onsite-services/SiteServiceInvoiceForm.css` (rename all `.inv-` prefixes to `.ssi-` only where you add new rules — reuse `.inv-*` classes as-is for shared sections)
3. **Replace** the repairs line-items table with the 7-column tray table (see §5 below)
4. **Remove** the signature block and remittance stub
5. **Remove** the Shipping row from the totals block
6. **Add** one new API endpoint (see §Backend Changes)
7. **Add** one "Print Invoice" button to `OnsiteServiceDetailDrawer`

Everything else — overlay, action bar, envelope zone, meta strip, ref grid, totals, payment note, footer — is a straight copy with field names swapped.

---

## Overview

A print-optimized React component that generates an invoice for a completed onsite service visit. Mirrors the visual format of the existing `InvoiceForm.tsx` (repairs invoice) — same CSS tokens, same layout skeleton — but with site-service-specific fields and a tray breakdown table instead of line items.

Triggered via a "Print Invoice" button in `OnsiteServiceDetailDrawer`, available on Submitted and Invoiced visits.

---

## Reference

- **Existing pattern to mirror:** `client/src/pages/repairs/forms/InvoiceForm.tsx` + `InvoiceForm.css`
- **Real invoice PDFs:** `J:\Winscope - Site Service Template\SiteServiceInvoice_NV26*.pdf`
- **Original Word template:** `J:\Winscope - Site Service Template\SiteServiceInvoice.docx`
- **Backend controller:** `server/TSI.Api/Controllers/OnsiteServicesController.cs`
- **Schema:** `tblSiteServices`, `tblSiteServiceTrays`, `tblClient`, `tblDepartment`, `tblTechnicians`

---

## Page Structure

Same 8.5in × 11in printable page shell as `InvoiceForm.tsx`. Sections top to bottom:

### 1. Envelope Zone
- **Left — Bill To block:** `sBillName1`, `sBillName2` (if present), `sBillEmail` — matches #10 window envelope position
- **Right — TSI header:** logo, address, large "Invoice" title (identical to repairs)

### 2. Meta Strip (4-column grid, navy border)
| Cell | Repairs | Site Service |
|------|---------|--------------|
| 1 (highlighted) | Invoice # | Invoice # (`sWorkOrderNumber`) |
| 2 | Invoice Date (today) | **Visit Date** (`dtOnsiteDate`) |
| 3 | Due Date | Due Date (blank — not in schema) |
| 4 | Terms | **Terms** (`sTermsDesc` via `tblDepartment.lPaymentTermsKey → tblPaymentTerms`) |

### 3. Reference Grid (4-column, 2 rows)
| Position | Field | Source |
|----------|-------|--------|
| col 1 | Work Order # | `sWorkOrderNumber` |
| col 2 | Visit Date | `dtOnsiteDate` |
| col 3 | Mobile Tech | `sTechName` (via `tblTechnicians`) |
| col 4 | Truck # | `sTruckNumber` |
| col 1–2 (span) | Client / Account | `sClientName1` (via `tblClient`) |
| col 3–4 (span) | Department | `sDepartmentName` (via `tblDepartment`) |
| col 1–2 (span) | Purchase Order # | `sPurchaseOrder` |
| col 3–4 (span) | Trays / Instruments | `lTrayCount` / `lTotalInstruments` |

### 4. Section Bar
Navy bar labeled **"Service Summary"** (same `.inv-sb` class as repairs).

### 5. Tray Breakdown Table
Replaces the repairs line-items table. Columns match the real Word-merge output:

| # | Description | Instruments | Inspected | Repaired | Sent to TSI | BER |
|---|-------------|-------------|-----------|----------|-------------|-----|

- **Inspected** = calculated client-side: `instrumentsCount - repairedCount - sentToTsiCount - beyondEconomicalRepairCount`
- Color coding on counts (screen only, not on print): Repaired = green, Sent to TSI = blue, BER = red
- **Footer totals row** summing all numeric columns
- No per-tray cost column — cost is only shown in the totals block

### 6. Totals Block (right-aligned, 260px wide)
| Row | Value |
|-----|-------|
| Subtotal | `nInvoiceAmount` |
| Tax | `nTaxAmount` |
| **Amount Due** | `nInvoiceAmount` (bold, highlighted) |

No Shipping row (unlike repairs invoice).

### 7. Payment Note
Identical text to repairs invoice:
> Payment due within 30 days of invoice date. Please include invoice number on your remittance. Make checks payable to **Total Scope Inc.** ACH/Wire transfer available upon request.

### 8. Footer
Identical to repairs: `ISO 13485 Certified | Total Scope Inc. | 17 Creek Pkwy... | Page 1 of 1`

**Removed vs. repairs invoice:** Signature block (Authorized By / Date), Remittance stub, Shipping totals row.

---

## Data Model

### Field Map — exact names at every layer

| DB Column (`tblSiteServices`) | C# Property | TypeScript Key | Used For |
|-------------------------------|-------------|----------------|----------|
| `lSiteServiceKey` | `OnsiteServiceKey` | `onsiteServiceKey` | record ID |
| `sWorkOrderNumber` | `InvoiceNum` | `invoiceNum` | Invoice # / WO# |
| `dtOnsiteDate` | `VisitDate` | `visitDate` | Visit Date (formatted MM/dd/yyyy) |
| `sTruckNumber` | `TruckNumber` | `truckNumber` | Truck # |
| `sPurchaseOrder` | `PurchaseOrder` | `purchaseOrder` | PO # |
| `lTrayCount` | `TrayCount` | `trayCount` | Trays / Instruments label |
| `lTotalInstruments` | `InstrumentCount` | `instrumentCount` | Trays / Instruments label |
| `nInvoiceAmount` | `InvoiceAmount` | `invoiceAmount` | Subtotal |
| `nTaxAmount` | `TaxAmount` | `taxAmount` | Tax |
| `sBillName1` | `BillName1` | `billName1` | Bill To line 1 |
| `sBillName2` | `BillName2` | `billName2` | Bill To line 2 (contact name) |
| `sBillEmail` | `BillEmail` | `billEmail` | Bill To email |

**Joined fields:**

| Source | DB Column | C# Property | TypeScript Key |
|--------|-----------|-------------|----------------|
| `tblClient` | `sClientName1` | `ClientName` | `clientName` |
| `tblDepartment` | `sDepartmentName` | `DeptName` | `deptName` |
| `tblTechnicians` | `sTechName` | `TechName` | `techName` |
| `tblPaymentTerms` (via `tblDepartment.lPaymentTermsKey`) | `sTermsDesc` | `TermsDesc` | `termsDesc` |

**Tray fields** (existing `GET /api/onsite-services/{id}/trays` — no changes):

| DB Column (`tblSiteServiceTrays`) | C# Property | TypeScript Key |
|-----------------------------------|-------------|----------------|
| `lSiteServiceTrayKey` | `TrayKey` | `trayKey` |
| `lTrayNumber` | `TrayNumber` | `trayNumber` |
| `sTrayName` | `TrayName` | `trayName` |
| `lInstrumentsCount` | `InstrumentsCount` | `instrumentsCount` |
| `lRepairedCount` | `RepairedCount` | `repairedCount` |
| `lSentToTSICount` | `SentToTsiCount` | `sentToTsiCount` |
| `lBeyondEconomicalRepairCount` | `BeyondEconomicalRepairCount` | `beyondEconomicalRepairCount` |
| `lReplacedCount` | `ReplacedCount` | `replacedCount` |
| *(calculated)* | *(calculated)* | `inspectedCount` = `instrumentsCount - repairedCount - sentToTsiCount - beyondEconomicalRepairCount` |

---

### New API endpoint: `GET /api/onsite-services/{id}/invoice`

Extends the existing `GetDetail` query with billing and financial fields not currently returned:

```sql
SELECT
  ss.lSiteServiceKey,
  ss.sWorkOrderNumber,
  ss.dtOnsiteDate,
  ss.sTruckNumber,
  ss.sPurchaseOrder,
  ss.lTrayCount,
  ss.lTotalInstruments,
  ISNULL(ss.nInvoiceAmount, 0) AS nInvoiceAmount,
  ISNULL(ss.nTaxAmount, 0)     AS nTaxAmount,
  ISNULL(ss.sBillName1, '')    AS sBillName1,
  ISNULL(ss.sBillName2, '')    AS sBillName2,
  ISNULL(ss.sBillEmail, '')     AS sBillEmail,
  ISNULL(c.sClientName1, '')    AS sClientName1,
  ISNULL(d.sDepartmentName, '') AS sDepartmentName,
  ISNULL(t.sTechName, '')       AS sTechName,
  ISNULL(pt.sTermsDesc, '')     AS sTermsDesc
FROM tblSiteServices ss
LEFT JOIN tblClient       c  ON c.lClientKey      = ss.lClientKey
LEFT JOIN tblDepartment   d  ON d.lDepartmentKey  = ss.lDepartmentKey
LEFT JOIN tblTechnicians  t  ON t.lTechnicianKey  = ss.lTechnicianKey
LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = d.lPaymentTermsKey
WHERE ss.lSiteServiceKey = @id
```

Trays are fetched via the existing `GET /api/onsite-services/{id}/trays` endpoint — **no changes needed**.

### New TypeScript interface: `OnsiteServiceInvoiceData`
```ts
interface OnsiteServiceInvoiceData {
  onsiteServiceKey: number;
  invoiceNum: string;
  visitDate: string | null;
  techName: string;
  truckNumber: string | null;
  purchaseOrder: string | null;
  trayCount: number;
  instrumentCount: number;
  invoiceAmount: number;
  taxAmount: number;
  billName1: string | null;
  billName2: string | null;
  billEmail: string | null;
  clientName: string;
  deptName: string;
  termsDesc: string | null;
}
```

---

## New Files

| File | Purpose |
|------|---------|
| `client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx` | Print form component |
| `client/src/pages/onsite-services/SiteServiceInvoiceForm.css` | Print styles (reuses `inv-*` tokens where possible, adds `ssi-*` for overrides) |

### Reused from repairs
- `InvoiceForm.css` print tokens (`inv-overlay`, `inv-action-bar`, `inv-page`, `inv-env-zone`, `inv-bill-*`, `inv-tsi-*`, `inv-meta-*`, `inv-ref-*`, `inv-sb`, `inv-totals-*`, `inv-payment-note`, `inv-footer`)
- `print.css` (shared `@media print` rules)

### New CSS additions (`ssi-*`)
- `.ssi-tray-table` — 7-column tray breakdown (wider than repairs 2-col table)
- `.ssi-tray-th`, `.ssi-tray-td` — cell sizing for tray columns
- `.ssi-tray-tfoot` — totals footer row styling

---

## Component API

```tsx
interface SiteServiceInvoiceFormProps {
  invoiceData: OnsiteServiceInvoiceData;
  trays: OnsiteServiceTray[];  // existing type
  onClose: () => void;
}
```

Data is fetched by the caller (`OnsiteServiceDetailDrawer`) before mounting. The form is stateless — pure render.

---

## Integration: OnsiteServiceDetailDrawer

- Add **"Print Invoice"** button to action bar, visible when `detail.status === 'Submitted' || detail.status === 'Invoiced'`
- On click: fetch `/api/onsite-services/{id}/invoice` + `/api/onsite-services/{id}/trays` in parallel, then mount `SiteServiceInvoiceForm` as a modal overlay
- Loading state: button shows spinner while fetching
- Same open/close overlay pattern as `InvoiceForm` in `OutgoingTab`

---

## Backend Changes

1. **New endpoint** `GET /api/onsite-services/{id}/invoice` in `OnsiteServicesController.cs` — returns `OnsiteServiceInvoiceData`
2. **New C# record** `OnsiteServiceInvoiceData` in `Models/OnsiteService.cs`
3. No changes to existing endpoints or models

---

## One-Page Constraint

The invoice must fit on a single 8.5 × 11in page when printed.

**Tray table scaling strategy:**
- Use `font-size: 8.5px` for tray rows (vs 10.5px in the repairs table) to fit more rows
- Row height: `min-height: 16px` (tighter than repairs' 20px)
- If tray count exceeds ~20 rows, the table will overflow to page 2 — this is acceptable for unusually large visits but the layout is optimized for the typical 10–15 tray visit
- `@media print` rule: `font-size: 8px` on the tray table to compress further if needed

**Sections removed vs. repairs to recover vertical space:**
- Signature block (removed)
- Remittance stub (removed)
- Shipping row in totals (removed)

These three removals free approximately 1.4 inches, which accommodates the wider tray table.

---

## Out of Scope

- Per-tray cost breakdown (not in current schema surface)
- Email-invoice workflow
- PDF generation server-side
