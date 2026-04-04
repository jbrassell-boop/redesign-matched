using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/quality")]
[Authorize]
public class QualityController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // Shared result computation SQL fragment:
    // Pass: bHotColdLeakTestPass=1 AND bAutoclaveTestPass=1
    // Fail: bHotColdLeakTestPass=0 OR bAutoclaveTestPass=0
    // Conditional: either is NULL
    private const string ResultCase = """
        CASE
          WHEN ri.bHotColdLeakTestPass = 1 AND ri.bAutoclaveTestPass = 1 THEN 'Pass'
          WHEN ri.bHotColdLeakTestPass = 0 OR ri.bAutoclaveTestPass = 0 THEN 'Fail'
          ELSE 'Conditional'
        END
        """;

    [HttpGet("inspections")]
    public async Task<IActionResult> GetInspections(
        [FromQuery] string? search = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] string? resultFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR c.sClientName1 LIKE @search OR s.sSerialNumber LIKE @search)");

        if (!string.IsNullOrWhiteSpace(dateFrom))
            where.Add("r.dtDateIn >= @dateFrom");

        if (!string.IsNullOrWhiteSpace(dateTo))
            where.Add("r.dtDateIn < DATEADD(day, 1, @dateTo)");

        if (!string.IsNullOrWhiteSpace(resultFilter) && resultFilter != "all")
            where.Add($"({ResultCase}) = @resultFilter");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepairInspection ri
            JOIN tblRepair r ON r.lRepairKey = ri.lRepairKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT
                ri.lRepairInspectionKey,
                ri.lRepairKey,
                r.sWorkOrderNumber,
                ri.lRepairInspectionType,
                {ResultCase} AS Result,
                ri.lTechnicianKey,
                r.dtDateIn,
                ISNULL(c.sClientName1, '') AS sClientName1,
                s.sSerialNumber
            FROM tblRepairInspection ri
            JOIN tblRepair r ON r.lRepairKey = ri.lRepairKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        AddCommonParams(countCmd, search, dateFrom, dateTo, resultFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        AddCommonParams(dataCmd, search, dateFrom, dateTo, resultFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<QualityInspectionListItem>();
        while (await reader.ReadAsync())
        {
            var inspDate = reader["dtDateIn"] == DBNull.Value
                ? ""
                : Convert.ToDateTime(reader["dtDateIn"]).ToString("MM/dd/yyyy");

            var typeId = reader["lRepairInspectionType"] == DBNull.Value
                ? 0
                : Convert.ToInt32(reader["lRepairInspectionType"]);
            var typeName = typeId == 1 ? "D&I Intake" : typeId == 2 ? "Post-Repair" : "Unknown";

            items.Add(new QualityInspectionListItem(
                InspectionKey: Convert.ToInt32(reader["lRepairInspectionKey"]),
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                InspectionType: typeName,
                Result: reader["Result"]?.ToString() ?? "Conditional",
                TechnicianKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
                InspectionDate: inspDate,
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                ScopeSN: reader["sSerialNumber"] == DBNull.Value ? null : reader["sSerialNumber"]?.ToString()
            ));
        }

        return Ok(new QualityInspectionListResponse(items, totalCount));
    }

    [HttpGet("inspections/{inspectionKey:int}")]
    public async Task<IActionResult> GetInspection(int inspectionKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = $"""
            SELECT
                ri.lRepairInspectionKey,
                ri.lRepairKey,
                r.sWorkOrderNumber,
                ri.lRepairInspectionType,
                {ResultCase} AS Result,
                ri.lTechnicianKey,
                ISNULL(t.sTechName, '') AS sTechName,
                r.dtDateIn,
                ISNULL(c.sClientName1, '') AS sClientName1,
                s.sSerialNumber,
                ri.bHotColdLeakTestPass,
                ri.bAutoclaveTestPass
            FROM tblRepairInspection ri
            JOIN tblRepair r ON r.lRepairKey = ri.lRepairKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ri.lTechnicianKey
            WHERE ri.lRepairInspectionKey = @inspectionKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@inspectionKey", inspectionKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Inspection not found." });

        var inspDate = reader["dtDateIn"] == DBNull.Value
            ? ""
            : Convert.ToDateTime(reader["dtDateIn"]).ToString("MM/dd/yyyy");

        var typeId = reader["lRepairInspectionType"] == DBNull.Value
            ? 0
            : Convert.ToInt32(reader["lRepairInspectionType"]);
        var typeName = typeId == 1 ? "D&I Intake" : typeId == 2 ? "Post-Repair" : "Unknown";

        return Ok(new QualityInspectionDetail(
            InspectionKey: Convert.ToInt32(reader["lRepairInspectionKey"]),
            RepairKey: Convert.ToInt32(reader["lRepairKey"]),
            WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
            InspectionType: typeName,
            Result: reader["Result"]?.ToString() ?? "Conditional",
            TechnicianKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
            TechName: reader["sTechName"]?.ToString(),
            InspectionDate: inspDate,
            ClientName: reader["sClientName1"]?.ToString() ?? "",
            ScopeSN: reader["sSerialNumber"] == DBNull.Value ? null : reader["sSerialNumber"]?.ToString(),
            HotColdLeakTestPass: reader["bHotColdLeakTestPass"] == DBNull.Value ? null : Convert.ToBoolean(reader["bHotColdLeakTestPass"]),
            AutoclaveTestPass: reader["bAutoclaveTestPass"] == DBNull.Value ? null : Convert.ToBoolean(reader["bAutoclaveTestPass"])
        ));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = $"""
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN {ResultCase} = 'Pass' THEN 1 ELSE 0 END) AS PassCount,
                SUM(CASE WHEN {ResultCase} = 'Fail' THEN 1 ELSE 0 END) AS FailCount,
                SUM(CASE WHEN {ResultCase} = 'Conditional' THEN 1 ELSE 0 END) AS ConditionalCount
            FROM tblRepairInspection ri
            JOIN tblRepair r ON r.lRepairKey = ri.lRepairKey
            WHERE r.dtDateIn >= DATEADD(day, -30, GETDATE())
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new QualityStats(0, 0, 0, 0, 0));

        var total = Convert.ToInt32(reader["Total"]);
        var pass = Convert.ToInt32(reader["PassCount"]);
        var fail = Convert.ToInt32(reader["FailCount"]);
        var conditional = Convert.ToInt32(reader["ConditionalCount"]);
        var fpy = total > 0 ? Math.Round(pass * 100.0 / total, 1) : 0;

        return Ok(new QualityStats(total, pass, fail, conditional, fpy));
    }

    // ── NCR (Non-Conformances from tblISOComplaint) ────────────────────────────

    [HttpGet("ncr")]
    public async Task<IActionResult> GetNcr(
        [FromQuery] string? search = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Status derived: Closed if dtFnlDispDate set, Under Review if dtEvalDate set, else Open
        const string statusExpr = """
            CASE
              WHEN ic.dtFnlDispDate IS NOT NULL THEN 'Closed'
              WHEN ic.dtEvalDate IS NOT NULL THEN 'Under Review'
              ELSE 'Open'
            END
            """;

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR CAST(ic.lISOComplaintKey AS VARCHAR) LIKE @search OR ISNULL(ic.mComplaint, '') LIKE @search OR ISNULL(ic.sISONonConformance, '') LIKE @search)");
        if (!string.IsNullOrWhiteSpace(status))
            where.Add($"({statusExpr}) = @status");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblISOComplaint ic
            LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT ic.lISOComplaintKey, ic.lRepairKey,
                   ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(CAST(ic.mComplaint AS NVARCHAR(500)), '') AS mComplaint,
                   ISNULL(ic.sISOComplaint, '') AS sISOComplaint,
                   ISNULL(ic.sISONonConformance, '') AS sISONonConformance,
                   ic.dtDateReceived,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   {statusExpr} AS Status
            FROM tblISOComplaint ic
            LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY ic.dtDateReceived DESC
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

        var items = new List<NcrListItem>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var key = Convert.ToInt32(reader["lISOComplaintKey"]);
            var dateFiled = reader["dtDateReceived"] == DBNull.Value
                ? ""
                : Convert.ToDateTime(reader["dtDateReceived"]).ToString("MM/dd/yyyy");

            // Category: sISOComplaint is a 1-char flag; map or fallback to "Quality"
            var category = reader["sISOComplaint"]?.ToString()?.Trim();
            category = string.IsNullOrEmpty(category) ? "Quality" : category;

            items.Add(new NcrListItem(
                IsoComplaintKey: key,
                NcrNumber: $"ISO-{key:D4}",
                RepairKey: reader["lRepairKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                Description: reader["mComplaint"]?.ToString() ?? "",
                Category: category,
                Severity: "Minor",
                Status: reader["Status"]?.ToString() ?? "Open",
                DateFiled: dateFiled,
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? ""
            ));
        }

        return Ok(new NcrListResponse(items, totalCount));
    }

    // ── Rework Tracking (tblRepair where sReworkReqd='Y') ───────────────────────

    [HttpGet("rework")]
    public async Task<IActionResult> GetRework(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Status: if dtDateOut set → Complete, else In Progress (rework already flagged via sReworkReqd='Y')
        const string statusExpr = """
            CASE
              WHEN r.dtDateOut IS NOT NULL THEN 'Complete'
              ELSE 'In Progress'
            END
            """;

        var where = new List<string> { "r.sReworkReqd = 'Y'" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR s.sSerialNumber LIKE @search OR ISNULL(CAST(r.mCommentsRework AS NVARCHAR(500)), '') LIKE @search)");
        if (!string.IsNullOrWhiteSpace(status))
            where.Add($"({statusExpr}) = @status");

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey,
                   ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(CAST(r.mCommentsRework AS NVARCHAR(500)), '') AS mCommentsRework,
                   ISNULL(t.sTechName, '') AS sTechName,
                   r.dtDateIn, r.dtDateOut,
                   {statusExpr} AS Status
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lReworkTech
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

        var items = new List<ReworkListItem>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var key = Convert.ToInt32(reader["lRepairKey"]);
            var dateIn = reader["dtDateIn"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateIn"]).ToString("MM/dd/yyyy");
            var dateOut = reader["dtDateOut"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateOut"]).ToString("MM/dd/yyyy");

            items.Add(new ReworkListItem(
                RepairKey: key,
                ReworkNumber: $"RW-{key:D5}",
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                Reason: reader["mCommentsRework"]?.ToString() ?? "",
                TechName: reader["sTechName"]?.ToString() ?? "",
                OriginalComplete: dateIn,
                ReworkDue: dateOut,
                Status: reader["Status"]?.ToString() ?? "In Progress"
            ));
        }

        return Ok(new ReworkListResponse(items, totalCount));
    }

    private static void AddCommonParams(SqlCommand cmd, string? search, string? dateFrom, string? dateTo, string? resultFilter)
    {
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(dateFrom))
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom);
        if (!string.IsNullOrWhiteSpace(dateTo))
            cmd.Parameters.AddWithValue("@dateTo", dateTo);
        if (!string.IsNullOrWhiteSpace(resultFilter) && resultFilter != "all")
            cmd.Parameters.AddWithValue("@resultFilter", resultFilter);
    }
}
