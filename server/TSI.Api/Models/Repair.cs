namespace TSI.Api.Models;

public record RepairListItem(
    int RepairKey,
    string Wo,
    string DateIn,
    string Client,
    string Dept,
    string ScopeType,
    string Serial,
    int DaysIn,
    string Status,
    int StatusId,
    bool IsUrgent
);

public record RepairDetail(
    int RepairKey,
    string Wo,
    string DateIn,
    string Client,
    string ClientKey,
    string Dept,
    int DeptKey,
    string ScopeType,
    string Serial,
    int DaysIn,
    string Status,
    int StatusId,
    bool IsUrgent,
    string? Tech,
    int? TechKey,
    string? Complaint,
    string? DateApproved,
    string? EstDelivery,
    decimal? AmountApproved,
    string? ShipDate,
    string? TrackingNumber,
    string? InvoiceNumber,
    string? Notes
);

public record UpdateRepairNotesRequest(string Notes);

public record RepairListResponse(
    IEnumerable<RepairListItem> Repairs,
    int TotalCount
);

// ── Repair line items (Workflow tab) ──
public record RepairLineItem(
    int TranKey,
    string Approved,
    string ItemCode,
    string Description,
    string Cause,
    string FixType,
    decimal Amount,
    decimal BaseAmount,
    string Tech,
    string Comments,
    int AmendmentCount
);

// ── Scope History tab ──
public record RepairScopeHistory(
    int RepairKey,
    string Wo,
    string DateIn,
    string Status,
    string ScopeType,
    string Client,
    int DaysIn,
    decimal? Amount
);

// ── Status workflow ──
public record RepairStatusOption(
    int StatusId,
    string StatusName,
    int? SortOrder
);

public record UpdateRepairStatusRequest(int StatusId);

public record RepairStatusLogEntry(
    int LogId,
    string StatusName,
    DateTime ChangedAt,
    string? ChangedBy
);

// ── Full Cockpit Detail ──
public record RepairFull(
    // Core identity
    int RepairKey, string Wo, string Status, int StatusId, bool IsUrgent,
    // Related entities
    string Client, int ClientKey, string Dept, int DeptKey,
    string ScopeType, string Serial, string? ScopeModel, string? Manufacturer, string? CapFfs,
    // Scope-type discriminator: 'R' (Rigid), 'F' (Flexible), 'C' (Camera), or '' if unknown.
    // Source: tblScopeType.sRigidOrFlexible. Used by the cockpit to pick the right
    // D&I/BI form and inspection form variants per scope type.
    string? RigidOrFlexible,
    // Dates
    string DateIn, string? DateApproved, string? EstDelivery, string? ShipDate, string? DateOut,
    int DaysIn,
    // People. Tech2Key is carried alongside the name so the Update Techs modal
    // can preload the CURRENT occupant of the secondary slot by key.
    string? Tech, int? TechKey, string? Tech2, int? Tech2Key, string? Inspector,
    string? ApprovalName, string? SalesRep,
    // Financial
    decimal? AmountApproved, string? InvoiceNumber, string? PurchaseOrder,
    // Complaint & Notes
    string? Complaint, string? Notes, string? CustomerRef,
    // Billing Address
    string? BillName, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillEmail,
    // Shipping Address
    string? ShipName, string? ShipAddr1, string? ShipAddr2,
    string? ShipCity, string? ShipState, string? ShipZip,
    // Shipping & Tracking
    string? TrackingNumber, string? TrackingNumberIn, string? TrackingNumberFedEx,
    string? ShipWeight, string? DeliveryServiceLevel,
    // Loaner
    bool LoanerRequested, bool? LoanerProvided, string? LoanerRepair,
    // Accessories
    bool IncludesBox, bool IncludesCase, bool IncludesETOCap, bool IncludesCO2Cap,
    bool IncludesCamera, bool IncludesHood, bool IncludesLightPostAdapter,
    bool IncludesSuctionValve, bool IncludesWaterProofCap, bool IncludesAirWaterValve,
    // Workflow flags
    bool Outsourced, bool FirstRepair, string? ReworkRequired,
    // Pricing context
    string? PricingCategory, string? PaymentTerms, string? ContractNumber,
    string? RepairReason, string? Source,
    // Extended 4-tab fields
    string? RackPosition,
    string? ApprovalSentDate, // dtAprSent not found in schema; using dtReqSent as closest match
    decimal? DiscountPct,
    decimal? ShippingClientIn,
    bool? TrackingNumberRequired,
    string? GtdDeliveryDate,
    string? CarrierGtdDate,
    string? DeliveryDate,
    decimal? OutsourceCost,
    string? DisplayItemDescription,
    string? DisplayItemAmount,
    string? BillTo,
    string? PsLevel,
    int? DaysLastIn,
    int? SalesRepKey,
    int? PricingCategoryKey,
    int? PaymentTermsKey,
    int? DistributorKey,
    string? Requisition,
    // Distributor and package type (resolved from lookup tables via lDistributorKey / lPackageTypeKey)
    string? Distributor = null,
    string? PackageType = null,
    // Invoice for this repair (1:1 with tblInvoice). sTranNumber is always populated.
    // NULL when no invoice exists yet.
    int? LatestInvoiceKey = null,
    string? LatestInvoiceStatus = null,
    string? LatestInvoiceNumber = null,
    // Cockpit command-strip metrics (legacy WSRepairOpen parity):
    // RepairLevel = tblRepairLevels name for MAX(item level) across the WO's
    // line items (legacy dbo.repairGetLevel) — NULL until quote items exist.
    string? RepairLevel = null,
    int? LevelDeliveryDays = null,
    // Promised completion: dtDateIn + LevelDeliveryDays business days
    // (dbo.fnDateAddBusinessDays — weekend/holiday aware).
    string? LevelDueDate = null,
    // LeadTimeDays = weekdays dtDateIn → dtDateOut|today. No approval needed.
    // TatDays = weekdays dtAprRecvd → dtDateOut|today; NULL until approved.
    int? LeadTimeDays = null,
    int? TatDays = null,
    // Edit lock (legacy WSRepairOpen / cloud RepairLock). RepairClosed is the
    // raw tblRepair.sRepairClosed = 'Y' state; IsReadOnly is the effective lock
    // — closed OR the repair's invoice is finalized. The cockpit disables the
    // mutating actions off IsReadOnly so the user sees a state instead of a 409.
    bool RepairClosed = false,
    bool IsReadOnly = false
);

public record RepairInspections(
    // D&I flags
    string? ScopeRepairable, string? ScopeUsable,
    // Angulation In
    string? AngInUp, string? AngInDown, string? AngInLeft, string? AngInRight,
    // Angulation Out
    string? AngOutUp, string? AngOutDown, string? AngOutLeft, string? AngOutRight,
    // Fiber
    string? BrokenFibersIn, string? BrokenFibersOut, string? FiberAngle, string? FiberLightTrans,
    // P/F checkpoints
    string? InsImagePF, string? InsLeakPF, string? InsFiberLightTransPF, string? InsAngulationPF,
    string? InsFocalDistancePF, string? InsImageCentrationPF, string? InsFogPF,
    string? InsHotColdLeakPF, string? InsSuctionPF, string? InsForcepChannelPF,
    string? InsAirWaterPF, string? InsAuxWaterPF,
    string? InsVisionPF, string? InsInsertionTubePF, string? InsUniversalCordPF,
    string? InsLightGuideConnectorPF, string? InsDistalTipPF, string? InsEyePiecePF,
    string? InsLightFibersPF, string? InsAlcoholWipePF,
    string? InsFinalPF,
    // Comments
    string? DiInsComments
);

public record ClientSummary(
    string Name, string? PricingCategory, string? ContractType,
    string? PaymentTerms, string? SalesRep, bool IsActive
);

public record PrimaryContact(
    string? FirstName, string? LastName, string? Email, string? Phone, string? Title
);

public record LineItemUpdate(
    string? Approved, int? ItemKey, string? ItemCode, string? Cause, string? Description,
    string? FixType, decimal? Amount, decimal? BaseAmount, string? Comments, int? TechKey
);

public record PatchRepairHeaderRequest(
    string? PurchaseOrder,
    string? RackLocation,
    string? Complaint,
    string? RepairReason,
    bool? IsUrgent,
    string? InboundTracking,
    string? DisplayCustomerComplaint,
    string? DisplayItemizedDesc,
    string? DisplayItemizedAmounts,
    string? BillToCustomer,
    int? SalesRepKey,
    int? PricingCategoryKey,
    int? PaymentTermsKey,
    decimal? DiscountPct,
    string? PsLevel,
    int? DistributorKey,
    decimal? ShippingCostIn,
    string? Requisition,
    string? ShipName,
    string? ShipAddr1,
    string? ShipAddr2,
    string? ShipCity,
    string? ShipState,
    string? ShipZip,
    string? BillName,
    string? BillAddr1,
    string? BillAddr2,
    string? BillCity,
    string? BillState,
    string? BillZip
);

// ── Repair Item Catalog ──
public record RepairCatalogItem(
    int ItemKey,
    string ItemCode,
    string Description,
    decimal DefaultPrice,
    string RigidOrFlexible,
    string PartOrLabor,
    int? MinutesTech1,
    int? MinutesTech2,
    int? MinutesTech3
);

// ── Amendments ──
public record AmendmentItem(
    int AmendKey, int AmendmentNumber, string Date,
    string AmendType, string AmendReason, string Comment);

public record AmendTypeItem(int TypeKey, string TypeName);
public record AmendReasonItem(int ReasonKey, string ReasonName);

public record CreateAmendmentRequest(
    int TranKey,
    int AmendTypeKey,
    int AmendReasonKey,
    string? Comment,
    string? NewFixType,
    decimal? NewAmount);

public record PatchCauseCommentsRequest(string? Cause, string? Comments);

// ── Financials tab ──
public record RepairFinancials(
    decimal SaleAmount,
    decimal Tax,
    decimal InvoiceTotal,
    decimal Outsource,
    decimal Shipping,
    decimal Labor,
    decimal Inventory,
    decimal Gpo,
    decimal Commission,
    decimal TotalExpenses,
    decimal MarginPct,
    decimal ContractMargin
);

public record TechnicianOption(
    int TechKey,
    string TechName
);

public record AddNoteRequest(string? Note);
public record BulkApproveRequest(string? Approved);
public record CreateUpdateSlipRequest(int? TechKey, int? Tech2Key, int? ReasonKey);

// Body for PATCH /api/repairs/{repairKey}/techs — legacy
// frmRepairOpen_UpdateTech / dbo.repairUpdateTech parity. ONE slot is written
// per call: Tech1=true targets tblRepair.lTechnicianKey, Tech1=false targets
// lTechnician2Key; the other slot is left alone. The same technician is then
// pushed onto the repair's tblRepairItemTran rows — all of them when
// AllRepairItems is true, otherwise only the lines that have no tech yet
// (legacy's "Repair Items without Tech").
public record UpdateTechsRequest(
    int TechKey,
    bool Tech1 = true,
    bool AllRepairItems = true
);

// Result of PATCH /api/repairs/{repairKey}/techs. HeaderUpdated is 0 or 1;
// LineItemsUpdated is how many tblRepairItemTran rows took the technician.
public record UpdateTechsResponse(
    int TechKey,
    bool Tech1,
    bool AllRepairItems,
    int HeaderUpdated,
    int LineItemsUpdated
);

// Body for POST /api/repairs/{repairKey}/finalize-invoice. Optional — a plain
// POST with no body finalizes a draft, or is an idempotent no-op against an
// already-finalized invoice. Set Reissue=true (with a Reason) to explicitly
// void-and-re-stage an already-finalized invoice (bumps the suffix). Reason is
// captured for the audit trail of why a finalized invoice was re-issued.
public record FinalizeInvoiceRequest(
    bool Reissue = false,
    string? Reason = null
);

// Result of POST /api/repairs/{repairKey}/finalize-invoice.
// ReIssue=true means an EXPLICIT re-issue of a previously-finalized invoice ran
// (suffix bumped, prior un-drained staging row replaced). AlreadyFinalized=true
// means the call was an idempotent no-op: the invoice was already finalized and
// no re-issue was requested, so nothing was re-staged (DetailRows/ApprovedTotal
// are 0 in that case — the caller should not treat them as the live figures).
// Staged=true means a row was written to tblGP_InvoiceStaging for the on-prem
// drain job. GpPushDeferred is always true — the inline PO→GP push, Crystal
// print, and Avalara tax are deferred (see docs/finalize-gp-print-deferred.md).
public record FinalizeInvoiceResponse(
    int InvoiceKey,
    bool Finalized,
    bool ReIssue,
    int Suffix,
    decimal ApprovedTotal,
    int DetailRows,
    bool Staged,
    bool GpPushDeferred,
    bool AlreadyFinalized
);

public record QuickEditRepairRequest(
    int? StatusId,
    int? TechnicianKey,
    string? Notes
);

public record CreateRepairRequest(
    int? ScopeKey,
    string? SerialNumber,
    int? ScopeTypeKey,
    int DeptKey,
    DateTime DateIn,
    int? StatusId,
    string? PurchaseOrder,
    string? Complaint,
    int? ReasonKey,
    int? CarrierKey,
    string? InboundTracking,
    string? PickupRequired,
    int? SalesRepKey,
    int? PricingCategoryKey,
    int? PaymentTermsKey,
    string? BillTo,
    int? DistributorKey,
    string? BillEmail,
    int? BillType,
    string? DisplayCustomerComplaint,
    string? DisplayItemDesc,
    string? DisplayItemAmt,
    string? RackPosition
);
