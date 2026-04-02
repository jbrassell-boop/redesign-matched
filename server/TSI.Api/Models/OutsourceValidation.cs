namespace TSI.Api.Models;

public record OutsourceListItem(
    int RepairKey,
    string Wo,
    string Serial,
    string ScopeType,
    string ClientName,
    string VendorName,
    string? SentDate,
    int DaysOut,
    double VendorCost,
    double TsiCharge,
    double MarginDollar,
    double MarginPct,
    string Status
);

public record OutsourceStats(
    int Total,
    double OutsourceSpend,
    double AvgMarginPct,
    int NegativeMargin,
    string TopVendor,
    double TopVendorSpend,
    int AvgDaysOut
);

public record OutsourceListResponse(
    IEnumerable<OutsourceListItem> Items,
    int TotalCount
);

public record SendToVendorRequest(
    int VendorKey,
    double OutsourceCost,
    string? TrackingNumber,
    string? Notes
);

public record ReceiveBackRequest(
    string? TrackingNumberReturn,
    string? Notes
);

public record ValidationChecklistRequest(
    string Status,
    string? Notes
);
