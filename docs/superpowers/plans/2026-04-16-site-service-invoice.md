# Site Service Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a print-optimized React invoice form for completed onsite service visits, wired through a new backend endpoint, and accessible via a "Print Invoice" button in `OnsiteServiceDetailDrawer`.

**Architecture:** Mirror the existing `InvoiceForm.tsx` (repairs invoice) layout — same CSS tokens, overlay, action bar, envelope zone, meta strip, ref grid, totals, payment note, footer — but replace the line-items table with a 7-column tray breakdown table and remove the signature block, remittance stub, and shipping row. New backend endpoint returns billing/financial fields not in the existing detail endpoint. Frontend fetches invoice data + trays in parallel before mounting the form.

**Tech Stack:** React 18 + TypeScript, ASP.NET Core 8, Microsoft.Data.SqlClient, existing `inv-*` CSS tokens

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/TSI.Api/Models/OnsiteService.cs` | Modify | Add `OnsiteServiceInvoiceData` C# record |
| `server/TSI.Api/Controllers/OnsiteServicesController.cs` | Modify | Add `GET /{id}/invoice` endpoint |
| `client/src/pages/onsite-services/types.ts` | Modify | Add `OnsiteServiceInvoiceData` TS interface |
| `client/src/api/onsite-services.ts` | Modify | Add `getOnsiteServiceInvoice` API function |
| `client/src/pages/onsite-services/SiteServiceInvoiceForm.css` | Create | Tray table print styles (`.ssi-*` additions on top of reused `.inv-*`) |
| `client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx` | Create | Print form component |
| `client/src/pages/onsite-services/OnsiteServiceDetailDrawer.tsx` | Modify | Add Print Invoice button, state, and overlay mount |

---

## Task 1: Add `OnsiteServiceInvoiceData` C# record

**Files:**
- Modify: `server/TSI.Api/Models/OnsiteService.cs`

- [ ] **Step 1: Add the record**

  Append to the bottom of `server/TSI.Api/Models/OnsiteService.cs`:

  ```csharp
  public record OnsiteServiceInvoiceData(
      int OnsiteServiceKey,
      string InvoiceNum,
      string? VisitDate,
      string? TruckNumber,
      string? PurchaseOrder,
      int TrayCount,
      int InstrumentCount,
      double InvoiceAmount,
      double TaxAmount,
      string BillName1,
      string BillName2,
      string BillEmail,
      string ClientName,
      string DeptName,
      string TechName,
      string TermsDesc
  );
  ```

- [ ] **Step 2: Build the server to confirm no errors**

  Run from `server/`:
  ```bash
  dotnet build TSI.Api/TSI.Api.csproj
  ```
  Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

  ```bash
  git add server/TSI.Api/Models/OnsiteService.cs
  git commit -m "feat(onsite-services): add OnsiteServiceInvoiceData C# record"
  ```

---

## Task 2: Add `GET /{id}/invoice` endpoint

**Files:**
- Modify: `server/TSI.Api/Controllers/OnsiteServicesController.cs`

- [ ] **Step 1: Add the endpoint**

  Add this method to `OnsiteServicesController` after the existing `GetDetail` method (around line 403):

  ```csharp
  [HttpGet("{id:int}/invoice")]
  public async Task<IActionResult> GetInvoice(int id)
  {
      await using var conn = CreateConnection();
      await conn.OpenAsync();

      const string sql = """
          SELECT
            ss.lSiteServiceKey,
            ss.sWorkOrderNumber,
            ss.dtOnsiteDate,
            ISNULL(ss.sTruckNumber, '')    AS sTruckNumber,
            ISNULL(ss.sPurchaseOrder, '')  AS sPurchaseOrder,
            ISNULL(ss.lTrayCount, 0)       AS lTrayCount,
            ISNULL(ss.lTotalInstruments, 0) AS lTotalInstruments,
            ISNULL(ss.nInvoiceAmount, 0)   AS nInvoiceAmount,
            ISNULL(ss.nTaxAmount, 0)       AS nTaxAmount,
            ISNULL(ss.sBillName1, '')      AS sBillName1,
            ISNULL(ss.sBillName2, '')      AS sBillName2,
            ISNULL(ss.sBillEmail, '')      AS sBillEmail,
            ISNULL(c.sClientName1, '')     AS sClientName1,
            ISNULL(d.sDepartmentName, '')  AS sDepartmentName,
            ISNULL(t.sTechName, '')        AS sTechName,
            ISNULL(pt.sTermsDesc, '')      AS sTermsDesc
          FROM tblSiteServices ss
          LEFT JOIN tblClient       c  ON c.lClientKey       = ss.lClientKey
          LEFT JOIN tblDepartment   d  ON d.lDepartmentKey   = ss.lDepartmentKey
          LEFT JOIN tblTechnicians  t  ON t.lTechnicianKey   = ss.lTechnicianKey
          LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = d.lPaymentTermsKey
          WHERE ss.lSiteServiceKey = @id
          """;

      await using var cmd = new SqlCommand(sql, conn);
      cmd.CommandTimeout = 30;
      cmd.Parameters.AddWithValue("@id", id);
      await using var reader = await cmd.ExecuteReaderAsync();

      if (!await reader.ReadAsync())
          return NotFound(new { message = "Visit not found." });

      var visitDate = reader["dtOnsiteDate"] == DBNull.Value
          ? null
          : Convert.ToDateTime(reader["dtOnsiteDate"]).ToString("MM/dd/yyyy");

      return Ok(new OnsiteServiceInvoiceData(
          OnsiteServiceKey: Convert.ToInt32(reader["lSiteServiceKey"]),
          InvoiceNum: reader["sWorkOrderNumber"]?.ToString() ?? "",
          VisitDate: visitDate,
          TruckNumber: reader["sTruckNumber"]?.ToString(),
          PurchaseOrder: reader["sPurchaseOrder"]?.ToString(),
          TrayCount: Convert.ToInt32(reader["lTrayCount"]),
          InstrumentCount: Convert.ToInt32(reader["lTotalInstruments"]),
          InvoiceAmount: reader["nInvoiceAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nInvoiceAmount"]),
          TaxAmount: reader["nTaxAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nTaxAmount"]),
          BillName1: reader["sBillName1"]?.ToString() ?? "",
          BillName2: reader["sBillName2"]?.ToString() ?? "",
          BillEmail: reader["sBillEmail"]?.ToString() ?? "",
          ClientName: reader["sClientName1"]?.ToString() ?? "",
          DeptName: reader["sDepartmentName"]?.ToString() ?? "",
          TechName: reader["sTechName"]?.ToString() ?? "",
          TermsDesc: reader["sTermsDesc"]?.ToString() ?? ""
      ));
  }
  ```

- [ ] **Step 2: Build server**

  ```bash
  dotnet build TSI.Api/TSI.Api.csproj
  ```
  Expected: `Build succeeded.`

- [ ] **Step 3: Smoke test (server running)**

  With the dev server running (`dotnet run`), open:
  ```
  GET /api/onsite-services/1/invoice
  ```
  (Use any valid `lSiteServiceKey` from the DB.) Expected: JSON object with `invoiceNum`, `visitDate`, `billName1`, `termsDesc`, etc. — not a 500.

- [ ] **Step 4: Commit**

  ```bash
  git add server/TSI.Api/Controllers/OnsiteServicesController.cs
  git commit -m "feat(onsite-services): add GET /{id}/invoice endpoint"
  ```

---

## Task 3: Add TypeScript interface and API function

**Files:**
- Modify: `client/src/pages/onsite-services/types.ts`
- Modify: `client/src/api/onsite-services.ts`

- [ ] **Step 1: Add `OnsiteServiceInvoiceData` to types.ts**

  Append to the bottom of `client/src/pages/onsite-services/types.ts`:

  ```ts
  export interface OnsiteServiceInvoiceData {
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
    billName1: string;
    billName2: string;
    billEmail: string;
    clientName: string;
    deptName: string;
    termsDesc: string;
  }
  ```

- [ ] **Step 2: Add `getOnsiteServiceInvoice` to api/onsite-services.ts**

  Add this import to the top of `client/src/api/onsite-services.ts` (update the existing import line from `types`):

  ```ts
  import type { OnsiteServiceListResponse, OnsiteServiceStats, OnsiteServiceFilters, CreateOnsiteVisitRequest, OnsiteServiceDetail, OnsiteServiceTray, OnsiteServiceInvoiceData } from '../pages/onsite-services/types';
  ```

  Then append this function at the bottom of the file:

  ```ts
  export const getOnsiteServiceInvoice = async (id: number): Promise<OnsiteServiceInvoiceData> => {
    const { data } = await apiClient.get<OnsiteServiceInvoiceData>(`/onsite-services/${id}/invoice`);
    return data;
  };
  ```

- [ ] **Step 3: TypeScript check**

  ```bash
  cd client && npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/onsite-services/types.ts client/src/api/onsite-services.ts
  git commit -m "feat(onsite-services): add OnsiteServiceInvoiceData type and API function"
  ```

---

## Task 4: Create `SiteServiceInvoiceForm.css`

**Files:**
- Create: `client/src/pages/onsite-services/SiteServiceInvoiceForm.css`

- [ ] **Step 1: Create the CSS file**

  Create `client/src/pages/onsite-services/SiteServiceInvoiceForm.css` with this content:

  ```css
  /* ── SiteServiceInvoiceForm.css ──
     Tray-table additions for the site service invoice.
     All layout, overlay, meta, ref, totals, footer styles are
     inherited from InvoiceForm.css via the shared inv-* class names.
     ─────────────────────────────────────────────────────────────── */

  /* 7-column tray breakdown table */
  .ssi-tray-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
    font-size: 8.5px;
  }

  /* Column header cells */
  .ssi-tray-th {
    background: var(--navy);
    color: #fff;
    font-size: 7.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 5px;
    text-align: center;
    white-space: nowrap;
  }
  .ssi-tray-th--left {
    text-align: left;
  }
  .ssi-tray-th--num {
    width: 28px;
  }
  .ssi-tray-th--desc {
    text-align: left;
  }
  .ssi-tray-th--count {
    width: 64px;
  }

  /* Data cells */
  .ssi-tray-td {
    padding: 3px 5px;
    font-size: 8.5px;
    border-bottom: 1px solid var(--print-border-lt);
    vertical-align: middle;
    min-height: 16px;
    height: 16px;
    text-align: center;
  }
  .ssi-tray-td--left {
    text-align: left;
  }
  .ssi-tray-td--repaired {
    color: var(--success);
    font-weight: 600;
  }
  .ssi-tray-td--sent {
    color: var(--primary);
    font-weight: 600;
  }
  .ssi-tray-td--ber {
    color: var(--danger);
    font-weight: 600;
  }

  /* Footer totals row */
  .ssi-tray-tfoot td {
    padding: 4px 5px;
    font-size: 8.5px;
    font-weight: 700;
    border-top: 2px solid var(--primary);
    background: var(--print-info-bg);
    text-align: center;
  }
  .ssi-tray-tfoot td.ssi-tray-td--left {
    text-align: left;
  }

  /* Print overrides — compress further at print time */
  @media print {
    .ssi-tray-table {
      font-size: 8px;
    }
    .ssi-tray-th {
      font-size: 7px;
    }
    .ssi-tray-td {
      font-size: 8px;
      height: 14px;
      min-height: 14px;
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/pages/onsite-services/SiteServiceInvoiceForm.css
  git commit -m "feat(onsite-services): add SiteServiceInvoiceForm.css tray table styles"
  ```

---

## Task 5: Create `SiteServiceInvoiceForm.tsx`

**Files:**
- Create: `client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx`

- [ ] **Step 1: Create the component**

  Create `client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx`:

  ```tsx
  import './SiteServiceInvoiceForm.css';
  import '../repairs/forms/InvoiceForm.css';
  import '../repairs/forms/print.css';
  import type { OnsiteServiceInvoiceData } from './types';
  import type { OnsiteServiceTray } from './types';

  interface Props {
    invoiceData: OnsiteServiceInvoiceData;
    trays: OnsiteServiceTray[];
    onClose: () => void;
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  export const SiteServiceInvoiceForm = ({ invoiceData, trays, onClose }: Props) => {
    // Calculated tray columns (screen + print)
    const rows = trays.map(t => ({
      ...t,
      inspectedCount: t.instrumentsCount - t.repairedCount - t.sentToTsiCount - t.beyondEconomicalRepairCount,
    }));

    // Footer totals
    const totInstruments = rows.reduce((s, r) => s + r.instrumentsCount, 0);
    const totInspected   = rows.reduce((s, r) => s + r.inspectedCount, 0);
    const totRepaired    = rows.reduce((s, r) => s + r.repairedCount, 0);
    const totSent        = rows.reduce((s, r) => s + r.sentToTsiCount, 0);
    const totBer         = rows.reduce((s, r) => s + r.beyondEconomicalRepairCount, 0);

    return (
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        className="inv-overlay"
      >
        {/* Action bar */}
        <div className="no-print inv-action-bar">
          <button onClick={() => window.print()} className="inv-btn-print">Print</button>
          <button onClick={onClose} className="inv-btn-close">Close</button>
        </div>

        {/* Printable page */}
        <div className="print-form inv-page">

          {/* 1. Envelope Window Zone */}
          <div className="inv-env-zone">
            {/* Bill To — positioned for #10 window envelope */}
            <div className="inv-bill-block">
              <div className="inv-bill-label">Bill To</div>
              <div className="inv-bill-name">{invoiceData.billName1}</div>
              {invoiceData.billName2 && (
                <div className="inv-bill-line">{invoiceData.billName2}</div>
              )}
              {invoiceData.billEmail && (
                <div className="inv-bill-line">{invoiceData.billEmail}</div>
              )}
            </div>

            {/* TSI Header */}
            <div className="inv-tsi-header">
              <img src="/logo-horizontal.jpg" alt="Total Scope Inc." className="inv-tsi-logo" />
              <div className="inv-tsi-address">
                Total Scope Inc.<br />
                17 Creek Pkwy, Upper Chichester PA 19061<br />
                Phone: (610) 485-3838 &nbsp;|&nbsp; Fax: (610) 485-3839
              </div>
              <div className="inv-tsi-title">Invoice</div>
            </div>
          </div>

          {/* 2. Meta Strip */}
          <div className="inv-meta-strip">
            <div className="inv-meta-cell inv-meta-cell--hl">
              <span className="inv-meta-cell-label">Invoice #</span>
              <span className="inv-meta-cell-value">{invoiceData.invoiceNum || '—'}</span>
            </div>
            <div className="inv-meta-cell">
              <span className="inv-meta-cell-label">Visit Date</span>
              <span className="inv-meta-cell-value">{invoiceData.visitDate ?? '—'}</span>
            </div>
            <div className="inv-meta-cell">
              <span className="inv-meta-cell-label">Due Date</span>
              <span className="inv-meta-cell-value"></span>
            </div>
            <div className="inv-meta-cell">
              <span className="inv-meta-cell-label">Terms</span>
              <span className="inv-meta-cell-value">{invoiceData.termsDesc}</span>
            </div>
          </div>

          {/* 3. Reference Grid */}
          <div className="inv-ref-grid">
            <div className="inv-ref-field">
              <span className="inv-fl">Work Order #</span>
              <div className="inv-fv">{invoiceData.invoiceNum}</div>
            </div>
            <div className="inv-ref-field">
              <span className="inv-fl">Visit Date</span>
              <div className="inv-fv">{invoiceData.visitDate ?? ''}</div>
            </div>
            <div className="inv-ref-field">
              <span className="inv-fl">Mobile Tech</span>
              <div className="inv-fv">{invoiceData.techName}</div>
            </div>
            <div className="inv-ref-field">
              <span className="inv-fl">Truck #</span>
              <div className="inv-fv">{invoiceData.truckNumber ?? ''}</div>
            </div>
            <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
              <span className="inv-fl">Client / Account</span>
              <div className="inv-fv">{invoiceData.clientName}</div>
            </div>
            <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
              <span className="inv-fl">Department</span>
              <div className="inv-fv">{invoiceData.deptName}</div>
            </div>
            <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
              <span className="inv-fl">Purchase Order #</span>
              <div className="inv-fv">{invoiceData.purchaseOrder ?? ''}</div>
            </div>
            <div className="inv-ref-field" style={{ gridColumn: 'span 2' }}>
              <span className="inv-fl">Trays / Instruments</span>
              <div className="inv-fv">{invoiceData.trayCount} / {invoiceData.instrumentCount}</div>
            </div>
          </div>

          {/* 4. Section Bar */}
          <div className="inv-sb">Service Summary</div>

          {/* 5. Tray Breakdown Table */}
          <table className="ssi-tray-table">
            <thead>
              <tr>
                <th className="ssi-tray-th ssi-tray-th--num ssi-tray-th--left">#</th>
                <th className="ssi-tray-th ssi-tray-th--desc ssi-tray-th--left">Description</th>
                <th className="ssi-tray-th ssi-tray-th--count">Instruments</th>
                <th className="ssi-tray-th ssi-tray-th--count">Inspected</th>
                <th className="ssi-tray-th ssi-tray-th--count">Repaired</th>
                <th className="ssi-tray-th ssi-tray-th--count">Sent to TSI</th>
                <th className="ssi-tray-th ssi-tray-th--count">BER</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.trayKey} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                  <td className="ssi-tray-td ssi-tray-td--left">{row.trayNumber}</td>
                  <td className="ssi-tray-td ssi-tray-td--left">{row.trayName || `Tray ${row.trayNumber}`}</td>
                  <td className="ssi-tray-td">{row.instrumentsCount}</td>
                  <td className="ssi-tray-td">{row.inspectedCount}</td>
                  <td className="ssi-tray-td ssi-tray-td--repaired print-no-color">{row.repairedCount}</td>
                  <td className="ssi-tray-td ssi-tray-td--sent print-no-color">{row.sentToTsiCount}</td>
                  <td className="ssi-tray-td ssi-tray-td--ber print-no-color">{row.beyondEconomicalRepairCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="ssi-tray-tfoot">
              <tr>
                <td className="ssi-tray-td--left" colSpan={2}>Totals</td>
                <td>{totInstruments}</td>
                <td>{totInspected}</td>
                <td>{totRepaired}</td>
                <td>{totSent}</td>
                <td>{totBer}</td>
              </tr>
            </tfoot>
          </table>

          {/* 6. Totals Block */}
          <div className="inv-totals-wrap">
            <table className="inv-totals-table">
              <tbody>
                <tr>
                  <td colSpan={2} className="inv-tot-cell">Subtotal</td>
                  <td className="inv-tot-cell inv-tot-cell--sep">
                    {fmt(invoiceData.invoiceAmount)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="inv-tot-cell">Tax</td>
                  <td className="inv-tot-cell inv-tot-cell--sep">
                    {fmt(invoiceData.taxAmount)}
                  </td>
                </tr>
                <tr className="inv-tot-due-row">
                  <td className="inv-tot-due-label">Amount Due</td>
                  <td className="inv-tot-due-val">
                    {fmt(invoiceData.invoiceAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7. Payment Note */}
          <div className="inv-payment-note">
            Payment due within 30 days of invoice date. Please include invoice number on your remittance.
            Make checks payable to <strong>Total Scope Inc.</strong> ACH/Wire transfer available upon request.
          </div>

          {/* 8. Footer */}
          <div className="inv-footer">
            <span>ISO 13485 Certified</span>
            <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    );
  };
  ```

  > **Note on `print-no-color`:** The spec calls for color coding on Repaired/Sent/BER cells on screen only. Add `.print-no-color { }` to `print.css` (or inside a `@media print` block in `SiteServiceInvoiceForm.css`) to strip the color on print:
  >
  > ```css
  > @media print {
  >   .print-no-color { color: var(--print-body-text) !important; }
  > }
  > ```
  >
  > Add this rule to the `@media print` block already in `SiteServiceInvoiceForm.css`.

- [ ] **Step 2: Add `print-no-color` print override to CSS**

  In `SiteServiceInvoiceForm.css`, inside the existing `@media print` block, add:

  ```css
  @media print {
    .ssi-tray-table  { font-size: 8px; }
    .ssi-tray-th     { font-size: 7px; }
    .ssi-tray-td     { font-size: 8px; height: 14px; min-height: 14px; }
    .print-no-color  { color: var(--print-body-text) !important; }
  }
  ```

  (Replace the existing `@media print` block in the file with this consolidated version.)

- [ ] **Step 3: TypeScript check**

  ```bash
  cd client && npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/onsite-services/SiteServiceInvoiceForm.tsx client/src/pages/onsite-services/SiteServiceInvoiceForm.css
  git commit -m "feat(onsite-services): add SiteServiceInvoiceForm component"
  ```

---

## Task 6: Wire up Print Invoice button in `OnsiteServiceDetailDrawer`

**Files:**
- Modify: `client/src/pages/onsite-services/OnsiteServiceDetailDrawer.tsx`

- [ ] **Step 1: Add imports**

  At the top of `OnsiteServiceDetailDrawer.tsx`, add to the existing api import line:

  ```ts
  import { getOnsiteServiceDetail, getOnsiteServiceTrays, submitOnsiteForInvoicing, getOnsiteServiceInvoice } from '../../api/onsite-services';
  ```

  Also add the component import below the existing imports:

  ```ts
  import { SiteServiceInvoiceForm } from './SiteServiceInvoiceForm';
  import type { OnsiteServiceInvoiceData } from './types';
  ```

- [ ] **Step 2: Add state variables**

  Inside `OnsiteServiceDetailDrawer`, after the existing `const [submitting, setSubmitting] = useState(false);` line, add:

  ```ts
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<OnsiteServiceInvoiceData | null>(null);
  const [invoiceTrays, setInvoiceTrays] = useState<OnsiteServiceTray[]>([]);
  ```

- [ ] **Step 3: Add `handlePrintInvoice` handler**

  After `handleSubmitForInvoicing`, add:

  ```ts
  const handlePrintInvoice = async () => {
    if (!serviceKey) return;
    setInvoiceLoading(true);
    try {
      const [inv, t] = await Promise.all([
        getOnsiteServiceInvoice(serviceKey),
        getOnsiteServiceTrays(serviceKey),
      ]);
      setInvoiceData(inv);
      setInvoiceTrays(t);
      setInvoiceOpen(true);
    } catch {
      message.error('Failed to load invoice data');
    } finally {
      setInvoiceLoading(false);
    }
  };
  ```

- [ ] **Step 4: Add `canPrintInvoice` derived boolean**

  After the existing `const canSubmit = detail?.status === 'Draft';` line, add:

  ```ts
  const canPrintInvoice = detail?.status === 'Submitted' || detail?.status === 'Invoiced';
  ```

- [ ] **Step 5: Add the Print Invoice button to the action bar**

  In the action bar JSX (after the `{canSubmit && ( ... )}` block and before the `{!canSubmit && ( ... )}` block), add:

  ```tsx
  {canPrintInvoice && (
    <button
      onClick={handlePrintInvoice}
      disabled={invoiceLoading}
      style={{
        ...submitBtnBaseStyle,
        background: invoiceLoading ? 'var(--muted)' : 'var(--navy)',
        cursor: invoiceLoading ? 'default' : 'pointer',
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {invoiceLoading ? 'Loading...' : 'Print Invoice'}
    </button>
  )}
  ```

  Also update the `{!canSubmit && ...}` label — it's still correct because it shows when `!canSubmit`, which already covers Submitted/Invoiced. But the label text "no further actions available" should be removed or hidden when `canPrintInvoice` is true. Replace the `{!canSubmit && ( ... noActionLabel ... )}` block with:

  ```tsx
  {!canSubmit && !canPrintInvoice && (
    <span style={noActionLabelStyle}>
      Visit is {detail.status} — no further actions available
    </span>
  )}
  ```

- [ ] **Step 6: Mount the invoice overlay**

  At the very bottom of the returned JSX, just before the closing `</div>` of the outermost container, add:

  ```tsx
  {invoiceOpen && invoiceData && (
    <SiteServiceInvoiceForm
      invoiceData={invoiceData}
      trays={invoiceTrays}
      onClose={() => setInvoiceOpen(false)}
    />
  )}
  ```

- [ ] **Step 7: TypeScript check**

  ```bash
  cd client && npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 8: Manual smoke test**

  1. Start the dev server: `cd client && npm run dev`
  2. Open a site service visit with status **Submitted** or **Invoiced**
  3. Verify the "Print Invoice" button appears in the action bar
  4. Click it — spinner appears, then the invoice overlay opens
  5. Verify: Bill To name, meta strip (Invoice #, Visit Date, Terms), ref grid fields, tray table with correct column counts, totals block (no Shipping row), payment note, footer
  6. Click Print — browser print dialog opens, correct content renders
  7. Close — overlay dismisses
  8. Open a **Draft** visit — verify the Print Invoice button does NOT appear

- [ ] **Step 9: Commit**

  ```bash
  git add client/src/pages/onsite-services/OnsiteServiceDetailDrawer.tsx
  git commit -m "feat(onsite-services): add Print Invoice button to detail drawer"
  ```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Envelope zone (Bill To: name1, name2 conditional, email) + TSI header
- ✅ Meta strip: Invoice # (highlighted) | Visit Date | Due Date (blank) | Terms
- ✅ Ref grid: WO# / Visit Date / Tech / Truck# / Client (span 2) / Dept (span 2) / PO# (span 2) / Trays+Instruments (span 2)
- ✅ Section bar "Service Summary"
- ✅ Tray table: 7 cols, Inspected calculated client-side, color coding (screen only), footer totals row
- ✅ Totals: Subtotal + Tax + Amount Due — NO Shipping
- ✅ Payment note (identical text to repairs)
- ✅ Footer (identical to repairs)
- ✅ Signature block removed
- ✅ Remittance stub removed
- ✅ Print Invoice button visible on Submitted + Invoiced only
- ✅ Parallel fetch of invoice data + trays on click
- ✅ Loading state on button
- ✅ Backend endpoint with exact SQL from spec
- ✅ C# record + TS interface field names match spec field map exactly
- ✅ One-page strategy: 8.5px row font, 16px min-height, @media print 8px fallback
