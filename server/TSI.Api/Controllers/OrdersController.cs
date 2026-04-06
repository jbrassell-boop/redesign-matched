using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    /// <summary>
    /// GET /api/orders/wizard/clients — all active clients for the wizard picker
    /// </summary>
    [HttpGet("wizard/clients")]
    public async Task<IActionResult> GetWizardClients([FromQuery] string? search = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "WHERE c.bActive = 1";
        if (!string.IsNullOrWhiteSpace(search))
            where += " AND (c.sClientName1 LIKE @search OR c.sMailCity LIKE @search OR c.sMailState LIKE @search OR c.sMailZip LIKE @search OR CAST(c.lClientKey AS VARCHAR) LIKE @search)";

        var sql = $"""
            SELECT c.lClientKey, ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(c.sMailCity, '') AS sMailCity,
                   ISNULL(c.sMailState, '') AS sMailState,
                   ISNULL(c.sMailZip, '') AS sMailZip,
                   ISNULL(c.bActive, 0) AS bActive
            FROM tblClient c
            {where}
            ORDER BY c.sClientName1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        var clients = new List<WizardClient>();
        while (await reader.ReadAsync())
        {
            clients.Add(new WizardClient(
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sClientName1"]?.ToString() ?? "",
                City: reader["sMailCity"]?.ToString() ?? "",
                State: reader["sMailState"]?.ToString() ?? "",
                Zip: reader["sMailZip"]?.ToString() ?? "",
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(clients);
    }

    /// <summary>
    /// GET /api/orders/wizard/departments?clientKey=123 — departments for a specific client
    /// </summary>
    [HttpGet("wizard/departments")]
    public async Task<IActionResult> GetWizardDepartments([FromQuery] int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT d.lDepartmentKey, d.lClientKey,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName
            FROM tblDepartment d
            WHERE d.lClientKey = @clientKey AND ISNULL(d.bActive, 1) = 1
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@clientKey", clientKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var departments = new List<WizardDepartment>();
        while (await reader.ReadAsync())
        {
            departments.Add(new WizardDepartment(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sDepartmentName"]?.ToString() ?? ""
            ));
        }

        return Ok(departments);
    }

    /// <summary>
    /// GET /api/orders/wizard/scopes?deptKey=X — scopes for a department
    /// </summary>
    [HttpGet("wizard/scopes")]
    public async Task<IActionResult> GetWizardScopes([FromQuery] int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT s.lScopeKey, ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible
            FROM tblScope s
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            WHERE s.lDepartmentKey = @deptKey AND ISNULL(s.sScopeIsDead, 'N') <> 'Y'
            ORDER BY s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var scopes = new List<WizardScope>();
        while (await reader.ReadAsync())
        {
            scopes.Add(new WizardScope(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                Model: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
                Type: reader["sRigidOrFlexible"]?.ToString() ?? ""
            ));
        }

        return Ok(scopes);
    }

    /// <summary>
    /// GET /api/orders/wizard/instrument-types — distinct instrument types
    /// </summary>
    [HttpGet("wizard/instrument-types")]
    public async Task<IActionResult> GetInstrumentTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT DISTINCT sRigidOrFlexible AS type
            FROM tblScopeType
            WHERE (bActive = 1 OR bActive IS NULL) AND sRigidOrFlexible IS NOT NULL
            ORDER BY sRigidOrFlexible
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var labelMap = new Dictionary<string, string>
            { { "F", "Flexible" }, { "R", "Rigid" }, { "C", "Camera" }, { "I", "Instrument" } };

        var types = new List<WizardInstrumentType>();
        while (await reader.ReadAsync())
        {
            var code = reader["type"]?.ToString() ?? "";
            if (labelMap.TryGetValue(code, out var label))
                types.Add(new WizardInstrumentType(code, label));
        }

        return Ok(types);
    }

    /// <summary>
    /// GET /api/orders/wizard/scope-types?instrumentType=F — scope types by instrument type
    /// </summary>
    [HttpGet("wizard/scope-types")]
    public async Task<IActionResult> GetWizardScopeTypes([FromQuery] string instrumentType)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT st.lScopeTypeKey, ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer
            FROM tblScopeType st
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            WHERE (st.bActive = 1 OR st.bActive IS NULL) AND st.sRigidOrFlexible = @type
            ORDER BY st.sScopeTypeDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@type", instrumentType);

        await using var reader = await cmd.ExecuteReaderAsync();
        var types = new List<WizardScopeType>();
        while (await reader.ReadAsync())
        {
            types.Add(new WizardScopeType(
                ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
                Description: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? ""
            ));
        }

        return Ok(types);
    }

    /// <summary>
    /// POST /api/orders — create a new repair work order
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();

            // 1. Look up department defaults
            const string deptSql = """
                SELECT d.lServiceLocationKey, d.lSalesRepKey, d.lPricingCategoryKey,
                       ISNULL(c.lPaymentTermsKey, 0) AS lPaymentTermsKey,
                       c.lSalesRepKey AS lClientSalesRepKey,
                       c.lPricingCategoryKey AS lClientPricingCategoryKey
                FROM tblDepartment d
                LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                WHERE d.lDepartmentKey = @deptKey
                """;
            await using var deptCmd = new SqlCommand(deptSql, conn);
            deptCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            await using var deptReader = await deptCmd.ExecuteReaderAsync();

            int svcKey = 1, salesRepKey = 0, pricingKey = 0, payTermsKey = 0;
            if (await deptReader.ReadAsync())
            {
                svcKey = deptReader["lServiceLocationKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lServiceLocationKey"]) : 1;
                salesRepKey = deptReader["lSalesRepKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lSalesRepKey"])
                    : (deptReader["lClientSalesRepKey"] != DBNull.Value
                        ? Convert.ToInt32(deptReader["lClientSalesRepKey"]) : 0);
                pricingKey = deptReader["lPricingCategoryKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lPricingCategoryKey"])
                    : (deptReader["lClientPricingCategoryKey"] != DBNull.Value
                        ? Convert.ToInt32(deptReader["lClientPricingCategoryKey"]) : 0);
                payTermsKey = deptReader["lPaymentTermsKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lPaymentTermsKey"]) : 0;
            }
            await deptReader.CloseAsync();

            // 2. If no existing scope, create one
            int scopeKey = request.ScopeKey ?? 0;
            if (scopeKey == 0 && !string.IsNullOrWhiteSpace(request.SerialNumber))
            {
                const string scopeSql = """
                    DISABLE TRIGGER ALL ON tblScope;
                    INSERT INTO tblScope (lDepartmentKey, lScopeTypeKey, sSerialNumber, dtCreateDate)
                    VALUES (@deptKey, @scopeTypeKey, @sn, GETDATE());
                    DECLARE @sk INT = SCOPE_IDENTITY();
                    ENABLE TRIGGER ALL ON tblScope;
                    SELECT @sk;
                    """;
                await using var scopeCmd = new SqlCommand(scopeSql, conn);
                scopeCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
                scopeCmd.Parameters.AddWithValue("@scopeTypeKey", (object?)request.ScopeTypeKey ?? DBNull.Value);
                scopeCmd.Parameters.AddWithValue("@sn", request.SerialNumber);
                scopeKey = Convert.ToInt32(await scopeCmd.ExecuteScalarAsync());
            }

            // 3. Get "Received" status ID
            await using var statusCmd = new SqlCommand(
                "SELECT TOP 1 lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Received' ORDER BY lRepairStatusSortOrder", conn);
            var statusObj = await statusCmd.ExecuteScalarAsync();
            var statusId = statusObj != null ? Convert.ToInt32(statusObj) : 1;

            // 4. Generate WO number: {N|S}{R|I|K} + YYMMDDHHMM
            var locPrefix = svcKey == 2 ? "S" : "N";
            var typeCode = request.OrderType switch
            {
                "product-sale" => "I",
                "endocart" => "K",
                _ => "R" // repair, instrument
            };
            var now = DateTime.Now;
            var woNumber = $"{locPrefix}{typeCode}{now:yyMMddHHmm}";

            // 5. Insert the repair record
            const string insertSql = """
                DISABLE TRIGGER ALL ON tblRepair;
                INSERT INTO tblRepair (
                    lDepartmentKey, lScopeKey, lRepairStatusID, sWorkOrderNumber,
                    dtDateIn, lServiceLocationKey, sComplaintDesc, sPurchaseOrder,
                    sRackPosition, lPackageTypeKey,
                    sIncludesCaseYN, sIncludesETOCapYN, sIncludesWaterProofCapYN,
                    lSalesRepKey, lPricingCategoryKey, lPaymentTermsKey
                ) VALUES (
                    @deptKey, @scopeKey, @statusId, @woNumber,
                    GETDATE(), @svcKey, @complaint, @po,
                    @rack, @pkgTypeKey,
                    @inclCase, @inclETOCap, @inclWPCap,
                    @salesRepKey, @pricingKey, @payTermsKey
                );
                DECLARE @newKey INT = SCOPE_IDENTITY();
                ENABLE TRIGGER ALL ON tblRepair;
                SELECT @newKey;
                """;

            await using var insertCmd = new SqlCommand(insertSql, conn);
            insertCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            insertCmd.Parameters.AddWithValue("@scopeKey", scopeKey > 0 ? scopeKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@statusId", statusId);
            insertCmd.Parameters.AddWithValue("@woNumber", woNumber);
            insertCmd.Parameters.AddWithValue("@svcKey", svcKey);
            insertCmd.Parameters.AddWithValue("@complaint", (object?)request.Complaint ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@po", (object?)request.PurchaseOrder ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@rack", (object?)request.RackPosition ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@pkgTypeKey", (object?)request.PackageTypeKey ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclCase", (object?)request.IncludesCaseYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclETOCap", (object?)request.IncludesETOCapYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclWPCap", (object?)request.IncludesWaterProofCapYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@salesRepKey", salesRepKey > 0 ? salesRepKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@pricingKey", pricingKey > 0 ? pricingKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@payTermsKey", payTermsKey > 0 ? payTermsKey : DBNull.Value);

            var newKey = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            return Ok(new CreateOrderResponse(newKey, woNumber));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }
}
