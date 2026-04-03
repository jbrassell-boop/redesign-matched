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
    string Tech,
    string Comments
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
    string ScopeType, string Serial, string? ScopeModel, string? Manufacturer,
    // Dates
    string DateIn, string? DateApproved, string? EstDelivery, string? ShipDate, string? DateOut,
    int DaysIn,
    // People
    string? Tech, int? TechKey, string? Tech2, string? Inspector,
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
    string? RequestSentDate,
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
    int? DaysLastIn
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
    string? InsFinalPF
);

public record ClientSummary(
    string Name, string? PricingCategory, string? ContractType,
    string? PaymentTerms, string? SalesRep, bool IsActive
);

public record PrimaryContact(
    string? FirstName, string? LastName, string? Email, string? Phone, string? Title
);

public record LineItemUpdate(
    string? Approved, string? ItemCode, string? Description,
    string? FixType, decimal? Amount, string? Comments
);

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
