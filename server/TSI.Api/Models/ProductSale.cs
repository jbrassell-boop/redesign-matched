namespace TSI.Api.Models;

public record ProductSaleListItem(
    int ProductSaleKey,
    string InvoiceNumber,
    string ClientName,
    string DepartmentName,
    string SalesRep,
    string? OrderDate,
    string Status,
    int ItemCount,
    string PurchaseOrder,
    decimal Total,
    string Location
);

public record ProductSaleDetail(
    int ProductSaleKey,
    string InvoiceNumber,
    string ClientName,
    string DepartmentName,
    string SalesRep,
    string? OrderDate,
    string? QuoteDate,
    string? InvoiceDate,
    string? CanceledDate,
    string Status,
    string PurchaseOrder,
    string ContactName,
    string ContactEmail,
    string ContactPhone,
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
    string? TrackingNumber,
    decimal SubTotal,
    decimal ShippingAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    IEnumerable<ProductSaleLineItem> LineItems
);

public record ProductSaleLineItem(
    int InvoiceKey,
    string ItemDescription,
    string SizeDescription,
    int Quantity,
    decimal UnitPrice,
    decimal ExtendedPrice
);

public record ProductSaleStats(
    int TotalOrders,
    int OpenCount,
    int InvoicedCount,
    int DraftCount,
    int QuotedCount,
    int CancelledCount,
    decimal TotalRevenue
);

public record ProductSaleListResponse(
    IEnumerable<ProductSaleListItem> Items,
    int TotalCount
);

public record CreateProductSaleRequest(
    string? PurchaseOrder,
    string? Note
);
