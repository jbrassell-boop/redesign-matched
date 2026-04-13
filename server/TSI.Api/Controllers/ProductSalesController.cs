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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private const string StatusCaseSql = """
        CASE
            WHEN ps.dtCanceledDate IS NOT NULL THEN 'Cancelled'
            WHEN ps.dtDeniedDate   IS NOT NULL THEN 'Denied'
            WHEN ps.dtInvoiceDate  IS NOT NULL THEN 'Invoiced'
            WHEN ps.dtApprovalDate IS NOT NULL THEN 'Approved'
            WHEN ps.dtQuoteDate    IS NOT NULL THEN 'Quoted'
            ELSE 'Draft'
        END
        """;

    /// <summary>Recalculate nQuoteAmount and nTotalAmount on the order.</summary>
    private static async Task RecalcTotals(SqlConnection conn, int productSaleKey, SqlTransaction? txn = null)
    {
        const string sql = """
            UPDATE tblProductSales
            SET nQuoteAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key), 0),
                nTotalAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key), 0)
                             + ISNULL(nShippingAmount, 0)
                             + ISNULL(nTaxAmount, 0)
            WHERE lProductSaleKey = @key
            """;
        await using var cmd = txn != null ? new SqlCommand(sql, conn, txn) : new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", productSaleKey);
        await cmd.ExecuteNonQueryAsync();
    }

    // ── GET /api/product-sales ───────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ps.sInvoiceNumber LIKE @search OR c.sClientName1 LIKE @search OR ps.sPurchaseOrder LIKE @search)");
        if (!string.IsNullOrWhiteSpace(status))
            where.Add($"({StatusCaseSql}) = @status");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   ps.dtOrderDate,
                   ISNULL(ps.nTotalAmount, 0) AS nTotalAmount,
                   {StatusCaseSql} AS Status,
                   ISNULL(ps.sPurchaseOrder, '') AS sPurchaseOrder,
                   (SELECT COUNT(*) FROM tblProductSalesInventory psi WHERE psi.lProductSaleKey = ps.lProductSaleKey) AS ItemCount
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
            {whereClause}
            ORDER BY ps.dtOrderDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(status)) countCmd.Parameters.AddWithValue("@status", status);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(status)) dataCmd.Parameters.AddWithValue("@status", status);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<ProductSaleListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new ProductSaleListItem(
                ProductSaleKey: Convert.ToInt32(reader["lProductSaleKey"]),
                InvoiceNumber: reader["sInvoiceNumber"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                Status: reader["Status"]?.ToString() ?? "Draft",
                Source: reader["sPurchaseOrder"]?.ToString() ?? "",
                SalesRep: reader["SalesRep"]?.ToString()?.Trim() ?? "",
                OrderDate: (reader["dtOrderDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
                Total: Convert.ToDecimal(reader["nTotalAmount"]),
                ItemCount: Convert.ToInt32(reader["ItemCount"]),
                BackorderedCount: 0
            ));
        }

        return Ok(new ProductSaleListResponse(items, totalCount));
    }

    // ── GET /api/product-sales/stats ─────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN ps.dtCanceledDate IS NULL AND ps.dtDeniedDate IS NULL
                          AND ps.dtInvoiceDate IS NULL AND ps.dtApprovalDate IS NULL
                          AND ps.dtQuoteDate IS NULL THEN 1 ELSE 0 END) AS Draft,
                SUM(CASE WHEN ps.dtQuoteDate IS NOT NULL AND ps.dtApprovalDate IS NULL
                          AND ps.dtDeniedDate IS NULL AND ps.dtInvoiceDate IS NULL
                          AND ps.dtCanceledDate IS NULL THEN 1 ELSE 0 END) AS Quoted,
                SUM(CASE WHEN ps.dtApprovalDate IS NOT NULL AND ps.dtInvoiceDate IS NULL
                          AND ps.dtDeniedDate IS NULL AND ps.dtCanceledDate IS NULL
                          THEN 1 ELSE 0 END) AS Approved,
                SUM(CASE WHEN ps.dtInvoiceDate IS NOT NULL AND ps.dtCanceledDate IS NULL
                          AND ps.dtDeniedDate IS NULL THEN 1 ELSE 0 END) AS Invoiced,
                SUM(CASE WHEN ps.dtCanceledDate IS NOT NULL THEN 1 ELSE 0 END) AS Cancelled,
                ISNULL(SUM(CASE WHEN ps.dtInvoiceDate IS NOT NULL AND ps.dtCanceledDate IS NULL
                                AND ps.dtDeniedDate IS NULL THEN ps.nTotalAmount ELSE 0 END), 0) AS Revenue
            FROM tblProductSales ps
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new ProductSaleStats(
            Total: Convert.ToInt32(reader["Total"]),
            Draft: Convert.ToInt32(reader["Draft"]),
            Quoted: Convert.ToInt32(reader["Quoted"]),
            Approved: Convert.ToInt32(reader["Approved"]),
            Invoiced: Convert.ToInt32(reader["Invoiced"]),
            Cancelled: Convert.ToInt32(reader["Cancelled"]),
            Revenue: Convert.ToDecimal(reader["Revenue"])
        ));
    }

    // ── GET /api/product-sales/{key} ─────────────────────────────────────────

    [HttpGet("{key:int}")]
    public async Task<IActionResult> GetDetail(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = $"""
            SELECT ps.*,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   pl.sInventoryPricingList,
                   {StatusCaseSql} AS Status
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
            LEFT JOIN tblInventoryPricingLists pl ON pl.lInventoryPricingListKey = ps.lInventoryPricingListKey
            WHERE ps.lProductSaleKey = @key
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", key);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Product sale not found." });

        var detail = MapDetail(reader);
        await reader.CloseAsync();

        // Load line items from tblProductSalesInventory
        const string linesSql = """
            SELECT psi.lProductSaleInventoryKey, psi.lInventorySizeKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                   isz.sSizeDescription2, isz.sSizeDescription3,
                   ISNULL(psi.lQuantity, 0) AS lQuantity,
                   ISNULL(psi.nUnitCost, 0) AS nUnitCost,
                   ISNULL(psi.nTotalCost, 0) AS nTotalCost,
                   psi.sLotNumber,
                   ISNULL(psi.sItemStatus, 'Pending') AS sItemStatus
            FROM tblProductSalesInventory psi
            LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = psi.lInventorySizeKey
            LEFT JOIN tblInventory i ON i.lInventoryKey = isz.lInventoryKey
            WHERE psi.lProductSaleKey = @key
            ORDER BY psi.lProductSaleInventoryKey
            """;

        await using var linesCmd = new SqlCommand(linesSql, conn);
        linesCmd.CommandTimeout = 30;
        linesCmd.Parameters.AddWithValue("@key", key);
        await using var linesReader = await linesCmd.ExecuteReaderAsync();

        var lineItems = new List<ProductSaleLineItem>();
        while (await linesReader.ReadAsync())
        {
            lineItems.Add(new ProductSaleLineItem(
                ProductSaleInventoryKey: Convert.ToInt32(linesReader["lProductSaleInventoryKey"]),
                InventorySizeKey: linesReader["lInventorySizeKey"] == DBNull.Value ? null : Convert.ToInt32(linesReader["lInventorySizeKey"]),
                ItemDescription: linesReader["sItemDescription"]?.ToString() ?? "",
                SizeDescription: linesReader["sSizeDescription"]?.ToString() ?? "",
                SizeDescription2: linesReader["sSizeDescription2"]?.ToString(),
                SizeDescription3: linesReader["sSizeDescription3"]?.ToString(),
                Quantity: Convert.ToInt32(linesReader["lQuantity"]),
                UnitCost: Convert.ToDecimal(linesReader["nUnitCost"]),
                TotalCost: Convert.ToDecimal(linesReader["nTotalCost"]),
                LotNumber: linesReader["sLotNumber"]?.ToString(),
                ItemStatus: linesReader["sItemStatus"]?.ToString() ?? "Pending"
            ));
        }

        return Ok(detail with { LineItems = lineItems });
    }

    private static ProductSaleDetail MapDetail(SqlDataReader r)
    {
        return new ProductSaleDetail(
            ProductSaleKey: Convert.ToInt32(r["lProductSaleKey"]),
            InvoiceNumber: r["sInvoiceNumber"]?.ToString() ?? "",
            Status: r["Status"]?.ToString() ?? "Draft",
            ClientKey: r["lClientKey"] == DBNull.Value ? null : Convert.ToInt32(r["lClientKey"]),
            ClientName: r["sClientName1"]?.ToString() ?? "",
            DepartmentKey: r["lDepartmentKey"] == DBNull.Value ? null : Convert.ToInt32(r["lDepartmentKey"]),
            DepartmentName: r["sDepartmentName"]?.ToString() ?? "",
            SalesRepKey: r["lSalesRepKey"] == DBNull.Value ? null : Convert.ToInt32(r["lSalesRepKey"]),
            SalesRep: r["SalesRep"]?.ToString()?.Trim() ?? "",
            OrderDate: (r["dtOrderDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            QuoteDate: (r["dtQuoteDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            ExpirationDate: (r["dtExpirationDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            ApprovalDate: (r["dtApprovalDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            DeniedDate: (r["dtDeniedDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            CanceledDate: (r["dtCanceledDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            InvoiceDate: (r["dtInvoiceDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            PurchaseOrder: r["sPurchaseOrder"]?.ToString() ?? "",
            ShipTrackingNumber: r["sShipTrackingNumber"]?.ToString(),
            ShippingAmount: r["nShippingAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(r["nShippingAmount"]),
            TaxAmount: r["nTaxAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(r["nTaxAmount"]),
            TotalAmount: r["nTotalAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(r["nTotalAmount"]),
            QuoteAmount: r["nQuoteAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(r["nQuoteAmount"]),
            PricingListKey: r["lInventoryPricingListKey"] == DBNull.Value ? null : Convert.ToInt32(r["lInventoryPricingListKey"]),
            PricingListName: r["sInventoryPricingList"]?.ToString(),
            Note: r["sNote"]?.ToString(),
            ContactKey: r["lContactKey"] == DBNull.Value ? null : Convert.ToInt32(r["lContactKey"]),
            ContactName: r["sContactName"]?.ToString(),
            ContactEmail: r["sContactEmailAddress"]?.ToString(),
            ContactPhone: r["sClientPhoneNumber"]?.ToString(),
            ShipName1: r["sShipName1"]?.ToString(),
            ShipName2: r["sShipName2"]?.ToString(),
            ShipAddressLine1: r["sAddressLine1"]?.ToString(),
            ShipAddressLine2: r["sAddressLine2"]?.ToString(),
            ShipCity: r["sCity"]?.ToString(),
            ShipState: r["sState"]?.ToString(),
            ShipZipCode: r["sZipCode"]?.ToString(),
            ShipCountry: r["sShipCountry"]?.ToString(),
            BillName1: r["sBillName1"]?.ToString(),
            BillName2: r["sBillName2"]?.ToString(),
            BillAddressLine1: r["sBillAddressLine1"]?.ToString(),
            BillAddressLine2: r["sBillAddressLine2"]?.ToString(),
            BillCity: r["sBillCity"]?.ToString(),
            BillState: r["sBillState"]?.ToString(),
            BillZipCode: r["sBillZipCode"]?.ToString(),
            BillCountry: r["sBillCountry"]?.ToString(),
            BillType: r["lBillType"] == DBNull.Value ? null : Convert.ToInt32(r["lBillType"]),
            BillEmail: r["sBillEmail"]?.ToString(),
            BillEmailName: r["sBillEmailName"]?.ToString(),
            DeniedBy: r["sDeniedBy"]?.ToString(),
            DenialReason: r["sDenialReason"]?.ToString(),
            EstimatedShipDateFrom: (r["dtEstimatedShipDateFrom"] as DateTime?)?.ToString("yyyy-MM-dd"),
            EstimatedShipDateTo: (r["dtEstimatedShipDateTo"] as DateTime?)?.ToString("yyyy-MM-dd"),
            LineItems: Array.Empty<ProductSaleLineItem>()
        );
    }

    // ── POST /api/product-sales ──────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductSaleRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblProductSales
                (lClientKey, lDepartmentKey, lSalesRepKey, dtOrderDate,
                 sPurchaseOrder, sNote, nQuoteAmount, nShippingAmount, nTaxAmount, nTotalAmount)
            OUTPUT INSERTED.lProductSaleKey
            VALUES
                (@clientKey, @deptKey, @salesRepKey, GETDATE(),
                 @po, @note, 0, 0, 0, 0)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", body.ClientKey);
        cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
        cmd.Parameters.AddWithValue("@salesRepKey", (object?)body.SalesRepKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@note", (object?)body.Note ?? DBNull.Value);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { productSaleKey = newKey });
    }

    // ── PATCH /api/product-sales/{key} ───────────────────────────────────────

    [HttpPatch("{key:int}")]
    public async Task<IActionResult> Update(int key, [FromBody] UpdateProductSaleRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn, CommandTimeout = 30 };

        void AddField(string col, object? val)
        {
            if (val == null) return;
            sets.Add($"{col} = @{col}");
            cmd.Parameters.AddWithValue($"@{col}", val ?? DBNull.Value);
        }

        AddField("lClientKey", body.ClientKey);
        AddField("lDepartmentKey", body.DepartmentKey);
        AddField("lSalesRepKey", body.SalesRepKey);
        AddField("sPurchaseOrder", body.PurchaseOrder);
        AddField("sNote", body.Note);
        AddField("nShippingAmount", body.ShippingAmount);
        AddField("nTaxAmount", body.TaxAmount);
        AddField("lInventoryPricingListKey", body.PricingListKey);
        AddField("sShipTrackingNumber", body.ShipTrackingNumber);
        AddField("lContactKey", body.ContactKey);
        AddField("sContactName", body.ContactName);
        AddField("sContactEmailAddress", body.ContactEmail);
        AddField("sClientPhoneNumber", body.ContactPhone);
        AddField("sShipName1", body.ShipName1);
        AddField("sShipName2", body.ShipName2);
        AddField("sAddressLine1", body.ShipAddressLine1);
        AddField("sAddressLine2", body.ShipAddressLine2);
        AddField("sCity", body.ShipCity);
        AddField("sState", body.ShipState);
        AddField("sZipCode", body.ShipZipCode);
        AddField("sShipCountry", body.ShipCountry);
        AddField("sBillName1", body.BillName1);
        AddField("sBillName2", body.BillName2);
        AddField("sBillAddressLine1", body.BillAddressLine1);
        AddField("sBillAddressLine2", body.BillAddressLine2);
        AddField("sBillCity", body.BillCity);
        AddField("sBillState", body.BillState);
        AddField("sBillZipCode", body.BillZipCode);
        AddField("sBillCountry", body.BillCountry);
        AddField("sBillEmail", body.BillEmail);
        AddField("sBillEmailName", body.BillEmailName);
        AddField("lBillType", body.BillType);

        if (body.EstimatedShipDateFrom != null)
        {
            sets.Add("dtEstimatedShipDateFrom = @dtEstimatedShipDateFrom");
            cmd.Parameters.AddWithValue("@dtEstimatedShipDateFrom",
                DateTime.TryParse(body.EstimatedShipDateFrom, out var d1) ? (object)d1 : DBNull.Value);
        }
        if (body.EstimatedShipDateTo != null)
        {
            sets.Add("dtEstimatedShipDateTo = @dtEstimatedShipDateTo");
            cmd.Parameters.AddWithValue("@dtEstimatedShipDateTo",
                DateTime.TryParse(body.EstimatedShipDateTo, out var d2) ? (object)d2 : DBNull.Value);
        }

        if (sets.Count == 0) return BadRequest(new { message = "No fields to update." });

        cmd.CommandText = $"UPDATE tblProductSales SET {string.Join(", ", sets)} WHERE lProductSaleKey = @key";
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();

        // Recalc if shipping or tax changed
        if (body.ShippingAmount != null || body.TaxAmount != null)
            await RecalcTotals(conn, key);

        return Ok(new { updated = true });
    }

    // ── Line Item CRUD ───────────────────────────────────────────────────────

    [HttpPost("{key:int}/items")]
    public async Task<IActionResult> AddLineItem(int key, [FromBody] AddLineItemRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Determine unit cost: check pricing list on the order first
        decimal unitCost = 0;

        // Get the order's pricing list key
        await using var plCmd = new SqlCommand(
            "SELECT lInventoryPricingListKey FROM tblProductSales WHERE lProductSaleKey = @key", conn);
        plCmd.CommandTimeout = 30;
        plCmd.Parameters.AddWithValue("@key", key);
        var plObj = await plCmd.ExecuteScalarAsync();
        var pricingListKey = plObj == null || plObj == DBNull.Value ? (int?)null : Convert.ToInt32(plObj);

        if (pricingListKey.HasValue)
        {
            // Try to get price from pricing list
            await using var priceCmd = new SqlCommand("""
                SELECT nUnitCost FROM tblInventoryPricingListDetails
                WHERE lInventoryPricingListKey = @plKey AND lInventorySizeKey = @sizeKey
                """, conn);
            priceCmd.CommandTimeout = 30;
            priceCmd.Parameters.AddWithValue("@plKey", pricingListKey.Value);
            priceCmd.Parameters.AddWithValue("@sizeKey", body.InventorySizeKey);
            var priceObj = await priceCmd.ExecuteScalarAsync();
            if (priceObj != null && priceObj != DBNull.Value)
                unitCost = Convert.ToDecimal(priceObj);
        }

        if (unitCost == 0)
        {
            // Fall back to tblInventorySize.dblUnitCost
            await using var fallbackCmd = new SqlCommand(
                "SELECT ISNULL(dblUnitCost, 0) FROM tblInventorySize WHERE lInventorySizeKey = @sizeKey", conn);
            fallbackCmd.CommandTimeout = 30;
            fallbackCmd.Parameters.AddWithValue("@sizeKey", body.InventorySizeKey);
            var fbObj = await fallbackCmd.ExecuteScalarAsync();
            if (fbObj != null && fbObj != DBNull.Value)
                unitCost = Convert.ToDecimal(fbObj);
        }

        var totalCost = unitCost * body.Quantity;

        const string insertSql = """
            INSERT INTO tblProductSalesInventory
                (lProductSaleKey, lInventorySizeKey, lQuantity, nUnitCost, nTotalCost)
            OUTPUT INSERTED.lProductSaleInventoryKey
            VALUES
                (@key, @sizeKey, @qty, @unitCost, @totalCost)
            """;

        await using var insertCmd = new SqlCommand(insertSql, conn);
        insertCmd.CommandTimeout = 30;
        insertCmd.Parameters.AddWithValue("@key", key);
        insertCmd.Parameters.AddWithValue("@sizeKey", body.InventorySizeKey);
        insertCmd.Parameters.AddWithValue("@qty", body.Quantity);
        insertCmd.Parameters.AddWithValue("@unitCost", unitCost);
        insertCmd.Parameters.AddWithValue("@totalCost", totalCost);

        var newItemKey = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

        await RecalcTotals(conn, key);

        return Ok(new { productSaleInventoryKey = newItemKey, unitCost, totalCost });
    }

    [HttpDelete("{key:int}/items/{itemKey:int}")]
    public async Task<IActionResult> RemoveLineItem(int key, int itemKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "DELETE FROM tblProductSalesInventory WHERE lProductSaleInventoryKey = @itemKey AND lProductSaleKey = @key", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@itemKey", itemKey);
        cmd.Parameters.AddWithValue("@key", key);
        var rows = await cmd.ExecuteNonQueryAsync();

        if (rows == 0) return NotFound(new { message = "Line item not found." });

        await RecalcTotals(conn, key);

        return Ok(new { deleted = true });
    }

    [HttpPatch("{key:int}/items/{itemKey:int}")]
    public async Task<IActionResult> UpdateLineItem(int key, int itemKey, [FromBody] UpdateLineItemRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn, CommandTimeout = 30 };

        if (body.Quantity.HasValue)
        {
            sets.Add("lQuantity = @qty");
            cmd.Parameters.AddWithValue("@qty", body.Quantity.Value);
            sets.Add("nTotalCost = nUnitCost * @qty2");
            cmd.Parameters.AddWithValue("@qty2", body.Quantity.Value);
        }
        if (body.LotNumber != null)
        {
            sets.Add("sLotNumber = @lot");
            cmd.Parameters.AddWithValue("@lot", body.LotNumber);
        }

        if (sets.Count == 0) return BadRequest(new { message = "No fields to update." });

        cmd.CommandText = $"UPDATE tblProductSalesInventory SET {string.Join(", ", sets)} WHERE lProductSaleInventoryKey = @itemKey AND lProductSaleKey = @key";
        cmd.Parameters.AddWithValue("@itemKey", itemKey);
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();

        await RecalcTotals(conn, key);

        return Ok(new { updated = true });
    }

    // ── Bulk Item Status ─────────────────────────────────────────────────────

    [HttpPost("{key:int}/items/bulk-status")]
    public async Task<IActionResult> BulkItemStatus(int key, [FromBody] BulkItemStatusRequest body)
    {
        var validStatuses = new[] { "Pending", "Shipped", "Backordered" };
        if (!validStatuses.Contains(body.Status))
            return BadRequest(new { message = $"Status must be one of: {string.Join(", ", validStatuses)}" });

        if (body.ItemKeys == null || body.ItemKeys.Length == 0)
            return BadRequest(new { message = "ItemKeys must be non-empty." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Build parameterized IN clause
        var paramNames = new List<string>();
        for (int i = 0; i < body.ItemKeys.Length; i++)
            paramNames.Add($"@k{i}");

        var sql = $"""
            UPDATE tblProductSalesInventory
            SET sItemStatus = @status
            WHERE lProductSaleKey = @key
              AND lProductSaleInventoryKey IN ({string.Join(", ", paramNames)})
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@status", body.Status);
        cmd.Parameters.AddWithValue("@key", key);
        for (int i = 0; i < body.ItemKeys.Length; i++)
            cmd.Parameters.AddWithValue($"@k{i}", body.ItemKeys[i]);

        var rowCount = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rowCount });
    }

    // ── Lifecycle Transitions ────────────────────────────────────────────────

    [HttpPost("{key:int}/quote")]
    public async Task<IActionResult> GenerateQuote(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "UPDATE tblProductSales SET dtQuoteDate = GETDATE() WHERE lProductSaleKey = @key", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();
        return Ok(new { quoted = true });
    }

    [HttpPost("{key:int}/approve")]
    public async Task<IActionResult> Approve(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "UPDATE tblProductSales SET dtApprovalDate = GETDATE() WHERE lProductSaleKey = @key", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();
        return Ok(new { approved = true });
    }

    [HttpPost("{key:int}/invoice")]
    public async Task<IActionResult> Invoice(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "UPDATE tblProductSales SET dtInvoiceDate = GETDATE() WHERE lProductSaleKey = @key", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();
        return Ok(new { invoiced = true });
    }

    [HttpPost("{key:int}/void")]
    public async Task<IActionResult> VoidOrder(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "UPDATE tblProductSales SET dtCanceledDate = GETDATE() WHERE lProductSaleKey = @key", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", key);
        await cmd.ExecuteNonQueryAsync();
        return Ok(new { voided = true });
    }

    // ── Inventory Picker (for adding line items) ─────────────────────────────

    [HttpGet("/api/inventory/categories")]
    public async Task<IActionResult> GetInventoryCategories([FromQuery] string? search = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var whereSql = "WHERE ISNULL(i.bActive, 0) = 1";
        if (!string.IsNullOrWhiteSpace(search))
            whereSql += " AND i.sItemDescription LIKE @search";

        var sql = $"""
            SELECT i.lInventoryKey, ISNULL(i.sItemDescription, '') AS sItemDescription
            FROM tblInventory i
            {whereSql}
            ORDER BY i.sItemDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<InventoryCategoryDto>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventoryCategoryDto(
                InventoryKey: Convert.ToInt32(reader["lInventoryKey"]),
                ItemDescription: reader["sItemDescription"]?.ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    [HttpGet("/api/inventory/{inventoryKey:int}/sizes")]
    public async Task<IActionResult> GetInventorySizes(int inventoryKey, [FromQuery] int? pricingListKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        string sql;
        if (pricingListKey.HasValue)
        {
            sql = """
                SELECT isz.lInventorySizeKey,
                       ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                       isz.sSizeDescription2, isz.sSizeDescription3,
                       isz.sStatus,
                       ISNULL(pld.nUnitCost, ISNULL(isz.dblUnitCost, 0)) AS UnitCost
                FROM tblInventorySize isz
                LEFT JOIN tblInventoryPricingListDetails pld
                    ON pld.lInventorySizeKey = isz.lInventorySizeKey
                    AND pld.lInventoryPricingListKey = @plKey
                WHERE isz.lInventoryKey = @invKey AND ISNULL(isz.bActive, 0) = 1
                ORDER BY isz.sSizeDescription
                """;
        }
        else
        {
            sql = """
                SELECT isz.lInventorySizeKey,
                       ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                       isz.sSizeDescription2, isz.sSizeDescription3,
                       isz.sStatus,
                       ISNULL(isz.dblUnitCost, 0) AS UnitCost
                FROM tblInventorySize isz
                WHERE isz.lInventoryKey = @invKey AND ISNULL(isz.bActive, 0) = 1
                ORDER BY isz.sSizeDescription
                """;
        }

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@invKey", inventoryKey);
        if (pricingListKey.HasValue)
            cmd.Parameters.AddWithValue("@plKey", pricingListKey.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<InventorySizeDto>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventorySizeDto(
                InventorySizeKey: Convert.ToInt32(reader["lInventorySizeKey"]),
                SizeDescription: reader["sSizeDescription"]?.ToString() ?? "",
                SizeDescription2: reader["sSizeDescription2"]?.ToString(),
                SizeDescription3: reader["sSizeDescription3"]?.ToString(),
                Status: reader["sStatus"]?.ToString(),
                UnitCost: Convert.ToDecimal(reader["UnitCost"])
            ));
        }
        return Ok(items);
    }
}
