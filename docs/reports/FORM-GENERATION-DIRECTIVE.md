# BrightLogix Form Generation Directive

## Purpose
This document provides Claude Code with the rules, patterns, and context needed to autonomously generate BrightLogix form components from stored procedure definitions. When given a stored procedure, Claude Code should analyze the data model, determine the form type, and generate a complete React component with PDF export — no additional prompting required.

---

## Architecture

### Technology Stack
- **Rendering:** React components (JSX/TSX)
- **PDF Export:** `react-pdf/renderer` (free, open source)
- **Data Source:** SQL Server stored procedures via API endpoints
- **Preview:** On-screen render in BrightLogix portal
- **Output:** Click-to-export PDF from the same component

### File Structure
```
/src/forms/
  /customer/          # Customer-facing forms
    Invoice.tsx
    RepairReport.tsx
    EstimateQuote.tsx
    ...
  /internal/          # Internal process forms
    FinalInspection.tsx
    RequestForApproval.tsx
    WorkOrder.tsx
    ...
  /shared/
    FormHeader.tsx     # Reusable TSI branded header
    FormFooter.tsx     # Reusable footer with page numbers
    FormTable.tsx      # Standardized table component
    FormField.tsx      # Label/value pair component
    PDFExportButton.tsx
  /templates/
    CustomerFormLayout.tsx   # Base layout for customer forms
    InternalFormLayout.tsx   # Base layout for internal forms
  /hooks/
    useFormData.ts     # Data fetching hook (calls stored proc API)
  /utils/
    formatters.ts      # Currency, date, serial number formatting
    calculations.ts    # Derived field calculations
```

---

## Design System — Forms

### Brand Standards (Customer-Facing)
| Element | Specification |
|---------|--------------|
| **Primary Font** | Arial |
| **Body Text** | 10pt, color #333333 |
| **H1 (Form Title)** | 16pt Bold, color #1B3A5C (Navy) |
| **H2 (Section Header)** | 13pt Bold, color #2E75B6 (Blue) |
| **H3 (Subsection)** | 11pt Bold, color #1F4D78 (Dark Blue) |
| **Logo** | TSI logo top-left, full color |
| **Accent Line** | 2px solid #2E75B6 below header |
| **Table Header BG** | #1B3A5C (Navy), white text |
| **Table Alt Row** | #F5F7FA |
| **Table Border** | 1px solid #DEE2E6 |
| **Footer** | 8pt, color #666666, page numbers right-aligned |
| **Confidentiality** | None on customer-facing forms |

### Brand Standards (Internal)
| Element | Specification |
|---------|--------------|
| **Primary Font** | Arial |
| **Body Text** | 9pt, color #333333 |
| **H1 (Form Title)** | 14pt Bold, color #1B3A5C |
| **H2 (Section Header)** | 11pt Bold, color #1F4D78 |
| **Logo** | TSI logo top-left, smaller variant |
| **Table Header BG** | #4A5568 (Gray), white text |
| **Table Alt Row** | #F7FAFC |
| **Footer** | 8pt, "INTERNAL USE ONLY — Total Scope, Inc." + page number |

### Layout Rules
- **Page size:** US Letter (8.5" x 11") portrait unless data requires landscape
- **Margins:** 0.75" all sides (customer), 0.5" all sides (internal)
- **Header block:** Logo left, form title center, date/reference# right
- **Section spacing:** 16px between sections
- **Tables:** Full-width, no horizontal scroll — if columns exceed width, switch to landscape or split
- **Currency:** Always formatted `$X,XXX.XX` — right-aligned in tables
- **Dates:** `MM/DD/YYYY` display format
- **Serial Numbers:** Always monospaced font within tables for readability
- **Empty states:** If a field is NULL/empty, display `—` (em dash), never blank

---

## Form Classification Logic

Claude Code should classify forms based on stored procedure analysis:

### Customer-Facing Indicators
- Proc name contains: `Invoice`, `Quote`, `Estimate`, `Report`, `Certificate`, `Delivery`, `PackingSlip`, `Statement`
- Output includes: customer name, customer address, billing fields, pricing/totals
- Typically includes: company contact info, professional formatting, no internal cost data

### Internal Indicators
- Proc name contains: `Inspection`, `Approval`, `WorkOrder`, `Receiving`, `Shipping`, `QC`, `Audit`, `Tracking`, `Internal`
- Output includes: technician fields, approval signatures, internal notes, cost breakdowns
- Typically includes: checkboxes, sign-off lines, internal reference numbers

### Hybrid (Internal Data, Customer Delivery)
- Proc name contains: `RepairSummary`, `FinalReport`, `Completion`
- Treat as customer-facing for styling
- NEVER expose: internal cost data, margin info, vendor pricing, technician labor rates

---

## Form Archetypes

When Claude Code encounters a stored procedure, match it to the closest archetype and use the layout pattern as a starting point:

### INVOICE
**Layout:** Header block -> Bill To / Ship To (2-column) -> Line Items Table -> Subtotal/Tax/Total block -> Payment Terms -> Footer
**Key fields:** Invoice #, PO #, date, customer info, line items (description, qty, unit price, extended), totals
**Rules:** Totals right-aligned and bold. Payment terms below totals. Include remittance address if present.

### REPAIR REPORT / COMPLETION REPORT
**Layout:** Header block -> Equipment Info (serial, model, manufacturer) -> Findings -> Work Performed -> Parts Used -> Test Results -> Certification Statement -> Footer
**Key fields:** Work order #, scope serial, model, manufacturer, condition received, work performed, parts, test results
**Rules:** Customer-facing — no cost data. Findings in narrative format. Parts listed by description only (no cost). Include "Repaired to OEM specifications" certification line.

### ESTIMATE / QUOTE
**Layout:** Header block -> Customer Info -> Equipment Info -> Recommended Repairs Table -> Pricing -> Validity/Terms -> Footer
**Key fields:** Quote #, date, customer, equipment, repair descriptions, pricing, expiration date
**Rules:** Valid for 30 days unless specified. Include "Repair vs. Replace" savings column if replacement cost data exists.

### PACKING SLIP / DELIVERY
**Layout:** Header block -> Ship To -> Items Table (no pricing) -> Shipping Info -> Signature Line -> Footer
**Key fields:** Tracking #, ship date, items, quantities, carrier info
**Rules:** NEVER include pricing. Signature line for receiving.

### REQUEST FOR APPROVAL (RFA)
**Layout:** Header block -> Customer/PO Info -> Equipment Info -> Repair Description -> Cost Breakdown -> Approval Block -> Footer
**Key fields:** RFA #, work order, customer, scope info, estimated repair cost, approval status
**Rules:** Internal form. Cost data OK. Approval block includes: Approved / Denied / Modified checkboxes, signature line, date.

### FINAL INSPECTION / QC
**Layout:** Header block -> Equipment Info -> Inspection Checklist (pass/fail per item) -> Test Results -> Tech Sign-off -> QA Sign-off -> Footer
**Key fields:** Work order, serial, model, checklist items, test measurements, tech name, QA name
**Rules:** Internal form. Checklist format with pass/fail indicators. Dual sign-off (tech + QA).

### WORK ORDER
**Layout:** Header block -> Customer Info -> Equipment Info -> Problem Description -> Work Instructions -> Parts -> Labor Log -> Status -> Footer
**Key fields:** WO #, customer, equipment, problem description, assigned tech, parts used, labor entries, status
**Rules:** Internal form. Living document — may be printed at multiple stages.

### RECEIVING / INTAKE
**Layout:** Header block -> Customer Info -> Items Received Table -> Condition Notes -> Accessories Checklist -> Signature -> Footer
**Key fields:** Receiving #, date, customer, items, serial numbers, condition on receipt, accessories included
**Rules:** Internal form. Condition documentation is critical for liability. Accessories checklist prevents disputes.

### LABEL / TAG
**Layout:** Compact — typically 4" x 2" or similar label format
**Key fields:** Work order #, serial #, customer name, barcode/QR
**Rules:** Minimal text, large font for readability. Barcode if data supports it.

---

## Stored Procedure Analysis Rules

When Claude Code receives a stored procedure, follow this process:

### Step 1: Identify Output Columns
Read the SELECT statement(s). Map every column to a form field. Note aliases — they often indicate display labels.

### Step 2: Identify Grouping
Look for `GROUP BY`, `ORDER BY`, and any cursor/loop logic. This tells you:
- How data should be sectioned on the form
- Sort order within sections
- Whether the form is a single record or a list/summary

### Step 3: Identify Calculations
Look for `SUM`, `COUNT`, `AVG`, calculated columns, `CASE` statements. These become:
- Subtotals / totals rows in tables
- Derived display fields
- Conditional formatting triggers

### Step 4: Identify Parameters
`@parameters` tell you what filters/inputs the form needs:
- `@WorkOrderID` -> single-record form
- `@CustomerID` + `@DateFrom` + `@DateTo` -> filtered report/list
- `@InvoiceID` -> single document

### Step 5: Identify Joins
JOINed tables reveal related data:
- Customer tables -> header info (name, address, contact)
- Equipment/scope tables -> equipment detail section
- Line item tables -> repeating table rows
- Tech/employee tables -> assignment or sign-off fields

### Step 6: Generate Component
Using the matched archetype and analyzed data model, generate:
1. TypeScript interface for the proc's output shape
2. React component with on-screen preview layout
3. PDF document definition using react-pdf/renderer
4. Data fetching hook calling the proc's API endpoint
5. Any formatters needed (currency, dates, serial numbers)

---

## Data Protection Rules

### NEVER expose in customer-facing forms:
- Internal repair cost / parts cost
- Technician labor rates or hours
- Margin or markup percentages
- Vendor/supplier names or pricing
- Internal notes or comments flagged as internal
- Expense multiplier data
- Any column named or aliased with: `Cost`, `Margin`, `Markup`, `InternalNote`, `VendorPrice`, `LaborRate`, `LaborCost`

### Always include in customer-facing forms:
- TSI logo and contact information
- Form title and reference number
- Date generated
- Customer name and address
- Professional footer

### Always include in internal forms:
- "INTERNAL USE ONLY" footer designation
- Form reference number
- Date generated
- Print date/time stamp

---

## PDF Export Configuration

```tsx
// Standard PDF page setup
const styles = StyleSheet.create({
  page: {
    size: 'LETTER',
    orientation: 'portrait',
    paddingTop: 54,      // 0.75"
    paddingBottom: 54,
    paddingLeft: 54,
    paddingRight: 54,
    fontFamily: 'Helvetica', // PDF equivalent of Arial
    fontSize: 10,
    color: '#333333',
  },
  // ... component-specific styles
});
```

### PDF Font Note
`react-pdf/renderer` uses standard PDF fonts. Use `Helvetica` as the PDF equivalent of `Arial`. They are visually nearly identical. For on-screen React rendering, use `Arial` via CSS.

---

## Prompt Pattern

To generate a form, the prompt to Claude Code should be as simple as:

```
Generate the BrightLogix form for stored procedure [proc_name].
```

Claude Code should then:
1. Read the stored procedure SQL
2. Analyze per the rules above
3. Classify as customer-facing or internal
4. Match to an archetype
5. Generate the complete React + PDF component
6. Place in the correct directory (`/customer/` or `/internal/`)

No additional context should be needed if this directive and the stored procedure SQL are available.

---

## TSI Contact Info (for form headers/footers)

**Primary:**
Total Scope, Inc.
17 Creek Parkway
Upper Chichester, PA 19061
866-352-7697
info@totalscopeinc.com

**Nashville:**
601 Grassmere Park Dr, Ste 2
Nashville, TN 37211
844-843-2055

**Florida:**
Total Scope Florida LLC
10877 NW 52nd St, Ste 3 & 4
Sunrise, FL 33351
954-916-7347

**Tagline (exact — no alterations):** "The Leader in Medical Device Repair"

---

## Quality Checklist

Before finalizing any generated form, verify:
- [ ] Correct classification (customer vs internal)
- [ ] TSI branding applied per design system
- [ ] No internal cost data exposed on customer forms
- [ ] All proc output columns mapped to form fields
- [ ] Grouping/sorting logic preserved from proc
- [ ] Calculated fields match proc logic
- [ ] Currency formatting on all dollar amounts
- [ ] Date formatting consistent (MM/DD/YYYY)
- [ ] NULL/empty fields show em dash (—)
- [ ] PDF export renders correctly at US Letter size
- [ ] Page breaks logical (not splitting table rows)
- [ ] Footer present with page numbers
- [ ] Form title and reference number in header
