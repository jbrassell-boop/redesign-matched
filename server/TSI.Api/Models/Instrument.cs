namespace TSI.Api.Models;

public record InstrumentRepairListItem(
    int RepairKey,
    string OrderNumber,
    string ClientName,
    string DepartmentName,
    string? DateReceived,
    string? DateDue,
    string Status,
    int ItemCount,
    double TotalValue
);

public record InstrumentRepairDetail(
    int RepairKey,
    string OrderNumber,
    string ClientName,
    string DepartmentName,
    string? PurchaseOrder,
    string? DateReceived,
    string? DateDue,
    string? DateCompleted,
    string Status,
    int DaysOpen,
    string? TechnicianName,
    string? Notes,
    IEnumerable<InstrumentRepairItem> Items
);

public record InstrumentRepairItem(
    int TranKey,
    int RepairItemKey,
    string ItemDescription,
    string? Approved,
    double RepairPrice,
    string? Comments,
    string? FixType,
    string? ProblemId,
    string? Initials
);

public record InstrumentCatalogItem(
    int RepairItemKey,
    string ItemDescription,
    string? RigidOrFlexible,
    string? PartOrLabor,
    string? ProblemId,
    string? ProductId,
    bool IsActive,
    double AvgCostMaterial,
    double AvgCostLabor,
    string? TSICode,
    int UsageCount
);

public record InstrumentCatalogDetail(
    int RepairItemKey,
    string ItemDescription,
    string? RigidOrFlexible,
    string? PartOrLabor,
    string? ProblemId,
    string? ProductId,
    string? ProductIdHPG,
    string? ProductIdPremier,
    bool IsActive,
    double AvgCostMaterial,
    double AvgCostLabor,
    int TurnAroundTime,
    double HoursTech1,
    double HoursTech2,
    double HoursTech3,
    bool IsMajorRepair,
    string? TSICode,
    string? DiameterType,
    decimal? UnitCost
);

public record InstrumentRepairStats(
    int AllOrders,
    int Received,
    int InProgress,
    int Outsourced,
    int OnHold,
    int Complete,
    int Invoiced,
    double TotalValue
);

public record InstrumentRepairListResponse(
    IEnumerable<InstrumentRepairListItem> Items,
    int TotalCount
);

public record InstrumentCatalogResponse(
    IEnumerable<InstrumentCatalogItem> Items,
    int TotalCount
);
