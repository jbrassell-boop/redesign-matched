namespace TSI.Api.Models;

public record ClientListItem(
    int ClientKey,
    string Name,
    string City,
    string State,
    bool IsActive
);

public record ClientDetail(
    int ClientKey,
    string Name,
    string Address1,
    string? Address2,
    string City,
    string State,
    string Zip,
    string? Phone,
    string? Fax,
    string? Email,
    string? ContactName,
    bool IsActive,
    int DeptCount,
    int OpenRepairs
);

public record ClientListResponse(
    IEnumerable<ClientListItem> Clients,
    int TotalCount
);

public record ClientContact(
    int ContactKey,
    string FirstName,
    string LastName,
    string? Phone,
    string? Fax,
    string? Email,
    bool IsActive
);

public record ClientDepartment(
    int DepartmentKey,
    string Name,
    string ServiceLocation,
    bool IsActive
);

public record ClientFlag(
    int FlagKey,
    string FlagType,
    string Flag,
    bool VisibleOnDI,
    bool VisibleOnBlank
);

public record ClientFull(
    int ClientKey, string Name, bool IsActive,
    string? Address1, string? Address2, string? City, string? State, string? Zip,
    string? Phone, string? Fax,
    string? BillingEmail, string? PricingCategory, int? PricingCategoryKey,
    string? PaymentTerms, int? PaymentTermsKey,
    string? SalesRep, int? SalesRepKey,
    string? ContractNumber, string? Distributor, int? DistributorKey,
    bool IsGPO, bool IsNewCustomer, DateTime? CustomerSince,
    string? Comments, int DeptCount, int OpenRepairs,
    // Additional Details
    string? SecondaryName, string? Reference1, string? Reference2,
    // Invoice & Options
    bool BlindPS3, bool ReqTotalsOnly, bool BlindTotalsOnFinal,
    bool SkipMetrics, bool PoRequired, bool NeverHold,
    bool SkipTracking, bool EmailNewRepairs, bool NationalAccount,
    // Billing
    double? DiscountPct, int? CreditLimitKey,
    // Bill To address
    string? BillName1, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillCountry,
    string? BillContact, string? BillEmail,
    // Ship To address
    string? ShipName1, string? ShipAddr1, string? ShipAddr2,
    string? ShipCity, string? ShipState, string? ShipZip, string? ShipCountry,
    string? ShipEmail
);

public record ClientKpis(
    int TotalRepairs, int OpenRepairs, decimal AvgTat, decimal TotalRevenue
);

public record ClientUpdate(
    string? Name, string? Address1, string? Address2,
    string? City, string? State, string? Zip,
    string? Phone, string? Fax, string? BillingEmail,
    int? PricingCategoryKey, int? PaymentTermsKey, int? SalesRepKey,
    string? ContractNumber, int? DistributorKey, bool? IsGPO,
    string? Comments,
    // Additional Details
    string? SecondaryName, string? Reference1, string? Reference2,
    // Invoice & Options
    bool? BlindPS3, bool? ReqTotalsOnly, bool? BlindTotalsOnFinal,
    bool? SkipMetrics, bool? PoRequired, bool? NeverHold,
    bool? SkipTracking, bool? EmailNewRepairs, bool? NationalAccount,
    // Billing
    double? DiscountPct, int? CreditLimitKey,
    // Bill To
    string? BillName1, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillCountry,
    string? BillContact, string? BillEmail,
    // Ship To
    string? ShipName1, string? ShipAddr1, string? ShipAddr2,
    string? ShipCity, string? ShipState, string? ShipZip, string? ShipCountry,
    string? ShipEmail
);

public record ContactCreate(
    string FirstName, string LastName, string? Phone, string? Fax, string? Email
);

public record FlagCreate(
    int FlagTypeKey, string Flag, bool VisibleOnDI, bool VisibleOnBlank
);

public record ClientRepairItem(
    int RepairKey, string WorkOrderNumber, DateTime? DateIn,
    string Status, string? Department, string? ScopeType,
    string? Serial, int? Tat, decimal? Amount
);

public record CreateClientRequest(
    string Name,
    string? Address1,
    string? UnitBuilding,
    string? City,
    string? State,
    string? Zip,
    string? Phone,
    string? Fax,
    DateTime? ClientSince,
    int? PricingCategoryKey,
    int? SalesRepKey,
    int? PaymentTermsKey,
    string? BillTo,
    int? DistributorKey,
    double? DiscountPct,
    string? BillAddr1,
    string? BillCity,
    string? BillState,
    string? BillZip,
    string? BillEmail,
    bool BlindPS3,
    bool ReqTotalsOnly,
    bool BlindTotalsOnFinal,
    bool PORequired,
    bool NeverHold,
    bool SkipTracking,
    bool EmailNewRepairs,
    bool NationalAccount,
    string? SecondaryName,
    string? Ref1,
    string? Ref2,
    string? GpId
);
