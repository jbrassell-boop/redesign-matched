namespace TSI.Api.Models;

public record LoanerListItem(
    int LoanerTranKey,
    int? ScopeKey,
    int? RepairKey,
    int? DepartmentKey,
    string ScopeType,
    string Serial,
    string Client,
    string Dept,
    string DateOut,
    string DateIn,
    string TrackingNumber,
    string PurchaseOrder,
    string Status,
    int DaysOut,
    string WorkOrder
);

public record LoanerDetail(
    int LoanerTranKey,
    int? ScopeKey,
    int? RepairKey,
    int? DepartmentKey,
    int? SalesRepKey,
    int? DeliveryMethodKey,
    int? ContractKey,
    string ScopeType,
    string Serial,
    string Client,
    string Dept,
    string DateOut,
    string DateIn,
    string TrackingNumber,
    string PurchaseOrder,
    string Status,
    int DaysOut,
    string WorkOrder,
    string SalesRep,
    string DeliveryMethod,
    string RackPosition,
    string RepairClosed,
    string CreatedDate
);

public record LoanerStats(
    int Total,
    int Out,
    int Overdue,
    int Returned,
    int Declined,
    int FillRate
);

public record LoanerListResponse(
    List<LoanerListItem> Items,
    int TotalCount
);

public record TaskLoanerItem(
    int TaskScopeTypeKey,
    int TaskKey,
    int ScopeTypeKey,
    int Quantity,
    string TaskNumber,
    string ScopeType,
    string Status,
    string DeptName,
    string ClientName
);
