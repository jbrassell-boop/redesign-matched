# D&I Scan-to-Repair Service — Design Spec
**Date:** 2026-04-15  
**Status:** Approved for planning  
**Scope:** Add-on feature; does not block June 1, 2026 portal rollout

---

## Overview

Technicians at TSI fill out a paper Flexible Endoscope Diagnostic Report (OM05-1) during Disassembly & Inspection. The form is scanned and dropped into a shared network folder. A Windows Service reads the barcode (work order lookup) and filled P/F/N/A boxes (failure detection), automatically loads repair line items onto the work order, and queues it for an ops person to review before a Requisition for Approval is generated.

This replaces manual repair entry after D&I and eliminates the risk of failures being missed between the inspection and the work order.

---

## Data Flow

```
[Tech fills paper OM05-1]
        ↓
[Scanner drops image/PDF into shared network folder]
        ↓
[DiScanService — Windows Service on app server]
  1. FileSystemWatcher detects new file
  2. Aspose.BarCode reads WO# barcode
  3. Aspose.OMR reads P/F/N/A boxes against OM05-1 template
  4. Looks up each failure in tblDiRepairMapping → repair catalog item keys
  5. INSERTs line items into tblRepairLineItems for the WO
  6. Sets WO status → "Pending D&I Review" (lRepairStatusID)
  7. Writes a row to tblDiScanLog (success, WO#, failure count, file path)
  8. Moves scan file to archive subfolder
        ↓
[Portal — D&I Scan Review Queue]
  Ops person sees WO with auto-loaded repairs and failure list
  Transcribes handwritten tech comments into portal
  Removes or adjusts line items if needed
  Clicks "Approve & Generate Requisition"
        ↓
[Existing Requisition for Approval flow (OM07-2)]
```

---

## Components

### 1. Redesigned OM05-1 Paper Form

The existing D&I intake form is updated to be OMR-compatible:

- **Barcode:** Work order number barcode printed at top-right when WO is created (barcode itself unchanged — only the P/F/N/A box positions are standardized for OMR)
- **Bubble columns:** P / F / N/A square boxes in fixed, consistent positions across all rows — Aspose.OMR reads these against a registered template
- **Comment column:** Blank write-in line on every row — ops transcribes these manually during queue review
- **Sections (D&I intake only — post-repair items excluded):**
  - 3A · Leak Test & Fluid Invasion (2 items)
  - 3B · Angulation System (degree write-ins + 1 P/F row)
  - 3C · Image & Light Transmission (7 items + fiber numeric write-ins)
  - 3D · Channel Function (4 items)
  - 3E · Electrical & Connector Integrity (1 item)
  - 3F · Control Body (write-in only, no boxes)
  - 3G–3I · Insertion Tube, Distal Tip & Cord (4 items)
  - Section 4 · Detailed Inspection / Internal Channels (1 item)
  - Scope Condition (4 checkboxes: Not Patient Safe / Functional Issue / Cosmetic Only / No Issues Found)
  - Section 5 · Repair Assessment / Tech Notes (write-in)
  - Photos / Residue Notes (write-in)
  - Signatures

**OMR template** must be registered in Aspose.OMR before go-live and validated against physical scans from the actual scanner used.

---

### 2. DiScanService — Windows Service

**Project:** New .NET 8 Windows Service (`DiScanService`)  
**Host:** App server alongside WinScopeNet (Goldmine server)  
**Technology:** .NET 8 Worker Service + Aspose.BarCode + Aspose.OMR + Microsoft.Data.SqlClient  
**No external API calls — fully local**

**Startup:**
- Registers `FileSystemWatcher` on configured shared folder path (from `appsettings.json`)
- Loads Aspose.OMR template for OM05-1 on startup

**On new file detected:**
1. Wait briefly for file write to complete (configurable delay, default 2s)
2. Read barcode → extract WO number string
3. If barcode unreadable → log to `tblDiScanLog` as error, move file to `\errors\` subfolder, stop
4. Look up WO in WinScopeNet → verify it exists and is in a pre-D&I status (any status except 'DI_REVIEW', 'Completed', or 'Cancelled')
5. If WO not found or already processed → log error, move to `\errors\`, stop
6. Run Aspose.OMR against OM05-1 template → get list of failed items (F-marked fields)
7. For each failed item, query `tblDiRepairMapping` → get repair catalog item key(s)
8. INSERT repair line items into `tblRepairLineItems` (approved = 'P' for pending)
9. UPDATE WO status → "Pending D&I Review"
10. INSERT row to `tblDiScanLog`
11. Move original file to `\archive\YYYY-MM-DD\` subfolder

**Configuration (appsettings.json):**
```json
{
  "DiScan": {
    "WatchFolder": "\\\\server\\scans\\di-intake",
    "ArchiveFolder": "\\\\server\\scans\\di-archive",
    "ErrorFolder": "\\\\server\\scans\\di-errors",
    "FileSettleDelayMs": 2000,
    "OmrTemplatePath": "C:\\TSI\\DiScanService\\templates\\OM05-1.omr"
  },
  "ConnectionStrings": {
    "WinScopeNet": "Server=10.0.0.15\\Goldmine;Database=WinScopeNet;Trusted_Connection=True"
  }
}
```

---

### 3. Database Changes

Three new objects in WinScopeNet. All changes packaged as a Word doc for Steve to deploy.

#### `tblDiRepairMapping`
Maps each D&I inspection field to one or more repair catalog items.

```sql
CREATE TABLE tblDiRepairMapping (
    lMappingKey     INT IDENTITY(1,1) PRIMARY KEY,
    sInspectionField VARCHAR(50) NOT NULL,   -- matches OMR field name, e.g. 'insAngulationPF'
    lRepairItemKey  INT NOT NULL,            -- FK → repair catalog item
    sDescription    VARCHAR(200) NULL,       -- human-readable label for ops queue display
    bActive         BIT NOT NULL DEFAULT 1,
    dtCreated       DATETIME NOT NULL DEFAULT GETDATE()
)
```

**Note:** This table has no data at go-live. Joe and techs must define mappings for all ~20 D&I fields before the service goes live. This is the critical pre-launch dependency.

#### New status in `tblRepairStatuses`
```sql
INSERT INTO tblRepairStatuses (sStatusDesc, sStatusCode)
VALUES ('Pending D&I Review', 'DI_REVIEW')
```

#### `tblDiScanLog`
Audit trail for every scan attempt.

```sql
CREATE TABLE tblDiScanLog (
    lLogKey         INT IDENTITY(1,1) PRIMARY KEY,
    dtScanned       DATETIME NOT NULL DEFAULT GETDATE(),
    sFileName       VARCHAR(500) NULL,
    sWorkOrderNumber VARCHAR(50) NULL,
    sStatus         VARCHAR(20) NOT NULL,    -- 'Success', 'BarcodeError', 'WONotFound', 'OMRError'
    iFailureCount   INT NULL,
    iItemsLoaded    INT NULL,
    sErrorMessage   VARCHAR(1000) NULL,
    sArchivePath    VARCHAR(500) NULL
)
```

---

### 4. Portal — D&I Scan Review Queue

**Location:** New page in redesign-matched portal (`/di-review`)  
**Access:** Ops role only

**Queue list view:**
- Lists all WOs with status "Pending D&I Review"
- Columns: Work Order, Client, Scope Type/Model, Scanned (timestamp), Failure Count, Items Loaded
- Scan errors (BarcodeError / OMRError) shown with warning badge and a "Fix" action that opens the WO directly
- Sorted by scanned timestamp ascending (oldest first)

**Review panel (inline expand):**
- Shows each D&I failure alongside its auto-loaded repair item
- Ops can remove individual items if incorrect
- Text field to transcribe handwritten tech comments from paper form into `diInsComments`
- **Approve & Generate Requisition** button:
  - Sets line item approved status to 'P' (pending customer approval)
  - Sets WO status back to normal repair workflow status
  - Opens existing Requisition for Approval (OM07-2) print view

**Hold button:** Leaves WO in "Pending D&I Review" status. Ops enters a reason which is appended to `diInsComments` on the WO.

---

## Error Handling

| Scenario | Service behavior | Ops visibility |
|---|---|---|
| Barcode unreadable | Log error, move to `\errors\` | Scan error badge in queue — ops opens WO manually |
| WO not found in DB | Log error, move to `\errors\` | Same |
| No mapping for a failed item | Skip that item, log warning | Items loaded count reflects what mapped; ops adds manually |
| OMR confidence below threshold | Log as OMRError, move to `\errors\` | Scan error badge |
| Duplicate scan (WO already reviewed) | Log warning, do not re-insert | No queue entry created |

---

## Pre-Launch Dependencies

These must be completed before the service can go live — they are not code tasks:

1. **Failure → repair catalog mapping table populated** (`tblDiRepairMapping`) — Joe + tech leads define which repair catalog item corresponds to each of the ~20 D&I inspection fields
2. **OM05-1 form redesigned and printed** — updated form with consistent OMR box positions
3. **Aspose.OMR template validated** — physical form filled, scanned on actual scanner, template confirmed accurate
4. **Shared folder path confirmed** — IT confirms path and service account permissions

---

## Out of Scope

- Camera System D&I form (OM05-2) — separate form, separate spec if needed later
- Post-repair inspection scanning — post-repair is done in the portal by techs with access
- Handwriting recognition for comment fields — comments are transcribed manually by ops
- PDF generation changes — existing Requisition for Approval (OM07-2) used as-is
- Email sending of requisition — existing workflow unchanged

---

## Rollout Strategy

The new portal rolls out June 1, 2026. This feature ships as an add-on — the portal goes live on schedule regardless. DiScanService goes live when:
1. All pre-launch dependencies are complete
2. End-to-end test passes with real scans on the actual production scanner
3. Steve deploys DB changes to production
4. Service installed and configured on app server
