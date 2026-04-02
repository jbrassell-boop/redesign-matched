namespace TSI.Api.Models;

public record DepartmentListItem(
    int DeptKey,
    string Name,
    string ClientName,
    int ClientKey,
    bool IsActive,
    int OpenRepairs,
    int ScopeCount
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
