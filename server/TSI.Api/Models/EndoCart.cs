namespace TSI.Api.Models;

public record EndoCartScopeItem(
    int ScopeKey,
    string SerialNumber,
    string ScopeType,
    string Manufacturer,
    string ClientName,
    string DepartmentName,
    string RigidOrFlexible,
    bool IsDead,
    string? LastUpdate
);

public record EndoCartServiceHistoryItem(
    int RepairKey,
    string WorkOrderNumber,
    string SerialNumber,
    string ScopeType,
    string ClientName,
    string RepairStatus,
    string? DateIn,
    string? DateOut,
    string? Complaint,
    double TotalCost
);

public record EndoCartScopeInventoryResponse(
    List<EndoCartScopeItem> Items,
    int TotalCount
);

public record EndoCartServiceHistoryResponse(
    List<EndoCartServiceHistoryItem> Items,
    int TotalCount
);

public record EndoCartStats(
    int TotalScopes,
    int ActiveScopes,
    int InactiveScopes,
    int TotalRepairs,
    int RecentRepairs
);
