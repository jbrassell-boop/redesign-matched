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

// ── NCR (tblISOComplaint) ────────────────────────────────────────────────────

public record NcrListItem(
    int IsoComplaintKey,
    string NcrNumber,
    int? RepairKey,
    string WorkOrderNumber,
    string Description,
    string Category,
    string Severity,
    string Status,
    string DateFiled,
    string ClientName,
    string DepartmentName
);

public record NcrListResponse(
    IEnumerable<NcrListItem> Items,
    int TotalCount
);

// ── Rework (tblRepair where sReworkReqd='Y') ────────────────────────────────

public record ReworkListItem(
    int RepairKey,
    string ReworkNumber,
    string WorkOrderNumber,
    string SerialNumber,
    string Reason,
    string TechName,
    string OriginalComplete,
    string ReworkDue,
    string Status
);

public record ReworkListResponse(
    IEnumerable<ReworkListItem> Items,
    int TotalCount
);
