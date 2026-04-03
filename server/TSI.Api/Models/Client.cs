namespace TSI.Api.Models;

public record ClientListItem(
    int ClientKey,
    string Name,
    string City,
    string State,
    bool IsActive,
    int DeptCount,
    int OpenRepairs
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
    string? Comments, int DeptCount, int OpenRepairs
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
    string? Comments
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
