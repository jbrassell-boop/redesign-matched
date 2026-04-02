namespace TSI.Api.Models;

public record QualityInspectionListItem(
    int InspectionKey,
    int RepairKey,
    string WorkOrderNumber,
    string InspectionType,
    string Result,
    int? TechnicianKey,
    string InspectionDate,
    string ClientName,
    string? ScopeSN
);

public record QualityInspectionDetail(
    int InspectionKey,
    int RepairKey,
    string WorkOrderNumber,
    string InspectionType,
    string Result,
    int? TechnicianKey,
    string? TechName,
    string InspectionDate,
    string ClientName,
    string? ScopeSN,
    bool? HotColdLeakTestPass,
    bool? AutoclaveTestPass
);

public record QualityInspectionListResponse(
    IEnumerable<QualityInspectionListItem> Inspections,
    int TotalCount
);

public record QualityStats(
    int TotalInspections,
    int PassCount,
    int FailCount,
    int ConditionalCount,
    double FirstPassYield
);
