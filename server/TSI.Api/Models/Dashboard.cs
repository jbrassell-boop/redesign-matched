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
