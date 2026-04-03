namespace TSI.Api.Models;

public record RepairItemListItem(
    int RepairItemKey,
    string ItemDescription,
    string? ProblemId,
    string? TsiCode,
    string? ProductId,
    string? RigidOrFlexible,
    string? PartOrLabor,
    bool IsActive,
    int? TurnaroundTime
);

public record RepairItemDetail(
    int RepairItemKey,
    string ItemDescription,
    string? ProblemId,
    string? TsiCode,
    string? ProductId,
    string? RigidOrFlexible,
    string? PartOrLabor,
    bool IsActive,
    int? TurnaroundTime,
    double? AvgCostMaterial,
    double? AvgCostLabor,
    int? MinutesTech1,
    int? MinutesTech2,
    int? MinutesTech3,
    int? MinutesTech1SmallDiameter,
    int? MinutesTech2SmallDiameter,
    int? MinutesTech3SmallDiameter,
    bool OkayToSkip,
    bool IsAdjustment,
    bool SkipPickList,
    bool ProfitItemPlus,
    bool ProfitItemMinus,
    bool IsLocked,
    DateTime? LastUpdated
);

public record RepairItemStats(
    int Total,
    int Active,
    int Inactive,
    int Flexible,
    int Rigid
);

public record RepairItemListResponse(
    List<RepairItemListItem> Items,
    int TotalCount
);

public record RepairItemCreate(
    string ItemDescription,
    string? ProblemId,
    string? TsiCode,
    string? ProductId,
    string RigidOrFlexible,
    string PartOrLabor,
    int? TurnaroundTime
);

public record RepairItemUpdate(
    string? ItemDescription,
    string? ProblemId,
    string? TsiCode,
    string? ProductId,
    string? RigidOrFlexible,
    string? PartOrLabor,
    bool? IsActive,
    int? TurnaroundTime,
    double? AvgCostMaterial,
    double? AvgCostLabor,
    int? MinutesTech1,
    int? MinutesTech2,
    int? MinutesTech3,
    int? MinutesTech1SmallDiameter,
    int? MinutesTech2SmallDiameter,
    int? MinutesTech3SmallDiameter,
    bool? OkayToSkip,
    bool? IsAdjustment,
    bool? SkipPickList,
    bool? ProfitItemPlus,
    bool? ProfitItemMinus,
    bool? IsLocked
);
