namespace TSI.Api.Models;

public record OnsiteServiceListItem(
    int OnsiteServiceKey,
    string InvoiceNum,
    string ClientName,
    string DeptName,
    string TechName,
    string? VisitDate,
    string Status,
    int TrayCount,
    int InstrumentCount,
    double TotalBilled,
    string? SubmittedDate
);

public record OnsiteServiceStats(
    int Total,
    int Submitted,
    int Invoiced,
    int Draft,
    int Void,
    double TotalValue
);

public record OnsiteServiceListResponse(
    IEnumerable<OnsiteServiceListItem> Items,
    int TotalCount
);
