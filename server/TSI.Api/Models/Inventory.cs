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
    bool LargeDiameter,
    bool SkipPickList,
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

public record InventoryPurchaseOrder(
    int SupplierPOKey,
    string PONumber,
    string SupplierName,
    string PODate,
    double POTotal,
    bool Cancelled,
    int LineCount,
    int OrderedQty,
    int ReceivedQty
);

public record InventorySupplierItem(
    int SupplierSizesKey,
    int SupplierKey,
    string SupplierName,
    string SizeDescription,
    string PartNumber,
    double UnitCost,
    int OrderMinimum,
    bool IsActive
);

public record InventoryReceivingItem(
    int InventorySizeKey,
    int InventoryKey,
    string Description,
    string SizeDescription,
    int CurrentLevel,
    int MinLevel,
    int MaxLevel,
    string? BinNumber
);

public record ReceiveInventoryRequest(
    int InventorySizeKey,
    int Quantity,
    string? LotNumber,
    string? BinNumber,
    string? Notes
);
