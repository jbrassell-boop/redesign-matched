# WinScope Crystal Reports — Master Index

**Goal:** Recreate all WinScope Crystal Reports as web-based reports in the new portal.

## Summary

| Category | Crystal Reports (.rpt) | Stored Procs (.sql) |
|----------|----------------------|-------------------|
| **Total** | **133 files** | **125 procs** |

## Source Locations

- **Crystal Report files:** `crystal-originals/` (binary .rpt from WinScope ClickOnce install)
- **Stored proc SQL:** `sql/<category>/` (extracted from WinScopeNet dev database)
- **Production source:** `J:\BrightLogix\Winscope Nashville\WinScopeNet_1_1_0_650\Reports\`

> **Note:** The .rpt files are binary Crystal Reports format. To view layouts (columns, grouping, formatting),
> open them in SAP Crystal Reports Designer. The stored proc SQL shows every data field each report uses.

---

## Reports by Category

### Sales & Revenue (15 procs)
Reports for client sales summaries, sales rep performance, revenue breakdowns, and trending.

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptClientSalesSummary` | WSClntSalesSmry.rpt | Client sales summary (non-contract) |
| `rptClientSalesSummaryContract` | WSClntSalesSmryContract.rpt | Client sales summary (contract) |
| `rptSalesByAccount` | — | Sales breakdown per account |
| `rptSalesRepLeaderboard` | — | Sales rep leaderboard rankings |
| `rptLeaderboardNonContract` | — | Non-contract leaderboard |
| `rptSalesRepsSalesByMonth` | — | Sales rep monthly breakdown |
| `rptSalesRepsSalesByMonthForSouth` | — | Sales rep monthly (Nashville) |
| `rptSalesCommissionReport` | — | Sales commission calculations |
| `rptRevenuePerSalesRep` | WSSalesRepSmry.rpt | Revenue per sales rep |
| `rptRevenuePerState` | — | Revenue by state |
| `rptRevenuePerStateAndSalesRep` | — | Revenue by state + rep |
| `rptPortalSalesByType` | — | Portal: sales by scope type |
| `rptPortalSalesPerAccount` | — | Portal: sales per account |
| `rptSalesTax` | — | Sales tax report |
| `rptProductSalesTrending` | — | Product sales trends |

**Related .rpt files:** WSSalesRepWeeklyInvoiced.rpt, WSSalesRepWeeklyProductivityMain.rpt, WSSalesRepWeeklyReceipts.rpt, WSSalesRepWeeklyScopeIn.rpt, WSSRSmryMain.rpt, WSSRSmryMainTotals.rpt

---

### Invoicing & Billing (11 procs)
Invoice generation, invoice lists, billing discrepancies, and credit limits.

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `spRptInvcList` | WSInvcList.rpt | Invoice list |
| `spRptInvcListExtract` | — | Invoice list data extract |
| `spRptInvoiceListForSouth` | — | Invoice list (Nashville) |
| `rptInvoiceGetForProductSale` | WSInvoiceProductSale.rpt | Product sale invoice |
| `rptInvoiceGetForSiteService` | — | Site service invoice |
| `rptInvoiceListAvalara` | — | Avalara tax integration |
| `rptContractBillingDiscrepancies` | — | Contract billing issues |
| `rptBillableReportByScopeType` | — | Billable by scope type |
| `rptBillableReportSummary` | — | Billable summary |
| `invoiceReportNonInstrument` | — | Non-instrument invoice |
| `rptPastDueCreditLimit` | WSInvoicesPastDue.rpt, WSInvoicesCreditLimit.rpt | Past due / credit limit |

**Related .rpt files:** WSInvoice.rpt, WSInvoiceContract.rpt, WSInvoiceContractPlain.rpt, WSInvoiceInstrument.rpt, WSInvoiceInstrument2.rpt, WSInvoicePlain.rpt, WSInvoicePlainNew.rpt, WSInvoicePrePrint.rpt

---

### Repair Documents (19 procs)
Final inspections, disassembly inspections, requests for approval, repair lists, and repair history.

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `spRptFnlIns` | WSFnlInsFlx.rpt, WSFnlInsFlxBlank.rpt | Final inspection (flexible) |
| `spRptFnlInsRigid` | WSFnlInsRgd.rpt, WSFnlInsRgdBlank.rpt | Final inspection (rigid) |
| `spRptRepairDisIns` | WSDisInsFlx.rpt, WSDisInsFlxBlank.rpt | Disassembly inspection |
| `spRptRepairList` | WSRprLst.rpt, WSRprLstAmts.rpt | Repair list |
| `spRptReqForApproval` | WSReqAprFlx.rpt, WSReqAprIns.rpt, WSReqAprRgd.rpt | Request for approval |
| `rptReqAprHdr` | WSReqAprCam.rpt | Req for approval header |
| `rptRepairAmendments` | — | Repair amendments |
| `rptRepairMetrics` | — | Repair metrics dashboard |
| `rptRepairCountsByScopeCategory` | — | Repair counts by category |
| `rptScopeRepairHistory` | WSScopeRprHistDtl.rpt, WSScopeRprHistSmry.rpt | Scope repair history |
| `rptScopeRepairHistoryExtract` | — | Repair history extract |
| `rptActiveRepairItemsWithCounts` | — | Active repair items |
| `rptRepairsWithoutTrackingNumbersIn` | — | Repairs missing tracking |
| `spRptDataSrcRepairFnlIns` | — | Data source: final inspection |
| `spRptDataSrcRepairFnlInsApproved` | — | Data source: approved FI |
| `spRptDataSrcRepairReqApr` | — | Data source: req for approval |
| `rptFinalInspectionFlex` | — | Final inspection flexible |
| `rptDI` | — | Disassembly inspection data |
| `repairUpdateSlipPrint` | WSRptTechSheet.rpt | Tech sheet / repair slip |

**Related .rpt files:** WSFnlInsCam.rpt, WSFnlInsCamBlank.rpt, WSFnlInsFlxDS.rpt, WSFnlInsFlxBlankFirstPage.rpt, WSFnlInsIns.rpt, WSFnlInsInsBlank.rpt, WSFnlInsInsNew.rpt, WSFnlInsInsNew2.rpt, WSDisInsCam.rpt, WSDisInsFlxNew.rpt, WSDisInsIns.rpt, WSDisInsRgd.rpt, WSReqAprIns2.rpt, WSReqAprInsNew.rpt, WSInsHstFlx.rpt, WSInsHstIns.rpt, WSInsHstRgd.rpt, WSRprLstInit.rpt, WSRprLstInitAmts.rpt, WSRprLstRep.rpt, WSRprLstRepAmts.rpt

---

### Cost Analysis (3 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptCostAnalysis` | — | Cost analysis (contract) |
| `rptCostAnalysisNonContract` | — | Cost analysis (non-contract) |
| `rptAverageExpensesPerScopeType` | — | Average expenses per scope type |

---

### Inventory & Purchasing (14 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptInventoryOrdering` | WSInvReorder.rpt | Inventory reorder report |
| `rptInventoryWeeklyAudit` | — | Weekly inventory audit |
| `rptExpiringInventory` | — | Expiring inventory items |
| `rptRepairItemsActiveNotUsedRecently` | — | Stale repair items |
| `rptRepairItemsParentChildExtract` | — | Parent/child item extract |
| `rptPOHeader` | WSPurchaseOrder.rpt | Purchase order header |
| `rptPODetail` | — | Purchase order detail |
| `rptPOReceipts` | — | PO receipts |
| `rptAcquisitionPOHeader` | WSAcquisitionPurchaseOrder.rpt | Acquisition PO |
| `rptSupplierInventorySizePricing` | — | Supplier pricing by size |
| `rptSuppliersExtract` | — | Suppliers data extract |
| `rptDuplicatePartNumbers` | — | Duplicate part numbers |
| `inventoryUsedReport` | WSInvUsage.rpt | Inventory usage |
| `rptNonContractInstrumentsSummary` | — | Non-contract instruments summary |

**Related .rpt files:** WSInvCurrLvls.rpt, WSInventoryPickList.rpt, WSPOWorkReOrder.rpt, WSPOWorkUnSupplier.rpt, WSCartPurchaseOrder.rpt

---

### Loaners (5 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptLoanerStatus` | WSOutLoaners.rpt | Outstanding loaners |
| `rptLoanersByDateRange` | — | Loaners by date range |
| `rptLoanerRequestsUnfulfilled` | — | Unfulfilled loaner requests |
| `rptDILoaner` | — | DI loaner report |
| `clientLoanersOutReport` | — | Client loaners out |

---

### Contracts (4 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptContractScopes` | — | Contract scopes list |
| `rptContractSubGroupExtract` | — | Contract sub-group data |
| `rptContractUtilizationByScopeType` | — | Contract utilization |
| `rptExpiringContracts` | — | Expiring contracts |

---

### Clients & Departments (9 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `spRptClientActivity` | WSClnAct.rpt, WSClnActYTD.rpt | Client activity |
| `rptActiveDepartmentsNoActivity` | — | Active depts with no activity |
| `rptDepartmentAudit` | — | Department audit |
| `rptDepartmentContactExtract` | — | Department contact export |
| `rptAtRiskDepartments` | — | At-risk departments |
| `rptAtRiskScopes` | — | At-risk scopes |
| `rptAnnualSurvey_ActiveCustomers` | WSCustomerSatisfaction.rpt | Customer satisfaction survey |
| `rptNetNewCustomers` | — | Net new customers |
| `rptOpsNewCustomers` | — | Ops new customers |

**Related .rpt files:** WSClnInAct.rpt, WSActCht.rpt

---

### Cart & Product Sales (4 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptCartPackingList` | WSCartPackingSlip.rpt | Cart packing slip |
| `rptCartQuote` | WSCartQuote.rpt | Cart quote |
| `rptProductSalePickList` | WSProductSalePackingList.rpt | Product sale pick list |
| `rptProductSaleQuote` | WSProductSaleQuote.rpt | Product sale quote |

**Related .rpt files:** WSCartPickList.rpt

---

### QA & Defects (7 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptDefectTracking` | — | Defect tracking |
| `rptRepairDefectTracking` | — | Repair defect tracking |
| `rptRepairDefectTrackingForSouth` | — | Defect tracking (Nashville) |
| `rptNonConformance` | — | Non-conformance report |
| `rptNonConformanceForSouth` | — | Non-conformance (Nashville) |
| `rptQAMissingDocumentation` | — | Missing QA documentation |
| `rptQAMissingDocumentationForSouth` | — | Missing QA docs (Nashville) |

**Related .rpt files:** WSISOComplaint.rpt

---

### Operations & Portal (32 procs)
Bonus pools, turnaround times, portal data sources, email reports, and misc operational reports.

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `rptBonusPoolOps` | — | Ops bonus pool |
| `rptBonusPoolTechs` | — | Tech bonus pool |
| `rptTurnAroundTimesYTDByMonth` | — | Turnaround times YTD |
| `rptWithin40Days` | — | Within 40 days report |
| `rptDIWithin40Days` | — | DI within 40 days |
| `rptMobileAppMetrics` | — | Mobile app metrics |
| `rptVendorTracking` | — | Vendor tracking |
| `rptCreateLeaderboardView` | — | Create leaderboard view |
| `onsiteServiceReport` | — | Onsite service report |
| `activityReportGet` | — | Activity report |
| `activityReportGetForSouth` | — | Activity report (Nashville) |
| `emailManagersReport` | — | Managers email report |
| `emailSalesRepReport` | — | Sales rep email report |
| `emailLabReport` | — | Lab email report |
| `portalReportsGet` | — | Portal: report list |
| `portalReportColumnsGet` | — | Portal: report columns |
| `portalReportCriteriaGet` | — | Portal: report criteria |
| `portalRptDataSrcRepairFnlIns` | — | Portal: FI data source |
| `portalRptDataSrcRepairFnlIns_Total` | — | Portal: FI totals |
| `portalRptDataSrcRepairFnlInsIns` | — | Portal: FI instruments |
| `portalRptDataSrcRepairFnlInsRigid` | — | Portal: FI rigid |
| `portalRptDataSrcRepairInvoiceHdr` | — | Portal: invoice header |
| `portalRptDataSrcRepairReqApr` | — | Portal: req for approval |
| `portalRptDataSrcRepairReqAprIns` | — | Portal: RFA instruments |
| `portalRptReqApr` | — | Portal: req for approval |
| `portalRptReqAprInstrument` | — | Portal: RFA instruments |
| `portalRptSalesPerAccount` | — | Portal: sales per account |
| `portalRptSalesRepCountByType` | — | Portal: rep count by type |
| `portalInvoiceGetInfoForPrint` | — | Portal: invoice print info |
| `portalInvoicePrepareForPrint` | — | Portal: invoice print prep |
| `portalInvoicePrepareForPrintInstrument` | — | Portal: instrument print |
| `rptScopeRepairHistoryInsert` | — | Scope repair history insert |

---

### Exports (2 procs)

| Stored Proc | Crystal Report(s) | Purpose |
|---|---|---|
| `spRptBroadLaneExport` | WSBroadlaneExport.rpt | Broadlane GPO export |
| `rptRenovoRepairs` | — | Renovo repairs export |

**Related .rpt files:** WSHPGExport.rpt, WSNovationExport.rpt, WSExportMemHermOB10.rpt, WSExportPeachTree.rpt, WSExportPTCustomer.rpt, WSExportPTInvoice.rpt, WSExportPTSalesRep.rpt, WSExportVAOB10.rpt

---

### Other Crystal Reports (no matching stored proc)
These .rpt files exist but don't have a direct stored proc match — they may use inline SQL or temp tables.

- WSLabel.rpt — Label printing
- WSReturnVerification.rpt — Return verification form

---

## Next Steps

1. **Prioritize** — Decide which reports to build first for the new portal
2. **Design new layouts** — Modern web-based reports (data grids, charts, PDF export)
3. **Map to portal screens** — Integrate reports into existing portal pages
4. **Consolidate North/South** — Eliminate duplicate "ForSouth" procs with multi-location support
