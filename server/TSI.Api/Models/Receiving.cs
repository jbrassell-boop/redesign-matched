namespace TSI.Api.Models;

public record PendingArrival(
    int RepairKey,
    string WorkOrderNumber,
    string ClientName,
    string DepartmentName,
    string ScopeTypeDesc,
    string SerialNumber,
    string ComplaintDesc,
    string RepairStatus,
    DateTime? DateIn,
    int DaysIn
);

public record ReceiveIntakeRequest(
    int DepartmentKey,
    int? ScopeTypeKey,
    string SerialNumber,
    string ComplaintDesc,
    string? PoNumber,
    string? TrackingIn,
    string? Notes
);

public record ReceiveIntakeResponse(
    int RepairKey,
    string WorkOrderNumber
);
