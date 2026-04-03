using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/endocarts")]
[Authorize]
public class EndoCartsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet("scope-inventory")]
    public async Task<IActionResult> GetScopeInventory(
        [FromQuery] string? search = null,
        [FromQuery] string? rigidOrFlexible = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search)");
        if (!string.IsNullOrWhiteSpace(rigidOrFlexible))
            where.Add("s.sRigidOrFlexible = @rigidOrFlexible");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScope s
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT s.lScopeKey, ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(s.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(s.sScopeIsDead, 'N') AS sScopeIsDead,
                   s.dtLastUpdate
            FROM tblScope s
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY s.sSerialNumber
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(rigidOrFlexible)) countCmd.Parameters.AddWithValue("@rigidOrFlexible", rigidOrFlexible);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(rigidOrFlexible)) dataCmd.Parameters.AddWithValue("@rigidOrFlexible", rigidOrFlexible);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        var items = new List<EndoCartScopeItem>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var lastUpdate = reader["dtLastUpdate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtLastUpdate"]).ToString("MM/dd/yyyy");
            items.Add(new EndoCartScopeItem(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                RigidOrFlexible: reader["sRigidOrFlexible"]?.ToString() ?? "",
                IsDead: (reader["sScopeIsDead"]?.ToString() ?? "N") == "Y",
                LastUpdate: lastUpdate
            ));
        }

        return Ok(new EndoCartScopeInventoryResponse(items, totalCount));
    }

    [HttpGet("service-history")]
    public async Task<IActionResult> GetServiceHistory(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search)");
        if (!string.IsNullOrWhiteSpace(status))
            where.Add("rs.sRepairStatus = @status");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   r.dtDateIn, r.dtDateOut,
                   ISNULL(r.sComplaintDesc, '') AS sComplaintDesc,
                   ISNULL(r.dblAmtRepair, 0) AS dblAmtRepair
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            {whereClause}
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(status)) countCmd.Parameters.AddWithValue("@status", status);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(status)) dataCmd.Parameters.AddWithValue("@status", status);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        var items = new List<EndoCartServiceHistoryItem>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateIn"]).ToString("MM/dd/yyyy");
            var dateOut = reader["dtDateOut"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateOut"]).ToString("MM/dd/yyyy");
            items.Add(new EndoCartServiceHistoryItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                RepairStatus: reader["sRepairStatus"]?.ToString() ?? "",
                DateIn: dateIn,
                DateOut: dateOut,
                Complaint: reader["sComplaintDesc"]?.ToString(),
                TotalCost: Convert.ToDouble(reader["dblAmtRepair"])
            ));
        }

        return Ok(new EndoCartServiceHistoryResponse(items, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS TotalScopes,
                SUM(CASE WHEN ISNULL(s.sScopeIsDead, 'N') = 'N' THEN 1 ELSE 0 END) AS ActiveScopes,
                SUM(CASE WHEN s.sScopeIsDead = 'Y' THEN 1 ELSE 0 END) AS InactiveScopes
            FROM tblScope s
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var totalScopes = Convert.ToInt32(reader["TotalScopes"]);
        var activeScopes = Convert.ToInt32(reader["ActiveScopes"]);
        var inactiveScopes = Convert.ToInt32(reader["InactiveScopes"]);
        await reader.CloseAsync();

        const string repairSql = """
            SELECT
                COUNT(*) AS TotalRepairs,
                SUM(CASE WHEN r.dtDateIn >= DATEADD(DAY, -90, GETDATE()) THEN 1 ELSE 0 END) AS RecentRepairs
            FROM tblRepair r
            """;

        await using var repairCmd = new SqlCommand(repairSql, conn);
        await using var repairReader = await repairCmd.ExecuteReaderAsync();
        await repairReader.ReadAsync();

        var totalRepairs = Convert.ToInt32(repairReader["TotalRepairs"]);
        var recentRepairs = Convert.ToInt32(repairReader["RecentRepairs"]);

        return Ok(new EndoCartStats(
            TotalScopes: totalScopes,
            ActiveScopes: activeScopes,
            InactiveScopes: inactiveScopes,
            TotalRepairs: totalRepairs,
            RecentRepairs: recentRepairs
        ));
    }

    // ── Cart-Specific Stubs ──────────────────────────────────────────────────
    // TODO: Replace with real queries when endocart DB tables are migrated.
    // No tblEndoCartQuote, tblEndoCartCatalog, or tblEndoCartModel tables exist yet.

    /// <summary>GET /api/endocarts/quotes — returns empty until tblEndoCartQuote is migrated</summary>
    [HttpGet("quotes")]
    public IActionResult GetQuotes() => Ok(Array.Empty<object>());

    /// <summary>POST /api/endocarts/quotes — stub; returns 501 until table is migrated</summary>
    [HttpPost("quotes")]
    public IActionResult CreateQuote() =>
        StatusCode(501, new { message = "EndoCart quote tables not yet migrated to Azure SQL." });

    /// <summary>GET /api/endocarts/catalog — returns empty until tblEndoCartCatalog is migrated</summary>
    [HttpGet("catalog")]
    public IActionResult GetCatalog() => Ok(Array.Empty<object>());

    /// <summary>GET /api/endocarts/models — returns empty until tblEndoCartModel is migrated</summary>
    [HttpGet("models")]
    public IActionResult GetModels() => Ok(Array.Empty<object>());
}
