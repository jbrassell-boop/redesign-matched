# Schema Discovery Notes — WinScopeNet
**Server:** 10.0.0.15\Goldmine | **DB:** WinScopeNet  
**Run date:** 2026-04-14 | **By:** schema-discovery.sql (READ ONLY)

---

## 1. Loaner Tables

**Tables found:**
- `tblLoanerTran` — primary transaction table (loaner out/in per repair)
- `tblRptOutstandingLoaner` — report staging table
- `tblShippingUPS_Loaners` — UPS shipping records for loaners
- `tblTaskLoaners` — task-level loaner tracking
- `vwLoanerTran`, `vwLoanerTranNew` — views

**Architecture:** Loaners are tracked BOTH on `tblRepair` (flag columns) AND via a separate transaction table.

**tblRepair loaner columns:**
| Column | Type | Notes |
|--------|------|-------|
| `sLoanerRepair` | nvarchar | ? |
| `bLoanerRequested` | bit | Whether a loaner was requested |
| `sWasLoanerProduced` | nvarchar | Whether a loaner was actually provided |
| `lScopeKey_Loaner` | int | FK to the specific loaner scope |

**tblLoanerTran columns (full):**
| Column | Type |
|--------|------|
| lLoanerTranKey | int |
| lDepartmentKey | int |
| lScopeKey | int |
| lRepairKey | int |
| lSalesRepKey | int |
| lDeliveryMethodKey | int |
| lCompanyKey | int |
| sDateOut | nvarchar |
| sDateIn | nvarchar |
| lSessionID | int |
| lSessionKey | int |
| sRepairClosed | nvarchar |
| sPurchaseOrder | nvarchar |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sTrackingNumber | nvarchar |
| lContractKey | int |
| sDateInBackup | nvarchar |

**Key join:** `tblLoanerTran.lRepairKey` → `tblRepair.lRepairKey`  
**Loaner out:** `sDateOut IS NOT NULL AND sDateIn IS NULL`  
**Loaner fulfilled:** Use `bLoanerRequested = 1` on `tblRepair`; actual loaner FK is `lScopeKey_Loaner`

---

## 2. Defect Tracking Tables

**Tables found:**
- `tblDefectTrackingItems` — lookup/reference table (defect categories)
- `tblRepairDefectTracking` — junction table linking defects to repairs

**tblDefectTrackingItems columns:**
| Column | Type |
|--------|------|
| lDefectTrackingItemKey | int |
| sDefectTrackingItem | nvarchar |
| lDisplayOrder | int |

**tblRepairDefectTracking columns:**
| Column | Type |
|--------|------|
| lRepairKey | int |
| lDefectTrackingItemKey | int |
| sComment | nvarchar |

**Note:** There is no `responsible tech` column directly on `tblRepairDefectTracking`. Responsible tech for a defect would be derived from the repair's assigned technician on `tblRepair` (e.g., `lTechnicianKey1`/`lTechnicianKey2`). No dedicated "responsible tech" column on this table.

---

## 3. Inventory and Lot Tables

**Key tables:**
- `tblInventory` — master inventory item list (levels, min/max)
- `tblInventoryItems` — individual serialized/lot-tracked inventory items
- `tblInventoryTran` — transaction log (used, received per repair)
- `tblRepairInventory` — junction: repair item transaction → inventory size → scope type repair item
- `tblInventorySize` — SKU-level size variants of inventory items
- `tblSupplierPO` / `tblSupplierPOTran` — purchasing/ordering (see Section 6)

**tblInventory columns:**
| Column | Type |
|--------|------|
| lInventoryKey | int |
| sItemDescription | nvarchar |
| nLevelMinimum | int |
| nLevelMaximum | int |
| nLevelCurrent | int |
| sRigidOrFlexible | nvarchar |
| bNoCountAdjustment | bit |
| bNotUsedByRepair | bit |
| bAlwaysReOrder | bit |
| bActive | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| bLargeDiameter | bit |
| bSkipPickList | bit |

**tblInventoryTran columns (key columns for repair cost linkage):**
| Column | Type | Notes |
|--------|------|-------|
| lInventoryTranKey | int | PK |
| lInventorySizeKey | int | → tblInventorySize |
| lRepairKey | int | Links to repair |
| lSupplierPOTranKey | int | Links to PO transaction |
| nTranQuantity | int | |
| dtTranDate | datetime | |
| sLotNumber | nvarchar | |
| lRepairItemTranKey | int | |

**tblInventoryItems columns:**
| Column | Type | Notes |
|--------|------|-------|
| lInventoryItemKey | int | PK |
| lInventorySizeKey | int | → tblInventorySize |
| lInventoryTranKey_Received | int | When received |
| lInventoryTranKey_Used | int | When used |
| sLotNumber | nvarchar | |
| sOrderNumber | nvarchar | |
| sPositionNumber | nvarchar | |

**tblRepairInventory columns:**
| Column | Type |
|--------|------|
| lRepairInventoryKey | int |
| lRepairItemTranKey | int |
| lScopeTypeRepairItemInventoryKey | int |

**Join path for repair → inventory cost:**
`tblRepair` → `tblInventoryTran.lRepairKey` → `tblInventorySize.lInventorySizeKey` → `tblInventory.lInventoryKey`

---

## 4. Amendment Reason Tables

**Tables found:**
- `tblAmendRepairComments` — actual amendment records per repair
- `tblAmendRepairReasons` — reason lookup (FK: `lAmendRepairReasonKey`)
- `tblAmendRepairTypes` — type lookup (FK: `lAmendRepairTypeKey`)
- `tblContractAmendments`, `tblContractAmendmentScopes`, `tblContractAmendmentStatuses` — contract-level amendments (separate)

**tblAmendRepairTypes values:**
| lAmendRepairTypeKey | sAmendRepairType |
|---------------------|-----------------|
| 1 | Not Repairable |
| 2 | Additional Findings |
| 3 | Rework |

**tblAmendRepairReasons values (active=True rows in bold):**
| lAmendRepairReasonKey | lAmendRepairTypeKey | sAmendRepairReason | bActive |
|-----------------------|---------------------|--------------------|---------|
| 1 | 1 | Damage missed during D&I | False |
| 2 | 1 | Damage during repair | False |
| 3 | 2 | Damage missed during D&I | False |
| 4 | 2 | Damage found during repair | False |
| 5 | 1 | Replacement parts not available | False |
| 6 | 2 | Damage during Final QC | False |
| 7 | 2 | Failure during repair | False |
| 8 | 2 | Account Manager Request | False |
| 9 | 3 | Improper Repair Technique | False |
| 10 | 3 | Defective Component | False |
| **11** | **2** | **Failure missed during D & I** | **True** |
| **12** | **2** | **Failure missed during update** | **True** |
| **13** | **2** | **Failure found during repair** | **True** |
| **14** | **2** | **Result of another repair being performed** | **True** |
| **15** | **2** | **Misquote by operations** | **True** |
| **16** | **1** | **Part failure during repair** | **True** |
| **17** | **3** | **Failure found during final QC** | **True** |
| 18 | 2 | I/B lens separation | NULL |
| 19 | 2 | lights failed during repair | NULL |
| 20 | 2 | need replace br | NULL |

**Key values for report sections:**
- **Missed D&I:** `lAmendRepairReasonKey = 11` ("Failure missed during D & I", Type 2 = Additional Findings)
- **Repeat repair damage / result of other repair:** `lAmendRepairReasonKey = 14` ("Result of another repair being performed")
- **Misquote:** `lAmendRepairReasonKey = 15` ("Misquote by operations")
- **Not Repairable amendments:** `lAmendRepairTypeKey = 1` (type = "Not Repairable")
- **Additional Findings:** `lAmendRepairTypeKey = 2`
- **Rework:** `lAmendRepairTypeKey = 3`

---

## 5. Update Slip Tables

**Tables found:**
- `tblRepairUpdateSlips` — main update slip record per repair
- `tblRepairUpdateSlipReasons` — reasons attached to each slip (junction)
- `tblUpdateSlipReasons` — reason lookup/categories (130 entries)
- `tblMainRepairUpdateSlipReasons` — higher-level reason categories (23 entries)

**tblRepairUpdateSlips columns:**
| Column | Type | Notes |
|--------|------|-------|
| lRepairUpdateSlipKey | int | PK |
| lRepairKey | int | FK to repair |
| dtUpdateRequestDate | datetime | When slip was created |
| lResponsibleTech | int | Tech responsible |
| lResponsibleTech2 | int | Secondary tech |
| lMainRepairUpdateSlipReasonKey | int | → tblMainRepairUpdateSlipReasons |

**tblRepairUpdateSlipReasons columns:**
| Column | Type |
|--------|------|
| lRepairUpdateSlipReasonKey | int |
| lRepairUpdateSlipKey | int |
| lUpdateSlipReasonKey | int |
| sUpdateSlipReasonComment | nvarchar |

**Key join:** `tblRepairUpdateSlips.lRepairUpdateSlipKey` → `tblRepairUpdateSlipReasons.lRepairUpdateSlipKey`  
**Reason text:** → `tblUpdateSlipReasons.lUpdateSlipReasonKey`

**tblMainRepairUpdateSlipReasons (top-level reason categories, 23 rows):**
| Key | Reason |
|-----|--------|
| 1 | Fluid Invasion |
| 2 | Leak Not Found - Precaution |
| 3 | Electronic/Video Issue Not Found - Precaution |
| 4 | Root Cause / 40 Day |
| 5 | More Info Requested From Customer |
| 6 | Image Malfunctioning - No Fluid |
| 7 | Capabilities |
| 8 | Control Switches Malfunctioning |
| 9 | More evaluation time needed |
| 10 | Part Availability |
| 11 | Tight Angulation |
| 12 | Master tech eval |
| 13 | Fluid |
| 14 | More evaluation time needed- Fluid |
| 15 | Light Reading Check |
| 16 | Corrosion |
| 17 | No Fluid- Massive Leak Found- Precaution |
| 18 | Fluid Check |
| 19 | Possible CCD Failure |
| 20 | Leak Present- Unknown Location |
| 21 | Lights |
| 22 | Additional Findings |
| 23 | Image Bundle |

---

## 6. Ordering / Purchasing / Receiving Tables

**Q6 (LIKE '%Order%'/'%Purchas%'/'%Receiv%') returned 0 rows** — those patterns don't match.

**Found via lSupplierPOTranKey FK in tblInventoryTran and LIKE '%Supplier%'/'%PO%':**
- `tblSupplierPO` — purchase order header
- `tblSupplierPOTran` — PO line items / receipts (key columns below)
- `tblSupplierPOTypes` — PO type lookup
- `tblSupplierSizes` — supplier size variants
- `tblSupplierRoles`, `tblSupplierRolesRef` — supplier role lookup
- `tblInventoryNextSupplier` — default supplier per inventory item
- `tblGPOs`, `tblGP_POAudit`, `tblPOsToProcessInGP` — GP integration
- `tblRptPOHdr`, `tblRptPODtl`, `tblRptPOWorkReports` — PO report staging

**tblSupplierPOTran key columns (receiving):**
| Column | Type | Notes |
|--------|------|-------|
| lSupplierPOTranKey | int | PK |
| lSupplierPOKey | int | FK to header |
| lSupplierSizesKey | int | What was ordered |
| dblUnitCost | float | Unit cost |
| nOrderQuantity | int | Qty ordered |
| nReceivedQuantity | int | Qty actually received |
| dtEstimatedDeliveryDate | datetime | Expected delivery |
| bIntegratedWithGP | bit | Posted to GP |

---

## 7. Not Repairable Repair Item Keys

Multiple entries found (different scope type product lines):

| lRepairItemKey | sItemDescription |
|----------------|-----------------|
| 63 | Not Repairable |
| 197 | Not Repairable |
| 379 | Not Repairable |
| 508 | Not Repairable |
| 657 | Not Repairable |
| 259 | Not Repairable at TSI |

**Note:** The column is `sItemDescription` (NOT `sRepairItem` — that column does not exist).  
For SQL filtering, use: `sItemDescription LIKE '%Not Rep%'` or `IN (63, 197, 259, 379, 508, 657)`.  
There are 5 "Not Repairable" entries and 1 "Not Repairable at TSI" — likely different scope type product lines all share the concept. Use the LIKE pattern rather than hardcoded keys.

---

## 8. tblAmendRepairComments — Full Column List

| Column | Type | Notes |
|--------|------|-------|
| lAmendRepairCommentKey | int | PK |
| lRepairKey | int | FK to repair |
| lUserKey | int | User who created the amendment |
| lAmendRepairTypeKey | int | → tblAmendRepairTypes (1=NR, 2=AddFindings, 3=Rework) |
| lAmendRepairReasonKey | int | → tblAmendRepairReasons |
| sAmendRepairComment | nvarchar | Free-text comment |
| lAmendmentNumber | int | Amendment sequence number per repair |
| dtAmendmentDate | datetime | Date of amendment |
| bApprovalDateReset | bit | Whether approval date was reset |

---

## 9. tblRepairUpdateSlips — Full Column List

(See Section 5 above — columns already documented there)

---

## 10. fnWithin40Days — All Output Columns

**Signature:** `dbo.fnWithin40Days(dtStart, dtEnd, sLocation, bSouth)`  
**Example:** `fnWithin40Days('2026-03-01', '2026-03-31', 'A', 0)`

**All columns returned:**

| Column | Notes |
|--------|-------|
| sClientName1 | Customer/hospital name |
| sDepartmentName | Department |
| sWorkOrderNumber | Work order / repair number |
| dtDateIn | Date scope came in |
| nDaysSinceLastIn | Days since last repair |
| sComplaintDesc | Customer complaint description |
| sScopeTypeDesc | Scope type description |
| sSerialNumber | Scope serial number |
| sRepLast | Sales rep last name |
| sRepFirst | Sales rep first name |
| ResultOfImproperCareByCustomer | Flag: improper care by customer |
| Failure_ImproperCare | Failure code: improper care |
| Failure_Part | Failure code: part |
| Failure_Cosmetic | Failure code: cosmetic |
| Failure_ImproperTechnique | Failure code: improper technique |
| Failure_PreviousInspection | Failure code: previous inspection issue |
| Failure_PreviousRepairs | Failure code: previous repairs |
| Failure_Complaint | Failure code: complaint |
| Failure_NoPreviousRepairs | Flag: no previous repairs |
| Failure_Other | Failure code: other |
| lSalesRepKey | Sales rep FK |
| lDepartmentKey | Department FK |

**Total: 22 columns**

---

## 11. tblRepairFailureCodes — Column List

| Column |
|--------|
| lRepairKey |
| lFailureCode |
| sComment |

**Note:** `lFailureCode` is likely an FK to a failure code lookup. The `Failure_*` columns in `fnWithin40Days` appear to be pre-aggregated/denormalized versions of these codes. For the avoidable damage section, join `tblRepair` → `tblRepairFailureCodes.lRepairKey`.

---

## 12. Reason Tables (catch-all)

| Table | Purpose |
|-------|---------|
| tblAmendRepairReasons | Amendment reasons (documented in Section 4) |
| tblMainRepairUpdateSlipReasons | High-level update slip reason categories (documented in Section 5) |
| tblRepairReasonCategories | Repair reason categories (not yet queried) |
| tblRepairReasons | Repair reason lookup (not yet queried) |
| tblRepairUpdateSlipReasons | Update slip reason junction (documented in Section 5) |
| tblScopeExpenseReasonItems | Scope expense reason items (not yet queried) |
| tblScopeExpenseReasons | Scope expense reasons (not yet queried) |
| tblUpdateSlipReasons | Update slip reason lookup — 130 entries (documented in Section 5) |

---

## Open Items / Ambiguities

1. **tblRepairReasons / tblRepairReasonCategories** — not queried. May be relevant for complaint/failure classification in the ops review. Query if needed: `SELECT * FROM tblRepairReasons ORDER BY 1`

2. **Not Repairable keys** — 6 keys across different product lines. Confirm with Steve which key(s) apply to the scope types in scope for the report. The LIKE pattern is safer.

3. **No responsible tech column on defect tracking** — `tblRepairDefectTracking` has no tech column. Responsible tech must be derived from `tblRepair.lTechnicianKey1` or equivalent.

4. **Q6 — No Order/Purchase/Receive tables matched original patterns** — The purchasing system uses `tblSupplierPO` / `tblSupplierPOTran` naming. Document updated in Section 6.

5. **tblRepairDefectTracking has no PK column** — `lRepairKey` + `lDefectTrackingItemKey` appears to be a composite key. Confirm before writing aggregation queries.
