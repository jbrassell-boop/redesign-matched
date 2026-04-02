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
