# Site Service Invoice Form — Design Spec
Date: 2026-04-16

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
| 4 | Terms | Terms (blank — not in schema) |

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

### New API endpoint: `GET /api/onsite-services/{id}/invoice`

Extends the existing `GetDetail` query with billing and financial fields not currently returned:

```sql
SELECT
  ss.sWorkOrderNumber, ss.dtOnsiteDate, ss.sTruckNumber,
  ss.sPurchaseOrder, ss.lTrayCount, ss.lTotalInstruments,
  ss.nInvoiceAmount, ss.nTaxAmount,
  -- Bill To (from tblSiteServices billing columns)
  ss.sBillName1, ss.sBillName2, ss.sBillEmail,
  -- Client / Dept / Tech (joins)
  c.sClientName1, d.sDepartmentName, t.sTechName
FROM tblSiteServices ss
LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
WHERE ss.lSiteServiceKey = @id
```

Trays are fetched via the existing `GET /api/onsite-services/{id}/trays` endpoint (no changes needed).

### New TypeScript interface: `OnsiteServiceInvoiceData`
```ts
interface OnsiteServiceInvoiceData {
  onsiteServiceKey: number;
  invoiceNum: string;        // sWorkOrderNumber
  visitDate: string | null;  // dtOnsiteDate formatted MM/dd/yyyy
  techName: string;
  truckNumber: string | null;
  purchaseOrder: string | null;
  trayCount: number;
  instrumentCount: number;
  invoiceAmount: number;     // nInvoiceAmount
  taxAmount: number;         // nTaxAmount
  billName1: string | null;  // sBillName1
  billName2: string | null;  // sBillName2
  billEmail: string | null;  // sBillEmail
  clientName: string;
  deptName: string;
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

## Out of Scope

- Per-tray cost breakdown (not in current schema surface)
- Due Date / Terms population (not stored on `tblSiteServices`)
- Email-invoice workflow
- PDF generation server-side
