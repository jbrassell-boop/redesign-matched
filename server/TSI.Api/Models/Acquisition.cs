namespace TSI.Api.Models;

public record AcquisitionListItem(
    int ScopeKey,
    string Serial,
    string ScopeType,
    string Supplier,
    string PONumber,
    string Dept,
    string Client,
    string DateAcquired,
    string PODate,
    string Condition,
    decimal Cost
);

public record AcquisitionSoldItem(
    int ScopeKey,
    string Serial,
    string ScopeType,
    string Client,
    string SaleDate,
    decimal SalePrice,
    string Buyer
);

public record AcquisitionStats(
    int InHouse,
    int Consigned,
    int Sold,
    decimal InHouseValue,
    decimal SoldRevenue
);

public record AcquisitionListResponse(
    List<AcquisitionListItem> Items,
    int TotalCount
);

public record AcquisitionSoldResponse(
    List<AcquisitionSoldItem> Items,
    int TotalCount
);

public record AcquisitionDetail(
    int ScopeKey,
    string Serial,
    string ScopeType,
    string Manufacturer,
    string Client,
    string Dept,
    string Supplier,
    string PONumber,
    string? PODate,
    string? DateReceived,
    decimal Cost,
    string Comment,
    string FlexOrRigid,
    bool IsSold
);
