namespace TSI.Api.Models;

public record LoanerListItemDto(
    int LoanerTranKey,
    int? ScopeKey,
    string ScopeType,
    string Serial,
    string Status,
    string Client,
    string Dept,
    string Rep,
    int DaysOut,
    string Agreement,
    string TrackingNumber,
    string PurchaseOrder,
    string Category,
    bool RecallNeeded
);

public record LoanerStatsDto(
    int Available,
    int Out,
    int Overdue,
    int Repair,
    int Requests
);

public record LoanerDetailDto(
    int LoanerTranKey,
    int? ScopeKey,
    string ScopeType,
    string Serial,
    string Status,
    string Client,
    string Dept,
    string Rep,
    string DeliveryMethod,
    string PurchaseOrder,
    string TrackingNumber,
    string RackPosition,
    string DateOut,
    string DateIn,
    string CreatedBy,
    string CreatedDate,
    string Category,
    bool OnSiteLoaner
);

public record LoanerHistoryItemDto(
    int LoanerTranKey,
    string DateOut,
    string DateIn,
    string Client,
    string Dept,
    int DaysOut,
    string Agreement
);

public record LoanerListResponseDto(
    List<LoanerListItemDto> Items,
    int TotalCount
);

public record CategoryAvailabilityDto(
    string Category,
    int Available,
    int Out,
    int Needed
);

public record CheckOutRequest(
    int ScopeKey,
    int DepartmentKey,
    int DeliveryMethodKey,
    int SalesRepKey,
    string? PurchaseOrder,
    bool OnSiteLoaner
);

public record CheckInRequest(
    int LoanerTranKey,
    string? RackPosition,
    string? TrackingNumber
);

public record BookOutRequest(
    int ScopeKey,
    int DepartmentKey,
    int DeliveryMethodKey,
    int SalesRepKey,
    int? TaskKey,
    string? PurchaseOrder,
    string? TrackingNumber,
    bool OnSiteLoaner,
    string? OutgoingInspection
);

public record EvalFailRequest(
    int ScopeKey,
    int? TaskKey,
    string? FailedItems
);
