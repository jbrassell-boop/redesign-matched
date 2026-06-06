using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/acquisitions")]
[Authorize]
public class AcquisitionsController(IConfiguration config, IPONumberService poNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? tab = "inhouse")
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // In-House: scopes linked to acquisition PO trans that are NOT sold/consigned
        // Consigned: scopes that are consigned
        // Both come from tblScope -> tblAcquisitionSupplierPOTran -> tblAcquisitionSupplierPO
        var where = new List<string> { "s.lAcquisitionSupplierPOTranKey IS NOT NULL" };

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search OR po.sSupplierPONumber LIKE @search)");

        // Tab filter: use sScopeIsDead as a proxy for sold status
        if (tab == "sold")
            where.Clear(); // sold uses different query below

        var whereClause = "WHERE " + string.Join(" AND ", where);

        if (tab == "sold")
            return await GetSoldList(conn, search, page, pageSize);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblAcquisitionSupplierPO po ON po.lAcquisitionSupplierPOKey = pt.lAcquisitionSupplierPOKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT s.lScopeKey,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(po.sSupplierPONumber, '') AS sPONumber,
                   po.dtDateOfPO,
                   pt.dtDateReceived,
                   ISNULL(pt.nScopeCost, 0) AS nScopeCost
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblAcquisitionSupplierPO po ON po.lAcquisitionSupplierPOKey = pt.lAcquisitionSupplierPOKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY pt.dtDateReceived DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<AcquisitionListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new AcquisitionListItem(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Supplier: "",
                PONumber: reader["sPONumber"]?.ToString() ?? "",
                Dept: reader["sDepartmentName"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                DateAcquired: reader["dtDateReceived"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateReceived"]).ToString("MM/dd/yyyy"),
                PODate: reader["dtDateOfPO"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateOfPO"]).ToString("MM/dd/yyyy"),
                Condition: "",
                Cost: reader["nScopeCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nScopeCost"])
            ));
        }

        return Ok(new AcquisitionListResponse(items, totalCount));
    }

    private async Task<IActionResult> GetSoldList(SqlConnection conn, string? search, int page, int pageSize)
    {
        // Sold scopes: scopes marked as dead (sScopeIsDead = 'Y') that had an acquisition PO
        var where = new List<string> { "s.sScopeIsDead = 'Y'", "s.lAcquisitionSupplierPOTranKey IS NOT NULL" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search)");

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT s.lScopeKey,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   s.dtLastUpdate,
                   ISNULL(pt.nScopeCost, 0) AS nScopeCost
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY s.dtLastUpdate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<AcquisitionSoldItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new AcquisitionSoldItem(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                SaleDate: reader["dtLastUpdate"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtLastUpdate"]).ToString("MM/dd/yyyy"),
                SalePrice: reader["nScopeCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nScopeCost"]),
                Buyer: ""
            ));
        }

        return Ok(new AcquisitionSoldResponse(items, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Every SUM(...) is wrapped in ISNULL(..., 0): SUM over an empty result set
        // (no acquisition scopes) returns NULL, and the C# reads below call
        // Convert.ToInt32/ToDecimal which throw "Object cannot be cast from DBNull
        // to other types" on a NULL. ISNULL keeps the aggregates returning 0 so the
        // endpoint reports empty rather than 500ing.
        var sql = """
            SELECT
                COUNT(*) AS Total,
                ISNULL(SUM(CASE WHEN s.sScopeIsDead IS NULL OR s.sScopeIsDead <> 'Y' THEN 1 ELSE 0 END), 0) AS InHouse,
                ISNULL(SUM(CASE WHEN s.sScopeIsDead = 'Y' THEN 1 ELSE 0 END), 0) AS Sold,
                ISNULL(SUM(CASE WHEN s.sScopeIsDead IS NULL OR s.sScopeIsDead <> 'Y' THEN ISNULL(pt.nScopeCost, 0) ELSE 0 END), 0) AS InHouseValue,
                ISNULL(SUM(CASE WHEN s.sScopeIsDead = 'Y' THEN ISNULL(pt.nScopeCost, 0) ELSE 0 END), 0) AS SoldRevenue
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var inHouse = Convert.ToInt32(reader["InHouse"]);
        var sold = Convert.ToInt32(reader["Sold"]);

        return Ok(new AcquisitionStats(
            InHouse: inHouse,
            Consigned: 0,
            Sold: sold,
            InHouseValue: reader["InHouseValue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["InHouseValue"]),
            SoldRevenue: reader["SoldRevenue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["SoldRevenue"])
        ));
    }

    /// <summary>GET /api/acquisitions/{scopeKey} — full acquisition detail</summary>
    [HttpGet("{scopeKey:int}")]
    public async Task<IActionResult> GetDetail(int scopeKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                s.lScopeKey,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(m.sManufacturer, '') AS sManufacturer,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(po.sSupplierPONumber, '') AS sPONumber,
                po.dtDateOfPO,
                pt.dtDateReceived,
                ISNULL(pt.nScopeCost, 0) AS nScopeCost,
                ISNULL(CAST(pt.mComment AS nvarchar(max)), '') AS mComment,
                ISNULL(s.sRigidOrFlexible, '') AS sRigidOrFlexible,
                ISNULL(s.sScopeIsDead, 'N') AS sScopeIsDead,
                ISNULL(sup.sSupplierName1, '') AS sSupplierName1
            FROM tblScope s
            LEFT JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblAcquisitionSupplierPO po ON po.lAcquisitionSupplierPOKey = pt.lAcquisitionSupplierPOKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblSupplier sup ON sup.lSupplierKey = po.lSupplierKey
            WHERE s.lScopeKey = @scopeKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return NotFound();

        return Ok(new AcquisitionDetail(
            ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
            Serial: reader["sSerialNumber"]?.ToString() ?? "",
            ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
            Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
            Client: reader["sClientName1"]?.ToString() ?? "",
            Dept: reader["sDepartmentName"]?.ToString() ?? "",
            Supplier: reader["sSupplierName1"]?.ToString() ?? "",
            PONumber: reader["sPONumber"]?.ToString() ?? "",
            PODate: reader["dtDateOfPO"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateOfPO"]).ToString("MM/dd/yyyy"),
            DateReceived: reader["dtDateReceived"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateReceived"]).ToString("MM/dd/yyyy"),
            Cost: reader["nScopeCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nScopeCost"]),
            Comment: reader["mComment"]?.ToString() ?? "",
            FlexOrRigid: reader["sRigidOrFlexible"]?.ToString() ?? "",
            IsSold: reader["sScopeIsDead"]?.ToString() == "Y"
        ));
    }

    /// <summary>
    /// POST /api/acquisitions/purchase-orders — create an Acquisition supplier
    /// PO as a draft (header + lines, single transaction). PO number is
    /// generated by IPONumberService (POType.Acquisition); the counter
    /// consumption enrolls in the same transaction so a rollback of the INSERT
    /// rolls back the counter too — mirrors the cloud-stack AcquisitionsController.
    ///
    /// Draft-only: bGenerated and bCancelled are forced to 0. The create-time
    /// GP guardrail is bGenerated = 0 — GP only consumes generated POs, never
    /// drafts. bHoldGPIntegration is written EXPLICITLY as 0 so the row's
    /// initial state never depends on ambient column defaults.
    /// </summary>
    [HttpPost("purchase-orders")]
    public async Task<IActionResult> CreateAcquisitionPurchaseOrder(
        [FromBody] CreateAcquisitionPurchaseOrderRequest body)
    {
        // Validate up front so a 400 never leaves an orphan header or a consumed
        // PO-number counter behind.
        if (body is null)
            return BadRequest(new { message = "Request body is required." });
        if (body.ServiceLocationKey <= 0)
            return BadRequest(new { message = "ServiceLocationKey is required." });
        if (body.SupplierKey <= 0)
            return BadRequest(new { message = "SupplierKey is required." });
        if (body.Lines is null || body.Lines.Count == 0)
            return BadRequest(new { message = "At least one line is required." });
        for (var i = 0; i < body.Lines.Count; i++)
        {
            var line = body.Lines[i];
            if (line.ScopeTypeKey <= 0)
                return BadRequest(new { message = $"Lines[{i}].ScopeTypeKey is required." });
            if (line.ScopeCost < 0)
                return BadRequest(new { message = $"Lines[{i}].ScopeCost cannot be negative." });
        }

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Referential-integrity pre-checks. tblAcquisitionSupplierPO and its Tran
        // child carry no FK constraints in WinscopeWeb, so the API is the only
        // place these IDs get validated. Run all checks BEFORE BeginTransactionAsync
        // — a bad ID must never consume a PO number (NextAsync runs inside the txn).
        await using (var locCheck = new SqlCommand(
            "SELECT sTransNumberPrefix FROM dbo.tblServiceLocations WHERE lServiceLocationKey = @loc", conn))
        {
            locCheck.Parameters.AddWithValue("@loc", body.ServiceLocationKey);
            var raw = await locCheck.ExecuteScalarAsync();
            if (raw is null || raw == DBNull.Value || string.IsNullOrWhiteSpace(raw as string))
            {
                return BadRequest(new { message =
                    $"ServiceLocationKey {body.ServiceLocationKey} not found, " +
                    "or its sTransNumberPrefix is null/blank — cannot generate a PO number." });
            }
        }

        await using (var supplierCheck = new SqlCommand(
            "SELECT 1 FROM dbo.tblSupplier WHERE lSupplierKey = @id AND Deleted_datetime IS NULL", conn))
        {
            supplierCheck.Parameters.AddWithValue("@id", body.SupplierKey);
            if (await supplierCheck.ExecuteScalarAsync() is null)
                return BadRequest(new { message = $"Supplier {body.SupplierKey} not found or has been deleted." });
        }

        // Batch-validate every line's ScopeTypeKey in a single round trip.
        // String-interpolated IN(...) is safe: the keys are typed ints off the DTO.
        var requestedScopeTypes = body.Lines.Select(l => l.ScopeTypeKey).Distinct().ToList();
        var scopeTypeInClause = string.Join(",", requestedScopeTypes);
        await using (var scopeTypeCheck = new SqlCommand(
            $"SELECT lScopeTypeKey FROM dbo.tblScopeType " +
            $"WHERE lScopeTypeKey IN ({scopeTypeInClause}) AND Deleted_datetime IS NULL", conn))
        {
            var found = new HashSet<int>();
            await using var reader = await scopeTypeCheck.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                found.Add(Convert.ToInt32(reader["lScopeTypeKey"]));
            var missing = requestedScopeTypes.Where(k => !found.Contains(k)).ToList();
            if (missing.Count > 0)
            {
                return BadRequest(new { message =
                    $"ScopeTypeKey(s) not found: {string.Join(", ", missing)}." });
            }
        }

        // PaymentMethodKey is optional — only validate when supplied. A null
        // payment method is legal (legacy form treats it as "not yet set").
        if (body.PaymentMethodKey is { } pmKey)
        {
            await using var pmCheck = new SqlCommand(
                "SELECT 1 FROM dbo.tblPaymentMethods WHERE lPaymentMethodKey = @pm AND Deleted_datetime IS NULL", conn);
            pmCheck.Parameters.AddWithValue("@pm", pmKey);
            if (await pmCheck.ExecuteScalarAsync() is null)
                return BadRequest(new { message = $"PaymentMethodKey {pmKey} not found." });
        }

        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // ServiceLocationKey here drives the PO# prefix only — the acquisition
            // header has no lServiceLocationKey column, so location is not persisted
            // on the row (unlike Inventory).
            var poNumber = await poNumbers.NextAsync(POType.Acquisition, body.ServiceLocationKey, conn, txn);

            var userKey = this.GetCurrentUserKey();
            var poDate = body.DateOfPO ?? DateTime.Today;

            // Header — bGenerated/bCancelled forced to 0 (draft); bHoldGPIntegration
            // also written explicitly as 0 (don't hold; PO integrates normally once
            // generated). The column has no DB default constraint, so omitting it
            // would write NULL and make future behavior depend on ambient defaults.
            const string headerSql = """
                INSERT INTO dbo.tblAcquisitionSupplierPO
                    (lSupplierKey, sSupplierPONumber,
                     dtDateOfPO, lPaymentMethodKey,
                     bGenerated, bCancelled, bHoldGPIntegration,
                     dblPOTotal,
                     Created_UserKey, Created_datetime)
                VALUES
                    (@supplierKey, @poNumber,
                     @poDate, @paymentMethodKey,
                     0, 0, 0,
                     0,
                     @userKey, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS int);
                """;

            int acquisitionPoKey;
            await using (var headerCmd = new SqlCommand(headerSql, conn, txn))
            {
                headerCmd.Parameters.AddWithValue("@supplierKey", body.SupplierKey);
                headerCmd.Parameters.AddWithValue("@poNumber", poNumber);
                headerCmd.Parameters.AddWithValue("@poDate", poDate.Date);
                headerCmd.Parameters.AddWithValue("@paymentMethodKey",
                    (object?)body.PaymentMethodKey ?? DBNull.Value);
                headerCmd.Parameters.AddWithValue("@userKey", userKey);
                acquisitionPoKey = Convert.ToInt32(await headerCmd.ExecuteScalarAsync());
            }

            // Per-line INSERT. dtDateReceived left null at create (scopes haven't
            // arrived yet); mComment optional.
            const string lineSql = """
                INSERT INTO dbo.tblAcquisitionSupplierPOTran
                    (lAcquisitionSupplierPOKey, lScopeTypeKey,
                     sSerialNumber, nScopeCost,
                     mComment,
                     Created_UserKey, Created_datetime)
                VALUES
                    (@poKey, @scopeTypeKey,
                     @serial, @cost,
                     @comment,
                     @userKey, GETDATE());
                """;

            decimal poTotal = 0m;
            foreach (var line in body.Lines)
            {
                poTotal += line.ScopeCost;

                await using var lineCmd = new SqlCommand(lineSql, conn, txn);
                lineCmd.Parameters.AddWithValue("@poKey", acquisitionPoKey);
                lineCmd.Parameters.AddWithValue("@scopeTypeKey", line.ScopeTypeKey);
                lineCmd.Parameters.AddWithValue("@serial", (object?)line.SerialNumber ?? DBNull.Value);
                lineCmd.Parameters.AddWithValue("@cost", line.ScopeCost);
                lineCmd.Parameters.AddWithValue("@comment", DBNull.Value);
                lineCmd.Parameters.AddWithValue("@userKey", userKey);
                await lineCmd.ExecuteNonQueryAsync();
            }

            // Write the accumulated total back to the header in the same transaction.
            await using (var totalCmd = new SqlCommand(
                "UPDATE dbo.tblAcquisitionSupplierPO SET dblPOTotal = @total " +
                "WHERE lAcquisitionSupplierPOKey = @poKey", conn, txn))
            {
                totalCmd.Parameters.AddWithValue("@total", poTotal);
                totalCmd.Parameters.AddWithValue("@poKey", acquisitionPoKey);
                await totalCmd.ExecuteNonQueryAsync();
            }

            await txn.CommitAsync();

            return StatusCode(StatusCodes.Status201Created,
                new CreateAcquisitionPurchaseOrderResponse(
                    AcquisitionSupplierPOKey: acquisitionPoKey,
                    SupplierPONumber: poNumber,
                    POTotal: poTotal));
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
    }
}
