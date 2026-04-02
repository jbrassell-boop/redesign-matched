using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetDepartments(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        [FromQuery] int? clientKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(d.sDepartmentName LIKE @search OR c.sClientName1 LIKE @search)");
        if (clientKey.HasValue)
            where.Add("d.lClientKey = @clientKey");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT d.lDepartmentKey, d.sDepartmentName,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   d.lClientKey,
                   ISNULL(d.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE r.lDepartmentKey = d.lDepartmentKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs,
                   (SELECT COUNT(*) FROM tblScope s WHERE s.lDepartmentKey = d.lDepartmentKey) AS ScopeCount
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY c.sClientName1, d.sDepartmentName
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (clientKey.HasValue) countCmd.Parameters.AddWithValue("@clientKey", clientKey.Value);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (clientKey.HasValue) dataCmd.Parameters.AddWithValue("@clientKey", clientKey.Value);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var depts = new List<DepartmentListItem>();
        while (await reader.ReadAsync())
        {
            depts.Add(new DepartmentListItem(
                DeptKey: Convert.ToInt32(reader["lDepartmentKey"]),
                Name: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                IsActive: Convert.ToBoolean(reader["bActive"]),
                OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
                ScopeCount: Convert.ToInt32(reader["ScopeCount"])
            ));
        }

        return Ok(new DepartmentListResponse(depts, totalCount));
    }

    [HttpGet("{deptKey:int}")]
    public async Task<IActionResult> GetDepartment(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Schema-verified column names from tblDepartment:
        //   Address  -> sShipAddr1, sShipCity, sShipState, sShipZip
        //   Contact  -> sContactFirst, sContactLast, sContactPhoneVoice, sContactEMail
        const string sql = """
            SELECT d.lDepartmentKey, d.sDepartmentName, d.lClientKey,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.bActive, 0) AS bActive,
                   d.sShipAddr1, d.sShipCity, d.sShipState, d.sShipZip,
                   d.sContactPhoneVoice,
                   LTRIM(RTRIM(ISNULL(d.sContactFirst,'') + ' ' + ISNULL(d.sContactLast,''))) AS ContactName,
                   d.sContactEMail,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE r.lDepartmentKey = d.lDepartmentKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs,
                   (SELECT COUNT(*) FROM tblScope s WHERE s.lDepartmentKey = d.lDepartmentKey) AS ScopeCount
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE d.lDepartmentKey = @deptKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Department not found." });

        return Ok(new DepartmentDetail(
            DeptKey: Convert.ToInt32(reader["lDepartmentKey"]),
            Name: reader["sDepartmentName"]?.ToString() ?? "",
            ClientName: reader["sClientName1"]?.ToString() ?? "",
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
            ScopeCount: Convert.ToInt32(reader["ScopeCount"]),
            Address1: reader["sShipAddr1"]?.ToString(),
            City: reader["sShipCity"]?.ToString(),
            State: reader["sShipState"]?.ToString(),
            Zip: reader["sShipZip"]?.ToString(),
            Phone: reader["sContactPhoneVoice"]?.ToString(),
            ContactName: reader["ContactName"]?.ToString(),
            Email: reader["sContactEMail"]?.ToString()
        ));
    }
}
