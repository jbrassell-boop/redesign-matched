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
