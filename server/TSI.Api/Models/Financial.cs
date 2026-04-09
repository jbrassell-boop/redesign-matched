namespace TSI.Api.Models;

public record InvoiceListItem(
    int InvoiceKey,
    string InvoiceNumber,
    string ClientName,
    double Amount,
    double TaxAmount,
    double Discount,
    string PaymentTerms,
    string GLAccount,
    string? IssuedDate,
    string? DueDate,
    int AgingDays,
    string Status,
    string DeliveryMethod,
    string GreatPlainsId
);

public record InvoiceDetail(
    int InvoiceKey,
    int? RepairKey,
    int? ClientKey,
    int? DepartmentKey,
    string InvoiceNumber,
    string ClientName,
    string BillName,
    string BillAddress,
    string BillCity,
    string BillState,
    string BillZip,
    string ShipName,
    string ShipAddress,
    string ShipCity,
    string ShipState,
    string ShipZip,
    double Amount,
    double ShippingAmount,
    double TaxAmount,
    string PaymentTerms,
    string DeliveryMethod,
    string PurchaseOrder,
    string ScopeType,
    string SerialNumber,
    string SalesRep,
    string? IssuedDate,
    string? DueDate,
    int AgingDays,
    string Status,
    IEnumerable<InvoiceLineItem> LineItems
);

public record InvoiceLineItem(
    int DetailKey,
    string Description,
    double Amount,
    double Value,
    string? Comments
);

public record InvoicePaymentItem(
    int PaymentId,
    int InvoiceKey,
    string InvoiceNumber,
    string ClientName,
    decimal PaymentAmount,
    string? PaymentDate
);

public record ClientOnHold(
    int ClientKey,
    string ClientName,
    string DepartmentName,
    string? OnHoldDate,
    string Reason
);

public record FinancialStats(
    double OutstandingAR,
    int OverdueCount,
    int AvgDaysToPay,
    int DraftsCount,
    int OnHoldCount,
    double PaidMTD,
    int DSO,
    double RevenueMTD
);

public record InvoiceListResponse(
    IEnumerable<InvoiceListItem> Items,
    int TotalCount
);

public record PaymentListResponse(
    IEnumerable<InvoicePaymentItem> Items,
    int TotalCount
);

public record HoldListResponse(
    IEnumerable<ClientOnHold> Items,
    int TotalCount
);

public record GLAccountItem(
    string AccountNumber,
    string BatchNumber,
    string Description,
    string? TransactionDate,
    double DebitAmount,
    double CreditAmount,
    double Balance
);

public record AtRiskItem(
    int DepartmentKey,
    string DepartmentName,
    string ClientName,
    int RepairCount,
    decimal Revenue,
    decimal LaborCost,
    decimal MaterialCost,
    decimal OutsourceCost,
    decimal ShippingCost,
    decimal CommissionCost,
    decimal TotalExpenses,
    decimal Margin,
    decimal MarginPct
);

public record TrendingItem(
    string Month,
    int RepairCount,
    decimal Revenue,
    decimal LaborCost,
    decimal MaterialCost,
    decimal OutsourceCost,
    decimal TotalExpenses,
    decimal Margin,
    decimal MarginPct
);
