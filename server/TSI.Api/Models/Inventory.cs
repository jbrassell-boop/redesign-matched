namespace TSI.Api.Models;

public record InventoryListItem(
    int InventoryKey,
    string Description,
    string Category,
    int CurrentLevel,
    int MinLevel,
    int MaxLevel,
    bool IsActive,
    int SizeCount,
    bool IsLowStock
);

public record InventorySizeItem(
    int SizeKey,
    string SizeDescription,
    int CurrentLevel,
    int MinLevel,
    int MaxLevel,
    double UnitCost,
    string? BinNumber,
    bool IsActive
);

public record InventoryDetail(
    int InventoryKey,
    string Description,
    string Category,
    int CurrentLevel,
    int MinLevel,
    int MaxLevel,
    bool IsActive,
    bool IsLowStock,
    bool NoCountAdjustment,
    bool NotUsedByRepair,
    bool AlwaysReOrder,
    DateTime? LastUpdate,
    DateTime? CreateDate,
    IEnumerable<InventorySizeItem> Sizes
);

public record InventoryListResponse(
    IEnumerable<InventoryListItem> Items,
    int TotalCount
);

public record InventoryStats(
    int TotalCount,
    int ActiveCount,
    int InactiveCount,
    int LowStockCount
);
