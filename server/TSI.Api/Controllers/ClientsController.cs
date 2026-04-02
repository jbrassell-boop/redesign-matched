using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetClients(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(c.sClientName1 LIKE @search OR c.sMailCity LIKE @search OR c.sMailState LIKE @search)");
        if (statusFilter == "active")
            where.Add("c.bActive = 1");
        else if (statusFilter == "inactive")
            where.Add("c.bActive = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblClient c {whereClause}";

        var dataSql = $"""
            SELECT c.lClientKey, c.sClientName1, c.sMailCity, c.sMailState,
                   ISNULL(c.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblDepartment d WHERE d.lClientKey = c.lClientKey) AS DeptCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblDepartment d2 ON d2.lDepartmentKey = r.lDepartmentKey
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE d2.lClientKey = c.lClientKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs
            FROM tblClient c
            {whereClause}
            ORDER BY c.sClientName1
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
        var clients = new List<ClientListItem>();
        while (await reader.ReadAsync())
        {
            clients.Add(new ClientListItem(
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sClientName1"]?.ToString() ?? "",
                City: reader["sMailCity"]?.ToString() ?? "",
                State: reader["sMailState"]?.ToString() ?? "",
                IsActive: Convert.ToBoolean(reader["bActive"]),
                DeptCount: Convert.ToInt32(reader["DeptCount"]),
                OpenRepairs: Convert.ToInt32(reader["OpenRepairs"])
            ));
        }

        return Ok(new ClientListResponse(clients, totalCount));
    }

    [HttpGet("{clientKey:int}")]
    public async Task<IActionResult> GetClient(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT c.lClientKey, c.sClientName1,
                   c.sMailAddr1, c.sMailAddr2,
                   c.sMailCity, c.sMailState, c.sMailZip,
                   c.sPhoneVoice, c.sPhoneFAX,
                   ISNULL(c.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblDepartment d WHERE d.lClientKey = c.lClientKey) AS DeptCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblDepartment d2 ON d2.lDepartmentKey = r.lDepartmentKey
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE d2.lClientKey = c.lClientKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs
            FROM tblClient c
            WHERE c.lClientKey = @clientKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Client not found." });

        return Ok(new ClientDetail(
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            Name: reader["sClientName1"]?.ToString() ?? "",
            Address1: reader["sMailAddr1"]?.ToString() ?? "",
            Address2: reader["sMailAddr2"]?.ToString(),
            City: reader["sMailCity"]?.ToString() ?? "",
            State: reader["sMailState"]?.ToString() ?? "",
            Zip: reader["sMailZip"]?.ToString() ?? "",
            Phone: reader["sPhoneVoice"]?.ToString(),
            Fax: reader["sPhoneFAX"]?.ToString(),
            Email: null,
            ContactName: null,
            IsActive: Convert.ToBoolean(reader["bActive"]),
            DeptCount: Convert.ToInt32(reader["DeptCount"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"])
        ));
    }
}
