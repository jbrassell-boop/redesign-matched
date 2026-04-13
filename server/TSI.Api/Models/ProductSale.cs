namespace TSI.Api.Models;

// ── List / Stats ────────────────────────────────────────────────────────────

public record ProductSaleListItem(
    int ProductSaleKey,
    string InvoiceNumber,
    string ClientName,
    string DepartmentName,
    string Status,
    string Source,
    string SalesRep,
    string? OrderDate,
    decimal Total,
    int ItemCount,
    int BackorderedCount,
    int? ParentProductSaleKey
);

public record ProductSaleStats(
    int Total,
    int Draft,
    int Quoted,
    int Approved,
    int Invoiced,
    int Cancelled,
    decimal Revenue
);

public record ProductSaleListResponse(
    IEnumerable<ProductSaleListItem> Items,
    int TotalCount
);

// ── Detail ──────────────────────────────────────────────────────────────────

public record ProductSaleDetail(
    int ProductSaleKey,
    string InvoiceNumber,
    string Status,
    int? ClientKey,
    string ClientName,
    int? DepartmentKey,
    string DepartmentName,
    int? SalesRepKey,
    string SalesRep,
    string? OrderDate,
    string? QuoteDate,
    string? ExpirationDate,
    string? ApprovalDate,
    string? DeniedDate,
    string? CanceledDate,
    string? InvoiceDate,
    string PurchaseOrder,
    string? ShipTrackingNumber,
    decimal ShippingAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal QuoteAmount,
    int? PricingListKey,
    string? PricingListName,
    string? Note,
    // contact
    int? ContactKey,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    // ship address
    string? ShipName1,
    string? ShipName2,
    string? ShipAddressLine1,
    string? ShipAddressLine2,
    string? ShipCity,
    string? ShipState,
    string? ShipZipCode,
    string? ShipCountry,
    // bill address
    string? BillName1,
    string? BillName2,
    string? BillAddressLine1,
    string? BillAddressLine2,
    string? BillCity,
    string? BillState,
    string? BillZipCode,
    string? BillCountry,
    int? BillType,
    string? BillEmail,
    string? BillEmailName,
    // denial
    string? DeniedBy,
    string? DenialReason,
    // estimated ship dates
    string? EstimatedShipDateFrom,
    string? EstimatedShipDateTo,
    // parent order
    int? ParentProductSaleKey,
    string? ParentInvoiceNumber,
    // line items
    IEnumerable<ProductSaleLineItem> LineItems
);

// ── Line items ──────────────────────────────────────────────────────────────

public record ProductSaleLineItem(
    int ProductSaleInventoryKey,
    int? InventorySizeKey,
    string ItemDescription,
    string SizeDescription,
    string? SizeDescription2,
    string? SizeDescription3,
    int Quantity,
    decimal UnitCost,
    decimal TotalCost,
    string? LotNumber,
    string ItemStatus
);

public record AddLineItemRequest(
    int InventorySizeKey,
    int Quantity
);

public record UpdateLineItemRequest(
    int? Quantity,
    string? LotNumber
);

// ── Related orders ─────────────────────────────────────────────────────────

public record RelatedOrderItem(int ProductSaleKey, string InvoiceNumber, string Status, int ItemCount);
public record RelatedOrdersResponse(RelatedOrderItem? Parent, IEnumerable<RelatedOrderItem> Children);

// ── Bulk operations ────────────────────────────────────────────────────────

public record BulkItemStatusRequest(int[] ItemKeys, string Status);

// ── Inventory picker ────────────────────────────────────────────────────────

public record InventoryCategoryDto(
    int InventoryKey,
    string ItemDescription
);

public record InventorySizeDto(
    int InventorySizeKey,
    string SizeDescription,
    string? SizeDescription2,
    string? SizeDescription3,
    string? Status,
    decimal UnitCost
);

// ── Requests ────────────────────────────────────────────────────────────────

public record CreateProductSaleRequest(
    int ClientKey,
    int DepartmentKey,
    int? SalesRepKey = null,
    string? PurchaseOrder = null,
    string? Note = null
);

public record UpdateProductSaleRequest(
    int? ClientKey = null,
    int? DepartmentKey = null,
    int? SalesRepKey = null,
    string? PurchaseOrder = null,
    string? Note = null,
    decimal? ShippingAmount = null,
    decimal? TaxAmount = null,
    int? PricingListKey = null,
    string? ShipTrackingNumber = null,
    int? ContactKey = null,
    string? ContactName = null,
    string? ContactEmail = null,
    string? ContactPhone = null,
    string? ShipName1 = null,
    string? ShipName2 = null,
    string? ShipAddressLine1 = null,
    string? ShipAddressLine2 = null,
    string? ShipCity = null,
    string? ShipState = null,
    string? ShipZipCode = null,
    string? ShipCountry = null,
    string? BillName1 = null,
    string? BillName2 = null,
    string? BillAddressLine1 = null,
    string? BillAddressLine2 = null,
    string? BillCity = null,
    string? BillState = null,
    string? BillZipCode = null,
    string? BillCountry = null,
    string? BillEmail = null,
    string? BillEmailName = null,
    int? BillType = null,
    string? EstimatedShipDateFrom = null,
    string? EstimatedShipDateTo = null
);
