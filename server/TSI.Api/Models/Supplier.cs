namespace TSI.Api.Models;

public record SupplierListItem(
    int SupplierKey,
    string Name,
    string City,
    string State,
    string Phone,
    string GpId,
    bool IsActive,
    bool IsAcquisitionSupplier,
    List<string> Roles
);

public record SupplierDetail(
    int SupplierKey,
    string Name,
    string? Name2,
    string? ShipAddr1,
    string? ShipAddr2,
    string? ShipCity,
    string? ShipState,
    string? ShipZip,
    string? ShipCountry,
    string? BillAddr1,
    string? BillAddr2,
    string? BillCity,
    string? BillState,
    string? BillZip,
    string? BillCountry,
    string? MailAddr1,
    string? MailAddr2,
    string? MailCity,
    string? MailState,
    string? MailZip,
    string? MailCountry,
    string? ContactFirst,
    string? ContactLast,
    string? Phone,
    string? Fax,
    string? Email,
    string? GpId,
    string? PeachTreeId,
    double? OrderMinimum,
    bool IsActive,
    bool IsAcquisitionSupplier,
    bool ShowOnDashboard,
    bool BlindPoForGp,
    bool CreatePartNumbers,
    string? PartNumberPrefix,
    bool ShowVendorSkuOnPo,
    bool IncludePartNumberInPoDescription,
    string? AdditionalPoDescription,
    decimal? AdditionalPoDescriptionCostPerUnit,
    bool UseVendorSku,
    bool AllowDuplicatePartNumbers,
    int? SupplierPoTypeKey,
    string? SupplierPoType,
    int? SupplierKeyLink,
    string? BillEmail,
    string? BillEmailName,
    string? BillEmail2,
    int? BillType,
    string? Comments,
    string? LastUpdate,
    List<string> Roles,
    List<SupplierPo> RecentPos
);

public record SupplierPo(
    int SupplierPoKey,
    string PoNumber,
    string? Date,
    double Amount,
    string Status,
    string? PoType
);

public record SupplierStats(
    int Total,
    int Active,
    int Inactive,
    int Parts,
    int Repair,
    int Acquisition,
    int Carts
);

public record SupplierListResponse(
    IEnumerable<SupplierListItem> Items,
    int TotalCount
);

public record SupplierInventoryItem(
    int SupplierSizesKey,
    string ItemDescription,
    string SizeDescription,
    string SupplierPartNo,
    double UnitCost,
    bool IsActive
);

public record SupplierDocument(
    int DocumentKey,
    string DocumentName,
    string FileName,
    string DocumentType,
    string? DocumentDate
);
