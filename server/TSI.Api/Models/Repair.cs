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
    string? InvoiceNumber
);

public record RepairListResponse(
    IEnumerable<RepairListItem> Repairs,
    int TotalCount
);
