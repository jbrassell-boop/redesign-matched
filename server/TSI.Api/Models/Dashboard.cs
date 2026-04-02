namespace TSI.Api.Models;

public record DashboardRepair(
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
    string? DateApproved,
    string? EstDelivery,
    decimal? AmountApproved,
    string? Tech,
    bool IsUrgent
);

public record DashboardStats(
    int OpenRepairs,
    int UrgentRepairs,
    int PendingQC,
    int PendingShip,
    int CompletedToday,
    int ReceivedToday
);

public record DashboardRepairsResponse(
    IEnumerable<DashboardRepair> Repairs,
    int TotalCount
);

// ── Tasks sub-tab ──
public record DashboardTask(
    int TaskKey,
    string Title,
    string Client,
    string Dept,
    string TaskType,
    string Priority,
    string Status,
    string Date,
    bool FromPortal
);

public record DashboardTaskStats(
    int Open,
    int Fulfilled,
    int FromPortal,
    int TopTypeCount,
    string TopTypeLabel
);

public record DashboardTasksResponse(
    IEnumerable<DashboardTask> Tasks,
    int TotalCount,
    DashboardTaskStats Stats
);

// ── Emails sub-tab ──
public record DashboardEmail(
    int EmailKey,
    string Date,
    string EmailType,
    string From,
    string To,
    string Subject,
    string Status
);

public record DashboardEmailStats(
    int Total,
    int Pending,
    int Sent,
    int EmailTypes
);

public record DashboardEmailsResponse(
    IEnumerable<DashboardEmail> Emails,
    int TotalCount,
    DashboardEmailStats Stats
);

// ── Shipping sub-tab ──
public record DashboardShipment(
    int RepairKey,
    string Wo,
    string Client,
    string Dept,
    string ScopeType,
    string Serial,
    string Status,
    string DateIn,
    string? ShipDate,
    string? TrackingNumber,
    decimal ShipCharge
);

public record DashboardShippingStats(
    int ReadyToShip,
    int ShippedToday,
    decimal TotalCharges
);

public record DashboardShippingResponse(
    IEnumerable<DashboardShipment> Shipments,
    int TotalCount,
    DashboardShippingStats Stats
);

// ── Invoices sub-tab ──
public record DashboardInvoice(
    int InvoiceKey,
    string InvoiceNumber,
    string Wo,
    string Client,
    string Dept,
    decimal Amount,
    string Status,
    string Date,
    string? PaidDate
);

public record DashboardInvoiceStats(
    int ReadyToInvoice,
    int InvoicedMonth,
    decimal TotalAmount,
    decimal AvgInvoice
);

public record DashboardInvoicesResponse(
    IEnumerable<DashboardInvoice> Invoices,
    int TotalCount,
    DashboardInvoiceStats Stats
);

// ── Flags sub-tab ──
public record DashboardFlag(
    int FlagKey,
    string FlagText,
    string FlagType,
    string OwnerName,
    int OwnerKey
);

public record DashboardFlagStats(
    int Total,
    int Client,
    int ScopeType,
    int Scope,
    int Repair
);

public record DashboardFlagsResponse(
    IEnumerable<DashboardFlag> Flags,
    int TotalCount,
    DashboardFlagStats Stats
);

// ── Tech Bench sub-tab ──
public record DashboardTechBenchItem(
    int RepairKey,
    string Wo,
    string Serial,
    string ScopeType,
    string Client,
    int DaysIn,
    string Status,
    string? Tech
);

public record DashboardTechBenchStats(
    int Assigned,
    int InRepair,
    int OnHold,
    int CompletedToday
);

public record DashboardTechBenchResponse(
    IEnumerable<DashboardTechBenchItem> Items,
    int TotalCount,
    DashboardTechBenchStats Stats
);

// ── Analytics sub-tab ──
public record DashboardAnalyticsMetric(
    int Rank,
    string ScopeType,
    int RepairCount,
    decimal AvgTat,
    int InProgress,
    int Completed
);

public record DashboardAnalyticsStats(
    int InHouse,
    decimal AvgTat,
    decimal OnTimeShipPct,
    int Throughput
);

public record DashboardAnalyticsResponse(
    IEnumerable<DashboardAnalyticsMetric> Metrics,
    DashboardAnalyticsStats Stats
);
