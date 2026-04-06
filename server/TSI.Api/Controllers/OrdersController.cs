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
    /// POST /api/orders — create a new repair work order
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();

            // Get the "Received" status ID (initial status for new orders)
            await using var statusCmd = new SqlCommand(
                "SELECT TOP 1 lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Received' ORDER BY lRepairStatusSortOrder", conn);
            var statusObj = await statusCmd.ExecuteScalarAsync();
            var statusId = statusObj != null ? Convert.ToInt32(statusObj) : 1;

            // Generate next work order number (use TRY_CAST to skip non-numeric WOs like NR/SR prefixed)
            await using var woCmd = new SqlCommand(
                "SELECT ISNULL(MAX(TRY_CAST(sWorkOrderNumber AS BIGINT)), 0) + 1 FROM tblRepair WHERE TRY_CAST(sWorkOrderNumber AS BIGINT) IS NOT NULL", conn);
            var nextWo = Convert.ToInt64(await woCmd.ExecuteScalarAsync());
            var woNumber = nextWo.ToString().PadLeft(7, '0');

            // Insert the repair record
            const string insertSql = """
                INSERT INTO tblRepair (lDepartmentKey, lRepairStatusID, sWorkOrderNumber, dtDateIn)
                OUTPUT INSERTED.lRepairKey
                VALUES (@deptKey, @statusId, @woNumber, GETDATE())
                """;

            await using var insertCmd = new SqlCommand(insertSql, conn);
            insertCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            insertCmd.Parameters.AddWithValue("@statusId", statusId);
            insertCmd.Parameters.AddWithValue("@woNumber", woNumber);

            var newKey = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            return Ok(new CreateOrderResponse(newKey, woNumber));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }
}
