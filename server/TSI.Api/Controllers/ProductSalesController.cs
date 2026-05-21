using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/product-sales")]
[Authorize]
public class ProductSalesController(
    IConfiguration config,
    IInvoiceNumberService invoiceNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    /// <summary>
    /// Returns true if a column exists on a SqlDataReader's result set.
    /// Used to guard against optional columns (e.g. lParentProductSaleKey,
    /// sItemStatus) that may not be present on every schema version.
    /// </summary>
    private static bool HasField(System.Data.IDataRecord r, string name)
    {
        for (int i = 0; i < r.FieldCount; i++)
            if (string.Equals(r.GetName(i), name, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    /// <summary>
    /// Probes INFORMATION_SCHEMA.COLUMNS to determine whether an optional
    /// column is present. Cheap (1 row, indexed) — fine to call per-request.
    /// </summary>
    private static async Task<bool> ColumnExistsAsync(SqlConnection conn, string table, string column)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @t AND COLUMN_NAME = @c", conn);
        cmd.CommandTimeout = 10;
        cmd.Parameters.AddWithValue("@t", table);
        cmd.Parameters.AddWithValue("@c", column);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

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
        // Mandatory location scope — product sales filter through the dept's
        // service location (tblProductSales has lDepartmentKey, tblDepartment
        // has lServiceLocationKey). See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "d.lServiceLocationKey = @locationKey" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ps.sInvoiceNumber LIKE @search OR c.sClientName1 LIKE @search OR ps.sPurchaseOrder LIKE @search)");
        if (!string.IsNullOrWhiteSpace(status))
            where.Add($"({StatusCaseSql}) = @status");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        // Count query needs tblDepartment join too for the location filter.
        var countSql = $"""
            SELECT COUNT(*)
            FROM tblProductSales ps
            LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            {whereClause}
            """;

        // NOTE: lParentProductSaleKey is not present on the cloud schema yet.
        // Return 0 as a placeholder until the column is added — the column
        // backs the parent/child sub-order feature, which the cloud schema
        // does not support without a schema migration.
        var dataSql = $"""
            SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   ps.dtOrderDate,
                   ISNULL(ps.nTotalAmount, 0) AS nTotalAmount,
                   {StatusCaseSql} AS Status,
                   ISNULL(ps.sPurchaseOrder, '') AS sPurchaseOrder,
                   (SELECT COUNT(*) FROM tblProductSalesInventory psi WHERE psi.lProductSaleKey = ps.lProductSaleKey) AS ItemCount,
                   0 AS lParentProductSaleKey
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
        countCmd.Parameters.AddWithValue("@locationKey", locationKey);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(status)) countCmd.Parameters.AddWithValue("@status", status);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        dataCmd.Parameters.AddWithValue("@locationKey", locationKey);
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
                BackorderedCount: 0,
                ParentProductSaleKey: Convert.ToInt32(reader["lParentProductSaleKey"]) == 0 ? null : Convert.ToInt32(reader["lParentProductSaleKey"])
            ));
        }

        return Ok(new ProductSaleListResponse(items, totalCount));
    }

    // ── GET /api/product-sales/stats ─────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        // Mandatory location scope. See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // ISNULL each SUM — on an empty table SUM returns NULL (not 0),
        // and Convert.ToInt32(DBNull) throws InvalidCastException → 500.
        const string sql = """
            SELECT
                COUNT(*) AS Total,
                ISNULL(SUM(CASE WHEN ps.dtCanceledDate IS NULL AND ps.dtDeniedDate IS NULL
                          AND ps.dtInvoiceDate IS NULL AND ps.dtApprovalDate IS NULL
                          AND ps.dtQuoteDate IS NULL THEN 1 ELSE 0 END), 0) AS Draft,
                ISNULL(SUM(CASE WHEN ps.dtQuoteDate IS NOT NULL AND ps.dtApprovalDate IS NULL
                          AND ps.dtDeniedDate IS NULL AND ps.dtInvoiceDate IS NULL
                          AND ps.dtCanceledDate IS NULL THEN 1 ELSE 0 END), 0) AS Quoted,
                ISNULL(SUM(CASE WHEN ps.dtApprovalDate IS NOT NULL AND ps.dtInvoiceDate IS NULL
                          AND ps.dtDeniedDate IS NULL AND ps.dtCanceledDate IS NULL
                          THEN 1 ELSE 0 END), 0) AS Approved,
                ISNULL(SUM(CASE WHEN ps.dtInvoiceDate IS NOT NULL AND ps.dtCanceledDate IS NULL
                          AND ps.dtDeniedDate IS NULL THEN 1 ELSE 0 END), 0) AS Invoiced,
                ISNULL(SUM(CASE WHEN ps.dtCanceledDate IS NOT NULL THEN 1 ELSE 0 END), 0) AS Cancelled,
                ISNULL(SUM(CASE WHEN ps.dtInvoiceDate IS NOT NULL AND ps.dtCanceledDate IS NULL
                                AND ps.dtDeniedDate IS NULL THEN ps.nTotalAmount ELSE 0 END), 0) AS Revenue
            FROM tblProductSales ps
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            WHERE d.lServiceLocationKey = @locationKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@locationKey", locationKey);
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

        // NOTE: parent self-join removed — depends on lParentProductSaleKey
        // column which is not on the cloud schema. ParentInvoiceNumber returned
        // as NULL until schema migration adds the column.
        var sql = $"""
            SELECT ps.*,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
                   pl.sInventoryPricingList,
                   CAST(NULL AS NVARCHAR(50)) AS ParentInvoiceNumber,
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

        // Load line items from tblProductSalesInventory.
        // sItemStatus column is not on the cloud schema yet — default to 'Pending'.
        const string linesSql = """
            SELECT psi.lProductSaleInventoryKey, psi.lInventorySizeKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                   isz.sSizeDescription2, isz.sSizeDescription3,
                   ISNULL(psi.lQuantity, 0) AS lQuantity,
                   ISNULL(psi.nUnitCost, 0) AS nUnitCost,
                   ISNULL(psi.nTotalCost, 0) AS nTotalCost,
                   psi.sLotNumber,
                   CAST('Pending' AS NVARCHAR(20)) AS sItemStatus
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
            // ParentProductSaleKey: column not on cloud schema yet → always null.
            // SqlDataReader.GetOrdinal would throw on a missing column, so use
            // a guarded HasColumn-style helper via a try/catch in case the
            // column shows up on a future schema.
            ParentProductSaleKey: HasField(r, "lParentProductSaleKey")
                ? (r["lParentProductSaleKey"] == DBNull.Value ? null : (int?)Convert.ToInt32(r["lParentProductSaleKey"]))
                : null,
            ParentInvoiceNumber: r["ParentInvoiceNumber"]?.ToString(),
            LineItems: Array.Empty<ProductSaleLineItem>()
        );
    }

    // ── POST /api/product-sales ──────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductSaleRequest body)
    {
        // tblProductSales NOT NULL: lClientKey, lDepartmentKey, lSalesRepKey,
        // sInvoiceNumber, dtOrderDate. The pre-existing version omitted both
        // lSalesRepKey and sInvoiceNumber and 500'd against the schema.
        //
        // Port of Steve's cloud Create (BrightLogix repo's ProductSalesController):
        //   - Validate client + dept inputs (400 on bad)
        //   - Dept lookup pulls salesRep + serviceLocationKey in one query
        //   - Fallback to client's salesRep, then 0
        //   - NextAsync('I', svcLocKey, conn, txn) generates a real NI/SI/FI
        //     invoice number — sInvoiceNumber is populated at create time, not
        //     deferred to a finalize step (matches the cloud schema's invariant)
        //   - NextAsync + INSERT wrapped in a txn so counter rolls back with INSERT
        if (body.ClientKey <= 0 || body.DepartmentKey <= 0)
            return BadRequest(new { error = "ClientKey and DepartmentKey are required." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Validate dept-belongs-to-client + pull salesRep + serviceLocationKey in one trip.
        int? deptSalesRep = null;
        int serviceLocationKey;
        await using (var validate = new SqlCommand(@"
            SELECT d.lSalesRepKey, ISNULL(d.lServiceLocationKey, 1) AS lServiceLocationKey
            FROM dbo.tblDepartment d
            WHERE d.lDepartmentKey = @dept
              AND d.lClientKey = @client
              AND d.Deleted_datetime IS NULL", conn))
        {
            validate.Parameters.AddWithValue("@dept", body.DepartmentKey);
            validate.Parameters.AddWithValue("@client", body.ClientKey);
            await using var reader = await validate.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return BadRequest(new { error = "Department doesn't belong to that client (or doesn't exist)." });
            if (reader["lSalesRepKey"] is not DBNull) deptSalesRep = Convert.ToInt32(reader["lSalesRepKey"]);
            serviceLocationKey = Convert.ToInt32(reader["lServiceLocationKey"]);
        }

        // Fallback chain for salesRep: explicit body value → dept → client → 0.
        var salesRepKey = body.SalesRepKey ?? deptSalesRep ?? 0;
        if (salesRepKey == 0)
        {
            await using var clientRep = new SqlCommand(
                "SELECT lSalesRepKey FROM dbo.tblClient WHERE lClientKey = @client AND Deleted_datetime IS NULL", conn);
            clientRep.Parameters.AddWithValue("@client", body.ClientKey);
            var v = await clientRep.ExecuteScalarAsync();
            if (v is not null and not DBNull) salesRepKey = Convert.ToInt32(v);
        }

        // NextAsync + INSERT wrapped in a txn so the counter rolls back with
        // a failed INSERT (same counter-burn fix as the rest of the create
        // endpoints — Receiving, Orders, OnsiteServices, Loaners, etc.).
        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // Type 'I' for product-sale Invoice. Produces NI26140001-style numbers.
            var invoiceNumber = await invoiceNumbers.NextAsync('I', serviceLocationKey, conn, txn);

            const string sql = """
                INSERT INTO tblProductSales
                    (lClientKey, lDepartmentKey, lSalesRepKey, sInvoiceNumber, dtOrderDate,
                     sPurchaseOrder, sNote, nQuoteAmount, nShippingAmount, nTaxAmount, nTotalAmount)
                OUTPUT INSERTED.lProductSaleKey
                VALUES
                    (@clientKey, @deptKey, @salesRepKey, @inv, GETDATE(),
                     @po, @note, 0, 0, 0, 0)
                """;

            await using var cmd = new SqlCommand(sql, conn, txn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@clientKey", body.ClientKey);
            cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
            cmd.Parameters.AddWithValue("@salesRepKey", salesRepKey);
            cmd.Parameters.AddWithValue("@inv", invoiceNumber);
            cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@note", (object?)body.Note ?? DBNull.Value);

            var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());

            await txn.CommitAsync();
            return Ok(new { productSaleKey = newKey, invoiceNumber });
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
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

        // Bulk-status writes to sItemStatus, which may not be on the schema yet.
        if (!await ColumnExistsAsync(conn, "tblProductSalesInventory", "sItemStatus"))
        {
            return StatusCode(StatusCodes.Status501NotImplemented, new
            {
                error = "Per-item status requires schema upgrade: tblProductSalesInventory.sItemStatus is not present on this database."
            });
        }

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

    // ── Related Orders ───────────────────────────────────────────────────────

    [HttpGet("{key:int}/related")]
    public async Task<IActionResult> GetRelatedOrders(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Cloud schema may not have lParentProductSaleKey yet — if missing,
        // there are no parent/child relationships, so return an empty result.
        if (!await ColumnExistsAsync(conn, "tblProductSales", "lParentProductSaleKey"))
            return Ok(new RelatedOrdersResponse(null, Array.Empty<RelatedOrderItem>()));

        // Get this order's parent key
        await using var parentKeyCmd = new SqlCommand(
            "SELECT ISNULL(lParentProductSaleKey, 0) FROM tblProductSales WHERE lProductSaleKey = @key", conn);
        parentKeyCmd.CommandTimeout = 30;
        parentKeyCmd.Parameters.AddWithValue("@key", key);
        var parentKeyObj = await parentKeyCmd.ExecuteScalarAsync();
        var parentKey = parentKeyObj == null || parentKeyObj == DBNull.Value ? 0 : Convert.ToInt32(parentKeyObj);

        RelatedOrderItem? parent = null;
        if (parentKey > 0)
        {
            var parentSql = $"""
                SELECT ps.lProductSaleKey, ISNULL(ps.sInvoiceNumber, '') AS sInvoiceNumber,
                       {StatusCaseSql} AS Status,
                       (SELECT COUNT(*) FROM tblProductSalesInventory psi WHERE psi.lProductSaleKey = ps.lProductSaleKey) AS ItemCount
                FROM tblProductSales ps
                WHERE ps.lProductSaleKey = @parentKey
                """;
            await using var parentCmd = new SqlCommand(parentSql, conn);
            parentCmd.CommandTimeout = 30;
            parentCmd.Parameters.AddWithValue("@parentKey", parentKey);
            await using var parentReader = await parentCmd.ExecuteReaderAsync();
            if (await parentReader.ReadAsync())
            {
                parent = new RelatedOrderItem(
                    ProductSaleKey: Convert.ToInt32(parentReader["lProductSaleKey"]),
                    InvoiceNumber: parentReader["sInvoiceNumber"]?.ToString() ?? "",
                    Status: parentReader["Status"]?.ToString() ?? "Draft",
                    ItemCount: Convert.ToInt32(parentReader["ItemCount"])
                );
            }
        }

        // Query children where lParentProductSaleKey = this order's key
        var childSql = $"""
            SELECT ps.lProductSaleKey, ISNULL(ps.sInvoiceNumber, '') AS sInvoiceNumber,
                   {StatusCaseSql} AS Status,
                   (SELECT COUNT(*) FROM tblProductSalesInventory psi WHERE psi.lProductSaleKey = ps.lProductSaleKey) AS ItemCount
            FROM tblProductSales ps
            WHERE ps.lParentProductSaleKey = @key
            ORDER BY ps.lProductSaleKey
            """;
        await using var childCmd = new SqlCommand(childSql, conn);
        childCmd.CommandTimeout = 30;
        childCmd.Parameters.AddWithValue("@key", key);
        await using var childReader = await childCmd.ExecuteReaderAsync();

        var children = new List<RelatedOrderItem>();
        while (await childReader.ReadAsync())
        {
            children.Add(new RelatedOrderItem(
                ProductSaleKey: Convert.ToInt32(childReader["lProductSaleKey"]),
                InvoiceNumber: childReader["sInvoiceNumber"]?.ToString() ?? "",
                Status: childReader["Status"]?.ToString() ?? "Draft",
                ItemCount: Convert.ToInt32(childReader["ItemCount"])
            ));
        }

        return Ok(new RelatedOrdersResponse(parent, children));
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

        // Invoice flow depends on per-item sItemStatus (Shipped/Backordered)
        // and on lParentProductSaleKey for child sub-orders. If either is
        // absent on the running schema, fail clearly instead of erroring.
        if (!await ColumnExistsAsync(conn, "tblProductSalesInventory", "sItemStatus") ||
            !await ColumnExistsAsync(conn, "tblProductSales", "lParentProductSaleKey"))
        {
            return StatusCode(StatusCodes.Status501NotImplemented, new
            {
                error = "Invoice flow requires schema upgrade: tblProductSalesInventory.sItemStatus and tblProductSales.lParentProductSaleKey are not present on this database."
            });
        }

        // ── Preconditions ───────────────────────────────────────────────────
        await using var checkCmd = new SqlCommand(
            $"SELECT {StatusCaseSql} AS Status FROM tblProductSales ps WHERE ps.lProductSaleKey = @key", conn);
        checkCmd.CommandTimeout = 30;
        checkCmd.Parameters.AddWithValue("@key", key);
        var status = (await checkCmd.ExecuteScalarAsync())?.ToString();
        if (status != "Approved")
            return BadRequest(new { error = $"Order must be Approved to invoice (current status: {status})." });

        await using var shippedCheckCmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'", conn);
        shippedCheckCmd.CommandTimeout = 30;
        shippedCheckCmd.Parameters.AddWithValue("@key", key);
        var shippedCount = Convert.ToInt32(await shippedCheckCmd.ExecuteScalarAsync());
        if (shippedCount == 0)
            return BadRequest(new { error = "No items are marked as Shipped. Mark at least one item Shipped before invoicing." });

        // Resolve the order's service-location key from its dept — drives
        // the leading N/S/F character on the invoice number.
        int serviceLocationKey;
        await using (var locCmd = new SqlCommand(@"
            SELECT ISNULL(d.lServiceLocationKey, 1) AS lServiceLocationKey
            FROM tblProductSales ps
            JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
            WHERE ps.lProductSaleKey = @key", conn))
        {
            locCmd.Parameters.AddWithValue("@key", key);
            var locResult = await locCmd.ExecuteScalarAsync();
            serviceLocationKey = locResult is null or DBNull ? 1 : Convert.ToInt32(locResult);
        }

        // ── Begin transaction ───────────────────────────────────────────────
        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // Generate invoice number via the canonical proc — type 'I'
            // (product-sale Invoice). Replaces the legacy inline MERGE that
            // used type 'P' and 2-digit seq, producing NP-prefixed 9-char
            // numbers ('NP26140 01'). New format matches the cloud deploy:
            // NI26140001-style 10-char numbers, atomic per-day counter.
            var invoiceNumber = await invoiceNumbers.NextAsync('I', serviceLocationKey, conn, txn);

            // B. Generate a unique lInvoiceKey for the snapshot detail rows.
            // UPDLOCK + HOLDLOCK prevents concurrent reads from generating the
            // same key when two invoices are created simultaneously.
            await using var maxKeyCmd = new SqlCommand(
                "SELECT ISNULL(MAX(lInvoiceKey), 0) + 1 FROM tblProductSaleInvoiceDetail WITH (UPDLOCK, HOLDLOCK)", conn, txn);
            maxKeyCmd.CommandTimeout = 30;
            var invoiceKey = Convert.ToInt32(await maxKeyCmd.ExecuteScalarAsync());

            // C. Snapshot shipped items into tblProductSaleInvoiceDetail
            const string snapshotSql = """
                INSERT INTO tblProductSaleInvoiceDetail
                    (lInvoiceKey, lProductSalesKey, lProductSaleInventoryKey, lInventoryKey, lInventorySizeKey,
                     sItemDescription, sSizeDescription, sSizeDescription2, sSizeDescription3,
                     sSubDescription, lQty, nUnitCost, nTotalCost, sLotNumber)
                SELECT
                    @invoiceKey, psi.lProductSaleKey, psi.lProductSaleInventoryKey,
                    isz.lInventoryKey, psi.lInventorySizeKey,
                    ISNULL(i.sItemDescription, ''), ISNULL(isz.sSizeDescription, ''),
                    isz.sSizeDescription2, isz.sSizeDescription3,
                    NULL,
                    psi.lQuantity, psi.nUnitCost, psi.nTotalCost, psi.sLotNumber
                FROM tblProductSalesInventory psi
                LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = psi.lInventorySizeKey
                LEFT JOIN tblInventory i ON i.lInventoryKey = isz.lInventoryKey
                WHERE psi.lProductSaleKey = @key AND psi.sItemStatus = 'Shipped'
                """;
            await using var snapCmd = new SqlCommand(snapshotSql, conn, txn);
            snapCmd.CommandTimeout = 30;
            snapCmd.Parameters.AddWithValue("@invoiceKey", invoiceKey);
            snapCmd.Parameters.AddWithValue("@key", key);
            await snapCmd.ExecuteNonQueryAsync();

            // C. Stamp the order — invoice date, number, recalc totals for shipped only
            const string stampSql = """
                UPDATE tblProductSales
                SET dtInvoiceDate = GETDATE(),
                    sInvoiceNumber = @invoiceNumber,
                    nQuoteAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'), 0),
                    nTotalAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'), 0)
                                 + ISNULL(nShippingAmount, 0) + ISNULL(nTaxAmount, 0)
                WHERE lProductSaleKey = @key
                """;
            await using var stampCmd = new SqlCommand(stampSql, conn, txn);
            stampCmd.CommandTimeout = 30;
            stampCmd.Parameters.AddWithValue("@key", key);
            stampCmd.Parameters.AddWithValue("@invoiceNumber", invoiceNumber);
            await stampCmd.ExecuteNonQueryAsync();

            // D. Check for backordered items
            await using var boCountCmd = new SqlCommand(
                "SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Backordered'", conn, txn);
            boCountCmd.CommandTimeout = 30;
            boCountCmd.Parameters.AddWithValue("@key", key);
            var backorderedCount = Convert.ToInt32(await boCountCmd.ExecuteScalarAsync());

            int? childKey = null;
            var childItemCount = 0;

            if (backorderedCount > 0)
            {
                // D1. Create child order
                const string childSql = """
                    INSERT INTO tblProductSales
                        (lClientKey, lDepartmentKey, lSalesRepKey, dtOrderDate, dtApprovalDate,
                         sPurchaseOrder, sNote, lInventoryPricingListKey,
                         lContactKey, sContactName, sContactEmailAddress, sClientPhoneNumber,
                         sShipName1, sShipName2, sAddressLine1, sAddressLine2, sCity, sState, sZipCode, sShipCountry,
                         sBillName1, sBillName2, sBillAddressLine1, sBillAddressLine2, sBillCity, sBillState, sBillZipCode, sBillCountry,
                         lBillType, sBillEmail, sBillEmailName,
                         nQuoteAmount, nShippingAmount, nTaxAmount, nTotalAmount,
                         lParentProductSaleKey, sInvoiceNumber)
                    OUTPUT INSERTED.lProductSaleKey
                    SELECT
                        lClientKey, lDepartmentKey, lSalesRepKey, GETDATE(), GETDATE(),
                        sPurchaseOrder, CONCAT('Split from order ', sInvoiceNumber, ' — backordered items'), lInventoryPricingListKey,
                        lContactKey, sContactName, sContactEmailAddress, sClientPhoneNumber,
                        sShipName1, sShipName2, sAddressLine1, sAddressLine2, sCity, sState, sZipCode, sShipCountry,
                        sBillName1, sBillName2, sBillAddressLine1, sBillAddressLine2, sBillCity, sBillState, sBillZipCode, sBillCountry,
                        lBillType, sBillEmail, sBillEmailName,
                        0, 0, 0, 0,
                        @key, ''
                    FROM tblProductSales WHERE lProductSaleKey = @key
                    """;
                await using var childCmd = new SqlCommand(childSql, conn, txn);
                childCmd.CommandTimeout = 30;
                childCmd.Parameters.AddWithValue("@key", key);
                childKey = Convert.ToInt32(await childCmd.ExecuteScalarAsync());

                // D2. Copy backordered items to child with Pending status
                const string copyItemsSql = """
                    INSERT INTO tblProductSalesInventory
                        (lProductSaleKey, lInventorySizeKey, lQuantity, nUnitCost, nTotalCost, sLotNumber, sItemStatus)
                    SELECT
                        @childKey, lInventorySizeKey, lQuantity, nUnitCost, nTotalCost, sLotNumber, 'Pending'
                    FROM tblProductSalesInventory
                    WHERE lProductSaleKey = @parentKey AND sItemStatus = 'Backordered'
                    """;
                await using var copyCmd = new SqlCommand(copyItemsSql, conn, txn);
                copyCmd.CommandTimeout = 30;
                copyCmd.Parameters.AddWithValue("@childKey", childKey.Value);
                copyCmd.Parameters.AddWithValue("@parentKey", key);
                childItemCount = await copyCmd.ExecuteNonQueryAsync();

                // D3. Recalc child totals
                await RecalcTotals(conn, childKey.Value, txn);

                // D4. Delete backordered items from parent
                await using var delCmd = new SqlCommand(
                    "DELETE FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Backordered'", conn, txn);
                delCmd.CommandTimeout = 30;
                delCmd.Parameters.AddWithValue("@key", key);
                await delCmd.ExecuteNonQueryAsync();
            }

            await txn.CommitAsync();

            return Ok(new InvoiceResponse(
                InvoiceNumber: invoiceNumber,
                InvoiceDate: DateTime.Today.ToString("yyyy-MM-dd"),
                ChildOrderKey: childKey,
                ChildOrderItemCount: childItemCount
            ));
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
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
