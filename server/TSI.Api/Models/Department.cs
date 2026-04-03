namespace TSI.Api.Models;

public record DepartmentListItem(
    int DeptKey,
    string Name,
    string ClientName,
    int ClientKey,
    bool IsActive
);

public record DepartmentDetail(
    int DeptKey,
    string Name,
    string ClientName,
    int ClientKey,
    bool IsActive,
    int OpenRepairs,
    int ScopeCount,
    string? Address1,
    string? City,
    string? State,
    string? Zip,
    string? Phone,
    string? ContactName,
    string? Email
);

public record DepartmentListResponse(
    IEnumerable<DepartmentListItem> Departments,
    int TotalCount
);

public record DepartmentSubGroup(
    int SubGroupKey,
    string Name
);

public record DepartmentScope(
    int ScopeKey,
    string SerialNumber,
    string Model,
    string Manufacturer,
    string Type,
    string Category
);

public record DepartmentFull(
    int DeptKey, string Name, string ClientName, int ClientKey, bool IsActive,
    string? Address1, string? City, string? State, string? Zip, string? Phone,
    string? ContactFirst, string? ContactLast, string? ContactPhone, string? ContactEmail,
    string? ServiceLocation,
    int ScopeCount, int OpenRepairs,
    // Options
    bool ShowConsumptionOnReq, bool EnforceScopeTypeFiltering,
    bool ShowProductId, bool ShowUaOrNwt, bool ShowItemizedDescriptions,
    bool EmailNewRepairs, bool MemberBoa, bool TrackingRequired,
    bool TaxExempt, bool PaysByCreditCard, bool OnsiteService,
    // Billing
    int? SalesRepKey, string? SalesRep, int? PricingCategoryKey, string? PricingCategory,
    double? DiscountPct, double? DefaultShipping,
    // Bill To
    string? BillName1, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillEmail,
    // Mailing
    string? MailAddr1, string? MailAddr2, string? MailCity, string? MailState,
    string? MailZip, string? MailCountry,
    // Ship To extras
    string? ShipName1, string? ShipAddr2, string? ShipCountry
);

public record DeptKpis(
    int TotalRepairs, int OpenRepairs, decimal AvgTat, decimal TotalRevenue
);

public record DeptContact(
    int ContactKey, string? FirstName, string? LastName,
    string? Phone, string? Email, bool IsPrimary, bool IsActive
);

public record ScopeDetail(
    int ScopeKey, string? SerialNumber, string? Model, string? Manufacturer,
    string? Type, string? Category, bool IsActive,
    string? LastRepairDate, int RepairCount
);

public record DepartmentUpdate(
    string? Name, string? Address1, string? City, string? State, string? Zip,
    string? Phone, string? ContactFirst, string? ContactLast,
    string? ContactPhone, string? ContactEmail,
    // Options
    bool? ShowConsumptionOnReq, bool? EnforceScopeTypeFiltering,
    bool? ShowProductId, bool? ShowUaOrNwt, bool? ShowItemizedDescriptions,
    bool? EmailNewRepairs, bool? MemberBoa, bool? TrackingRequired,
    bool? TaxExempt, bool? PaysByCreditCard, bool? OnsiteService,
    // Billing
    double? DiscountPct, double? DefaultShipping,
    // Bill To
    string? BillName1, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillEmail,
    // Mailing
    string? MailAddr1, string? MailAddr2, string? MailCity, string? MailState,
    string? MailZip, string? MailCountry,
    // Ship To extras
    string? ShipName1, string? ShipAddr2, string? ShipCountry
);

public record DeptFlag(
    int FlagKey, string FlagType, string Flag, bool VisibleOnDI, bool VisibleOnBlank
);

public record DeptContract(
    int ContractKey, string ContractName, string ContractNumber,
    string? ContractType, DateTime? DateEffective, DateTime? DateTermination,
    string Status, double? AnnualValue
);

public record DepartmentRepairItem(
    int RepairKey, string? WorkOrderNumber, DateTime? DateIn,
    string? Status, string? ScopeType, string? SerialNumber,
    int Tat, decimal? Amount
);
