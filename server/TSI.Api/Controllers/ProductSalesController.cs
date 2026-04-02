using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/product-sales")]
[Authorize]
public class ProductSalesController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    private static string DeriveStatus(DateTime? invoiceDate, DateTime? canceledDate, DateTime? quoteDate)
    {
        if (canceledDate.HasValue) return "Cancelled";
        if (invoiceDate.HasValue) return "Invoiced";
        if (quoteDate.HasValue) return "Quote Sent";
        return "Open";
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ps.sInvoiceNumber LIKE @search OR c.sClientName1 LIKE @search OR ps.sPurchaseOrder LIKE @search)");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*) FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT ps.lProductSaleKey, ps.sInvoiceNumber, c.sClientName1,
                   d.sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   ps.dtOrderDate, ps.dtQuoteDate, ps.dtInvoiceDate, ps.dtCanceledDate,
                   ps.sPurchaseOrder,
                   ISNULL(ps.nTotalAmount, 0) AS nTotalAmount,
                   (SELECT COUNT(*) FROM tblProductSaleInvoiceDetail pid WHERE pid.lProductSalesKey = ps.lProductSaleKey) AS ItemCount
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
            {whereClause}
            ORDER BY ps.dtOrderDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<ProductSaleListItem>();
        while (await reader.ReadAsync())
        {
            var invoiceDate = reader["dtInvoiceDate"] as DateTime?;
            var canceledDate = reader["dtCanceledDate"] as DateTime?;
            var quoteDate = reader["dtQuoteDate"] as DateTime?;
            var status = DeriveStatus(invoiceDate, canceledDate, quoteDate);

            items.Add(new ProductSaleListItem(
                ProductSaleKey: Convert.ToInt32(reader["lProductSaleKey"]),
                InvoiceNumber: reader["sInvoiceNumber"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                SalesRep: reader["SalesRep"]?.ToString()?.Trim() ?? "",
                OrderDate: (reader["dtOrderDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
                Status: status,
                ItemCount: Convert.ToInt32(reader["ItemCount"]),
                PurchaseOrder: reader["sPurchaseOrder"]?.ToString() ?? "",
                Total: Convert.ToDecimal(reader["nTotalAmount"]),
                Location: ""
            ));
        }

        // Post-filter by status
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            items = items.Where(i => i.Status.Equals(statusFilter, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Ok(new ProductSaleListResponse(items, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
                   c.sClientName1, d.sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   ps.dtOrderDate, ps.dtQuoteDate, ps.dtInvoiceDate, ps.dtCanceledDate,
                   ps.sPurchaseOrder, ps.sContactName, ps.sContactEmailAddress, ps.sClientPhoneNumber,
                   ps.sBillName1, ps.sBillAddressLine1, ps.sBillCity, ps.sBillState, ps.sBillZipCode,
                   ps.sShipName1, ps.sAddressLine1 AS sShipAddr, ps.sCity AS sShipCity,
                   ps.sState AS sShipState, ps.sZipCode AS sShipZip,
                   ps.sShipTrackingNumber,
                   ISNULL(ps.nQuoteAmount, 0) AS nQuoteAmount,
                   ISNULL(ps.nShippingAmount, 0) AS nShippingAmount,
                   ISNULL(ps.nTaxAmount, 0) AS nTaxAmount,
                   ISNULL(ps.nTotalAmount, 0) AS nTotalAmount,
                   CAST(ps.sNote AS nvarchar(max)) AS sNote
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
            WHERE ps.lProductSaleKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Product sale not found." });

        var invoiceDate = reader["dtInvoiceDate"] as DateTime?;
        var canceledDate = reader["dtCanceledDate"] as DateTime?;
        var quoteDate = reader["dtQuoteDate"] as DateTime?;
        var status = DeriveStatus(invoiceDate, canceledDate, quoteDate);

        var saleKey = Convert.ToInt32(reader["lProductSaleKey"]);
        var invoiceNumber = reader["sInvoiceNumber"]?.ToString() ?? "";
        var clientName = reader["sClientName1"]?.ToString() ?? "";
        var deptName = reader["sDepartmentName"]?.ToString() ?? "";
        var salesRep = reader["SalesRep"]?.ToString()?.Trim() ?? "";
        var orderDate = (reader["dtOrderDate"] as DateTime?)?.ToString("yyyy-MM-dd");
        var quoteDateStr = quoteDate?.ToString("yyyy-MM-dd");
        var invoiceDateStr = invoiceDate?.ToString("yyyy-MM-dd");
        var canceledDateStr = canceledDate?.ToString("yyyy-MM-dd");
        var po = reader["sPurchaseOrder"]?.ToString() ?? "";
        var contactName = reader["sContactName"]?.ToString() ?? "";
        var contactEmail = reader["sContactEmailAddress"]?.ToString() ?? "";
        var contactPhone = reader["sClientPhoneNumber"]?.ToString() ?? "";
        var billName = reader["sBillName1"]?.ToString() ?? "";
        var billAddr = reader["sBillAddressLine1"]?.ToString() ?? "";
        var billCity = reader["sBillCity"]?.ToString() ?? "";
        var billState = reader["sBillState"]?.ToString() ?? "";
        var billZip = reader["sBillZipCode"]?.ToString() ?? "";
        var shipName = reader["sShipName1"]?.ToString() ?? "";
        var shipAddr = reader["sShipAddr"]?.ToString() ?? "";
        var shipCity = reader["sShipCity"]?.ToString() ?? "";
        var shipState = reader["sShipState"]?.ToString() ?? "";
        var shipZip = reader["sShipZip"]?.ToString() ?? "";
        var tracking = reader["sShipTrackingNumber"]?.ToString();
        var subTotal = Convert.ToDecimal(reader["nQuoteAmount"]);
        var shipping = Convert.ToDecimal(reader["nShippingAmount"]);
        var tax = Convert.ToDecimal(reader["nTaxAmount"]);
        var total = Convert.ToDecimal(reader["nTotalAmount"]);
        var notes = reader["sNote"]?.ToString();

        await reader.CloseAsync();

        // Load line items
        const string linesSql = """
            SELECT pid.lInvoiceKey, pid.sItemDescription, pid.sSizeDescription,
                   ISNULL(pid.lQty, 0) AS lQty,
                   ISNULL(pid.nUnitPrice, 0) AS nUnitPrice,
                   ISNULL(pid.nExtPrice, 0) AS nExtPrice
            FROM tblProductSaleInvoiceDetail pid
            WHERE pid.lProductSalesKey = @id
            ORDER BY pid.lInvoiceKey
            """;

        await using var linesCmd = new SqlCommand(linesSql, conn);
        linesCmd.Parameters.AddWithValue("@id", id);
        await using var linesReader = await linesCmd.ExecuteReaderAsync();
        var lineItems = new List<ProductSaleLineItem>();
        while (await linesReader.ReadAsync())
        {
            lineItems.Add(new ProductSaleLineItem(
                InvoiceKey: Convert.ToInt32(linesReader["lInvoiceKey"]),
                ItemDescription: linesReader["sItemDescription"]?.ToString() ?? "",
                SizeDescription: linesReader["sSizeDescription"]?.ToString() ?? "",
                Quantity: Convert.ToInt32(linesReader["lQty"]),
                UnitPrice: Convert.ToDecimal(linesReader["nUnitPrice"]),
                ExtendedPrice: Convert.ToDecimal(linesReader["nExtPrice"])
            ));
        }

        return Ok(new ProductSaleDetail(
            ProductSaleKey: saleKey,
            InvoiceNumber: invoiceNumber,
            ClientName: clientName,
            DepartmentName: deptName,
            SalesRep: salesRep,
            OrderDate: orderDate,
            QuoteDate: quoteDateStr,
            InvoiceDate: invoiceDateStr,
            CanceledDate: canceledDateStr,
            Status: status,
            PurchaseOrder: po,
            ContactName: contactName,
            ContactEmail: contactEmail,
            ContactPhone: contactPhone,
            BillName: billName,
            BillAddress: billAddr,
            BillCity: billCity,
            BillState: billState,
            BillZip: billZip,
            ShipName: shipName,
            ShipAddress: shipAddr,
            ShipCity: shipCity,
            ShipState: shipState,
            ShipZip: shipZip,
            TrackingNumber: tracking,
            SubTotal: subTotal,
            ShippingAmount: shipping,
            TaxAmount: tax,
            TotalAmount: total,
            Notes: notes,
            LineItems: lineItems
        ));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS TotalOrders,
                SUM(CASE WHEN ps.dtCanceledDate IS NULL AND ps.dtInvoiceDate IS NULL AND ps.dtQuoteDate IS NULL THEN 1 ELSE 0 END) AS OpenCount,
                SUM(CASE WHEN ps.dtInvoiceDate IS NOT NULL AND ps.dtCanceledDate IS NULL THEN 1 ELSE 0 END) AS InvoicedCount,
                SUM(CASE WHEN ps.dtQuoteDate IS NOT NULL AND ps.dtInvoiceDate IS NULL AND ps.dtCanceledDate IS NULL THEN 1 ELSE 0 END) AS QuotedCount,
                SUM(CASE WHEN ps.dtCanceledDate IS NOT NULL THEN 1 ELSE 0 END) AS CancelledCount,
                ISNULL(SUM(ps.nTotalAmount), 0) AS TotalRevenue
            FROM tblProductSales ps
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new ProductSaleStats(
            TotalOrders: Convert.ToInt32(reader["TotalOrders"]),
            OpenCount: Convert.ToInt32(reader["OpenCount"]),
            InvoicedCount: Convert.ToInt32(reader["InvoicedCount"]),
            DraftCount: 0,
            QuotedCount: Convert.ToInt32(reader["QuotedCount"]),
            CancelledCount: Convert.ToInt32(reader["CancelledCount"]),
            TotalRevenue: Convert.ToDecimal(reader["TotalRevenue"])
        ));
    }
}
